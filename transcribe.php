<?php
/**
 * DreamSphere Whisper Transcription API
 * Verwendet OpenAI Whisper API für Audio-zu-Text-Transkription
 */

// Fehlerberichterstattung für Entwicklung (in Produktion ausschalten)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS-Header für Frontend-Zugriff
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Preflight-Request für CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Nur POST-Requests erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Nur POST-Requests erlaubt']);
    exit();
}

// Konfiguration
class TranscribeConfig {
    // OpenAI Whisper API-Konfiguration
    const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';
    const WHISPER_MODEL = 'whisper-1';
    const LANGUAGE = 'de'; // Deutsch

    // Datei-Limits
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB (OpenAI Limit)
    const ALLOWED_MIME_TYPES = [
        'audio/webm',
        'audio/mp4',
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/x-m4a'
    ];

    // Rate Limiting
    const MAX_REQUESTS_PER_HOUR = 50;
    const RATE_LIMIT_FILE = 'transcribe_rate_limit.json';

    /**
     * OpenAI API-Key aus Umgebungsvariable oder Konfigurationsdatei laden
     */
    public static function getOpenAIKey() {
        // Zuerst Umgebungsvariable prüfen
        $key = getenv('OPENAI_API_KEY');

        if (!$key) {
            // Fallback: Konfigurationsdatei (NICHT in Versionskontrolle!)
            $configFile = __DIR__ . '/config.php';
            if (file_exists($configFile)) {
                $config = include $configFile;
                $key = $config['openai_api_key'] ?? null;
            }
        }

        return $key;
    }
}

/**
 * Hauptklasse für Transkriptions-API
 */
class WhisperTranscriptionAPI {
    private $openaiKey;

    public function __construct() {
        $this->openaiKey = TranscribeConfig::getOpenAIKey();

        if (!$this->openaiKey) {
            $this->sendError('OpenAI API-Key nicht konfiguriert', 500);
        }
    }

    /**
     * Hauptverarbeitungslogik
     */
    public function processRequest() {
        try {
            // Prüfe ob Datei hochgeladen wurde
            if (!isset($_FILES['audio']) || $_FILES['audio']['error'] !== UPLOAD_ERR_OK) {
                $errorMsg = $this->getUploadErrorMessage($_FILES['audio']['error'] ?? null);
                $this->sendError('Keine gültige Audio-Datei hochgeladen: ' . $errorMsg);
            }

            $audioFile = $_FILES['audio'];

            // Datei validieren
            $this->validateAudioFile($audioFile);

            // Rate Limiting prüfen
            if (!$this->checkRateLimit()) {
                $this->sendError('Rate Limit erreicht. Bitte versuche es später erneut.', 429);
            }

            // Audio-Datei transkribieren
            $transcription = $this->transcribeAudio($audioFile);

            // Rate Limit aktualisieren
            $this->updateRateLimit();

            // Erfolgreiche Antwort senden
            $this->sendSuccess($transcription);

        } catch (Exception $e) {
            error_log('Whisper API Fehler: ' . $e->getMessage());
            $this->sendError('Transkriptionsfehler: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Audio-Datei validieren
     */
    private function validateAudioFile($file) {
        // Dateigröße prüfen
        if ($file['size'] > TranscribeConfig::MAX_FILE_SIZE) {
            $maxSizeMB = TranscribeConfig::MAX_FILE_SIZE / 1024 / 1024;
            $this->sendError("Datei zu groß (maximal {$maxSizeMB} MB erlaubt)");
        }

        if ($file['size'] === 0) {
            $this->sendError('Datei ist leer');
        }

        // MIME-Type prüfen
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, TranscribeConfig::ALLOWED_MIME_TYPES)) {
            error_log("Unerlaubter MIME-Type: {$mimeType}");
            // Erlaube trotzdem, da Browser unterschiedliche MIME-Types senden können
        }
    }

    /**
     * Audio mit OpenAI Whisper transkribieren
     */
    private function transcribeAudio($file) {
        $tmpFilePath = $file['tmp_name'];
        $originalName = $file['name'];

        // CURLFile erstellen
        $cFile = new CURLFile($tmpFilePath, $file['type'], $originalName);

        // Request-Daten vorbereiten
        $postData = [
            'file' => $cFile,
            'model' => TranscribeConfig::WHISPER_MODEL,
            'language' => TranscribeConfig::LANGUAGE,
            'response_format' => 'json'
        ];

        // cURL-Request
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => TranscribeConfig::WHISPER_API_URL,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postData,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->openaiKey
            ],
            CURLOPT_TIMEOUT => 60, // Whisper kann länger dauern
            CURLOPT_SSL_VERIFYPEER => true
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception('cURL-Fehler: ' . $error);
        }

        if ($httpCode !== 200) {
            $errorData = json_decode($response, true);
            $errorMessage = $errorData['error']['message'] ?? 'Unbekannter API-Fehler';
            throw new Exception('OpenAI Whisper API-Fehler (' . $httpCode . '): ' . $errorMessage);
        }

        $responseData = json_decode($response, true);

        if (!isset($responseData['text'])) {
            throw new Exception('Ungültige API-Antwort - kein Text gefunden');
        }

        return trim($responseData['text']);
    }

    /**
     * Rate Limiting prüfen
     */
    private function checkRateLimit() {
        $rateLimitFile = TranscribeConfig::RATE_LIMIT_FILE;
        $clientIP = $this->getClientIP();
        $currentHour = date('Y-m-d-H');

        if (!file_exists($rateLimitFile)) {
            return true;
        }

        $rateLimitData = json_decode(file_get_contents($rateLimitFile), true) ?: [];

        $key = $clientIP . '-' . $currentHour;
        $requests = $rateLimitData[$key] ?? 0;

        return $requests < TranscribeConfig::MAX_REQUESTS_PER_HOUR;
    }

    /**
     * Rate Limit aktualisieren
     */
    private function updateRateLimit() {
        $rateLimitFile = TranscribeConfig::RATE_LIMIT_FILE;
        $clientIP = $this->getClientIP();
        $currentHour = date('Y-m-d-H');

        $rateLimitData = [];
        if (file_exists($rateLimitFile)) {
            $rateLimitData = json_decode(file_get_contents($rateLimitFile), true) ?: [];
        }

        // Alte Einträge bereinigen (älter als 24 Stunden)
        $cutoff = date('Y-m-d-H', strtotime('-24 hours'));
        foreach ($rateLimitData as $key => $value) {
            if ($key < $cutoff) {
                unset($rateLimitData[$key]);
            }
        }

        $key = $clientIP . '-' . $currentHour;
        $rateLimitData[$key] = ($rateLimitData[$key] ?? 0) + 1;

        file_put_contents($rateLimitFile, json_encode($rateLimitData));
    }

    /**
     * Client-IP ermitteln
     */
    private function getClientIP() {
        $ipKeys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];

        foreach ($ipKeys as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = $_SERVER[$key];
                // Bei mehreren IPs die erste nehmen
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }

        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    /**
     * Upload-Fehler-Nachricht abrufen
     */
    private function getUploadErrorMessage($errorCode) {
        $errors = [
            UPLOAD_ERR_INI_SIZE => 'Datei überschreitet upload_max_filesize',
            UPLOAD_ERR_FORM_SIZE => 'Datei überschreitet MAX_FILE_SIZE',
            UPLOAD_ERR_PARTIAL => 'Datei wurde nur teilweise hochgeladen',
            UPLOAD_ERR_NO_FILE => 'Keine Datei hochgeladen',
            UPLOAD_ERR_NO_TMP_DIR => 'Temporärer Ordner fehlt',
            UPLOAD_ERR_CANT_WRITE => 'Fehler beim Schreiben der Datei',
            UPLOAD_ERR_EXTENSION => 'Upload durch PHP-Extension gestoppt'
        ];

        return $errors[$errorCode] ?? 'Unbekannter Upload-Fehler';
    }

    /**
     * Erfolgreiche Antwort senden
     */
    private function sendSuccess($text) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'text' => $text,
            'timestamp' => date('c')
        ]);
        exit();
    }

    /**
     * Fehlerantwort senden
     */
    private function sendError($message, $code = 400) {
        http_response_code($code);
        echo json_encode([
            'success' => false,
            'error' => $message,
            'timestamp' => date('c')
        ]);
        exit();
    }
}

// API-Verarbeitung starten
try {
    $api = new WhisperTranscriptionAPI();
    $api->processRequest();
} catch (Exception $e) {
    error_log('Whisper API kritischer Fehler: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Interner Serverfehler',
        'timestamp' => date('c')
    ]);
}
?>
