<?php
/**
 * DreamSphere API Proxy
 * Sichere Schnittstelle zur OpenAI API für Traumanalyse
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
class Config {
    // OpenAI API-Konfiguration
    const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
    const OPENAI_MODEL = 'gpt-4.1-mini';
    const MAX_TOKENS = 5000;
    const TEMPERATURE = 0.7;
    
    // Rate Limiting (einfache Implementierung)
    const MAX_REQUESTS_PER_HOUR = 100;
    const RATE_LIMIT_FILE = 'rate_limit.json';
    
    // Sicherheit
    const MAX_DREAM_LENGTH = 8000;
    const MIN_DREAM_LENGTH = 10;
    
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
 * Hauptklasse für API-Verarbeitung
 */
class DreamAnalysisAPI {
    private $openaiKey;
    
    public function __construct() {
        $this->openaiKey = Config::getOpenAIKey();
        
        if (!$this->openaiKey) {
            $this->sendError('OpenAI API-Key nicht konfiguriert', 500);
        }
    }
    
    /**
     * Hauptverarbeitungslogik
     */
    public function processRequest() {
        try {
            // Request-Daten lesen
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                $this->sendError('Ungültiges JSON-Format');
            }
            
            // Eingabedaten validieren
            $this->validateInput($data);
            
            // Rate Limiting prüfen
            if (!$this->checkRateLimit()) {
                $this->sendError('Rate Limit erreicht. Bitte versuche es später erneut.', 429);
            }
            
            // Prompt basierend auf Analyse-Methode erstellen
            $prompt = $this->buildPrompt($data);
            
            // OpenAI API aufrufen
            $result = $this->callOpenAI($prompt);
            
            // Rate Limit aktualisieren
            $this->updateRateLimit();
            
            // Erfolgreiche Antwort senden
            $this->sendSuccess($result);
            
        } catch (Exception $e) {
            error_log('DreamSphere API Fehler: ' . $e->getMessage());
            $this->sendError('Interner Serverfehler: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Eingabedaten validieren
     */
    private function validateInput($data) {
        // Erforderliche Felder prüfen
        if (!isset($data['dream_text']) || !isset($data['analysis_method'])) {
            $this->sendError('Erforderliche Felder fehlen: dream_text, analysis_method');
        }
        
        $dreamText = trim($data['dream_text']);
        $method = $data['analysis_method'];
        
        // Traumtext validieren
        if (strlen($dreamText) < Config::MIN_DREAM_LENGTH) {
            $this->sendError('Traumtext zu kurz (mindestens ' . Config::MIN_DREAM_LENGTH . ' Zeichen)');
        }
        
        if (strlen($dreamText) > Config::MAX_DREAM_LENGTH) {
            $this->sendError('Traumtext zu lang (maximal ' . Config::MAX_DREAM_LENGTH . ' Zeichen)');
        }
        
        // Analyse-Methode validieren
        $validMethods = ['jungian', 'freudian', 'sentiment', 'archetypes', 'what_if', 'poem'];
        if (!in_array($method, $validMethods)) {
            $this->sendError('Ungültige Analyse-Methode: ' . $method);
        }
        
        // XSS-Schutz: HTML-Tags entfernen
        $data['dream_text'] = strip_tags($dreamText);
        $data['context'] = isset($data['context']) ? strip_tags(trim($data['context'])) : '';
    }
    
    /**
     * Prompt basierend auf Analyse-Methode erstellen
     */
    private function buildPrompt($data) {
        $dreamText = $data['dream_text'];
        $context = $data['context'] ?? '';
        $method = $data['analysis_method'];
        
        $contextInfo = $context ? "\nStimmung vor dem Schlafen: $context" : '';
        
        switch ($method) {
            case 'jungian':
                return "Analysiere den folgenden Traum aus Jung'scher Sicht. Identifiziere die wichtigsten Archetypen, Symbole und deren Bedeutung für das Unbewusste. Erkläre die möglichen Botschaften des Traums für die Persönlichkeitsentwicklung.$contextInfo\n\nTraum: $dreamText";
                
            case 'freudian':
                return "Analysiere diesen Traum aus Freud'scher Perspektive. Untersuche mögliche verdrängte Wünsche, Triebe und unbewusste Konflikte. Erkläre die symbolische Bedeutung der Traumelemente.$contextInfo\n\nTraum: $dreamText";
                
            case 'sentiment':
                return "Analysiere die primäre Emotion und Stimmung dieses Traums. Antworte mit nur einem oder zwei Worten, die die Hauptemotion beschreiben (z.B. 'Angst', 'Freude', 'Verwirrung', 'Sehnsucht').$contextInfo\n\nTraum: $dreamText";
                
            case 'archetypes':
                return "Identifiziere die Jung'schen Archetypen in diesem Traum. Erkläre, welche Archetypen (wie Anima/Animus, Schatten, Selbst, Held, Weise, etc.) präsent sind und was sie bedeuten.$contextInfo\n\nTraum: $dreamText";
                
            case 'what_if':
                return "Basierend auf diesem Traum, stelle eine tiefgreifende 'Was wäre wenn?'-Frage, die zur Selbstreflexion anregt. Die Frage sollte den Träumer dazu bringen, über sein Leben, seine Entscheidungen oder Gefühle nachzudenken.$contextInfo\n\nTraum: $dreamText";
                
            case 'poem':
                return "Verwandle diesen Traum in ein kurzes, ausdrucksstarkes Gedicht. Bewahre die Essenz und Stimmung des Traums, aber mache es poetisch und metaphorisch.$contextInfo\n\nTraum: $dreamText";
                
            default:
                $this->sendError('Unbekannte Analyse-Methode: ' . $method);
        }
    }
    
    /**
     * OpenAI API aufrufen
     */
    private function callOpenAI($prompt) {
        $data = [
            'model' => Config::OPENAI_MODEL,
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'Du bist ein erfahrener Traumanalyst und Psychologe. Antworte auf Deutsch und sei einfühlsam und hilfreich.'
                ],
                [
                    'role' => 'user',
                    'content' => $prompt
                ]
            ],
            'max_tokens' => Config::MAX_TOKENS,
            'temperature' => Config::TEMPERATURE
        ];
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => Config::OPENAI_API_URL,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->openaiKey
            ],
            CURLOPT_TIMEOUT => 30,
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
            throw new Exception('OpenAI API-Fehler (' . $httpCode . '): ' . $errorMessage);
        }
        
        $responseData = json_decode($response, true);
        
        if (!isset($responseData['choices'][0]['message']['content'])) {
            throw new Exception('Ungültige API-Antwort');
        }
        
        return trim($responseData['choices'][0]['message']['content']);
    }
    
    /**
     * Rate Limiting prüfen
     */
    private function checkRateLimit() {
        $rateLimitFile = Config::RATE_LIMIT_FILE;
        $clientIP = $this->getClientIP();
        $currentHour = date('Y-m-d-H');
        
        if (!file_exists($rateLimitFile)) {
            return true;
        }
        
        $rateLimitData = json_decode(file_get_contents($rateLimitFile), true) ?: [];
        
        $key = $clientIP . '-' . $currentHour;
        $requests = $rateLimitData[$key] ?? 0;
        
        return $requests < Config::MAX_REQUESTS_PER_HOUR;
    }
    
    /**
     * Rate Limit aktualisieren
     */
    private function updateRateLimit() {
        $rateLimitFile = Config::RATE_LIMIT_FILE;
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
     * Erfolgreiche Antwort senden
     */
    private function sendSuccess($result) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'result' => $result,
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
    $api = new DreamAnalysisAPI();
    $api->processRequest();
} catch (Exception $e) {
    error_log('DreamSphere API kritischer Fehler: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Interner Serverfehler',
        'timestamp' => date('c')
    ]);
}
?>

