# 🌙 DreamSphere - AI Dream Journal PWA

Eine Progressive Web App für AI-gestützte Traumanalyse mit Vanilla JavaScript und PHP Backend.

## ✨ Features

- **📱 Progressive Web App**: Vollständig installierbar auf allen Geräten
- **🎤 Spracherkennung**: Träume per Sprache aufzeichnen (Web Speech API)
- **📚 Traum-Logbuch**: Lokale Speicherung aller Träume
- **🧠 AI-Analyse**: Verschiedene Analyse-Methoden:
  - Jung'sche Analyse
  - Freud'sche Analyse
  - Sentiment-Analyse
  - Archetypen-Analyse
  - "Was wäre wenn?"-Szenarien
  - Traum-Poesie-Generator
- **🌙 Kontext-Erfassung**: Stimmung vor dem Schlafen dokumentieren
- **📱 Responsive Design**: Optimiert für Desktop und Mobile
- **🔒 Datenschutz**: Alle Daten bleiben lokal im Browser

## 🛠️ Technologie-Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: PHP (API Proxy)
- **Speicher**: Browser localStorage
- **PWA**: Service Worker, Web App Manifest
- **AI**: OpenAI GPT-4.1-mini

## 📁 Projektstruktur

```
dreamsphere/
├── index.html          # Haupt-HTML-Datei
├── style.css           # Responsive CSS-Styles
├── app.js              # Haupt-App-Logik
├── ui.js               # DOM-Manipulation
├── storage.js          # localStorage-Verwaltung
├── api.php             # PHP Backend Proxy
├── manifest.json       # PWA Manifest
├── sw.js               # Service Worker
├── config.php          # Konfiguration (API-Key, Optionen)
├── icons/              # App-Icons
└── README.md           # Diese Datei
```

## 🚀 Installation & Setup

### 1. Projekt herunterladen
```bash
git clone [repository-url]
cd dreamsphere
```

### 2. OpenAI API-Key konfigurieren

**Option A: Umgebungsvariable (empfohlen)**
```bash
export OPENAI_API_KEY="sk-your-api-key-here"
```

**Option B: Konfigurationsdatei**
- Öffne `config.php` und trage deinen API‑Key ein (`'openai_api_key' => 'sk-...'`).

### 3. Lokaler Server starten

**PHP Built-in Server:**
```bash
php -S localhost:8000
```

**Apache/Nginx:**
- Kopiere Dateien in Webserver-Verzeichnis
- Stelle sicher, dass PHP aktiviert ist

### 4. App öffnen
Öffne `http://localhost:8000` im Browser

## 📱 PWA Installation

1. Öffne die App im Browser
2. Klicke auf "Zur Startseite hinzufügen" (Chrome/Safari)
3. Die App wird wie eine native App installiert

## 🎯 Verwendung

### Neuen Traum erstellen
1. Klicke auf "Neuer Traum"
2. Optional: Beschreibe deine Stimmung vor dem Schlafen
3. Gib deinen Traum ein oder nutze die Spracherkennung
4. Klicke "Traum speichern"

### Träume analysieren
1. Öffne einen gespeicherten Traum aus dem Logbuch
2. Wähle eine Analyse-Methode
3. Warte auf das AI-generierte Ergebnis
4. Ergebnisse werden automatisch gespeichert

### Keyboard-Shortcuts
- `Ctrl/Cmd + S`: Traum speichern
- `Ctrl/Cmd + R`: Spracherkennung umschalten
- `Escape`: Zurück zum Logbuch

## 🔧 Konfiguration

### API-Einstellungen (api.php)
```php
const OPENAI_MODEL = 'gpt-4.1-mini';
const MAX_TOKENS = 5000;
const TEMPERATURE = 0.7;
const MAX_REQUESTS_PER_HOUR = 100;
```

### PWA-Einstellungen (manifest.json)
- App-Name und Beschreibung
- Icons und Screenshots
- Display-Modus und Orientierung

## 🛡️ Sicherheit

- **Rate Limiting**: Schutz vor API-Missbrauch
- **Input-Validierung**: XSS-Schutz durch HTML-Tag-Entfernung
- **CORS-Konfiguration**: Sichere Cross-Origin-Requests
- **API-Key-Schutz**: Keine Exposition im Frontend

## 🔍 Debugging

### Browser-Konsole
```javascript
// App-Status prüfen
dreamSphereApp.getAppStatus()

// Storage-Daten anzeigen
dreamStorage.getDreams()

// UI-Status prüfen
dreamUI.getCurrentView()
```

### PHP-Logs
```bash
tail -f /var/log/apache2/error.log
# oder
tail -f /var/log/nginx/error.log
```

## 📊 Browser-Unterstützung

- **Chrome/Edge**: Vollständig unterstützt
- **Firefox**: Vollständig unterstützt
- **Safari**: Vollständig unterstützt
- **Mobile Browser**: Vollständig unterstützt

### Spracherkennung
- Chrome/Edge: ✅ Vollständig
- Firefox: ❌ Nicht unterstützt
- Safari: ⚠️ Teilweise unterstützt

## 🚨 Troubleshooting

### Häufige Probleme

**Spracherkennung funktioniert nicht:**
- Prüfe Mikrofon-Berechtigungen
- Verwende HTTPS (erforderlich für Spracherkennung)
- Teste in Chrome/Edge

**API-Fehler:**
- Prüfe OpenAI API-Key
- Kontrolliere Internetverbindung
- Überprüfe Rate Limits

**PWA installiert sich nicht:**
- Verwende HTTPS
- Prüfe manifest.json Syntax
- Stelle sicher, dass Service Worker lädt

### Logs prüfen
```bash
# PHP-Fehler
tail -f error.log

# Browser-Konsole
F12 → Console Tab
```

## 📈 Performance-Optimierung

- **Caching**: Service Worker cached App-Shell
- **Lazy Loading**: Analysen nur bei Bedarf laden
- **Komprimierung**: Gzip für statische Dateien
- **CDN**: Für bessere globale Performance

## 🔄 Updates

Die App prüft automatisch auf Updates und zeigt eine Benachrichtigung an. Klicke "Aktualisieren" um die neue Version zu laden.

## 📄 Lizenz

## 🧭 Installation auf PHP‑Webserver (Apache/Nginx)

### Voraussetzungen
- PHP 8.0+ mit Erweiterungen `curl`, `json`, `openssl`.
- Apache (mod_php) oder Nginx + PHP‑FPM mit ausgehendem HTTPS‑Zugriff.
- Webserver‑User benötigt Schreibrechte im Projektordner (für `rate_limit.json`).

### 1) Dateien bereitstellen
- Kopiere das Projekt in dein Webroot, z. B. `/var/www/dream`.
- Setze Schreibrechte für den Webserver‑User (Beispiel Ubuntu/Apache):
  - `sudo chown -R www-data:www-data /var/www/dream`
  - `sudo chmod -R 775 /var/www/dream`

### 2) PHP konfigurieren
- Apache: `sudo apt-get install -y php php-curl` → `sudo systemctl reload apache2`
- Nginx/PHP‑FPM: `sudo apt-get install -y php-fpm php-curl` → `sudo systemctl restart nginx php-fpm`

### 3) OpenAI API‑Key anfordern
- Gehe zu https://platform.openai.com/api-keys → „Create new secret key“ → Schlüssel kopieren (`sk-...`).

### 4) OpenAI API‑Key hinterlegen
Diese App liest den Schlüssel zuerst aus der Umgebungsvariable `OPENAI_API_KEY` und nutzt – falls nicht gesetzt – `config.php`.

- Option A (empfohlen) – Umgebungsvariable setzen:
  - Apache (vHost): `SetEnv OPENAI_API_KEY "sk-..."` und Apache neu laden.
  - PHP‑FPM (Pool‑Datei z. B. `/etc/php/*/fpm/pool.d/www.conf`): `env[OPENAI_API_KEY] = "sk-..."` und PHP‑FPM neu starten.
  - Entwicklung (Shell): `export OPENAI_API_KEY="sk-..."` vor Start des Servers.

- Option B – `config.php`:
  - Öffne `config.php` und setze: `'openai_api_key' => 'sk-...'`.
  - Hinweis: `config.php` dient als Fallback, wenn keine Umgebungsvariable gesetzt ist.

### 5) HTTPS aktivieren
- Für PWA/Spracherkennung wird HTTPS empfohlen. Richte ein Zertifikat (z. B. Let’s Encrypt) ein und leite HTTP → HTTPS um.

### 6) Funktionstest
- Rufe deine Domain auf (z. B. `https://deine-domain.tld/`).
- Erstelle einen Traum und starte eine Analyse.
- Bei Fehlern:
  - „OpenAI API‑Key nicht konfiguriert“ → `OPENAI_API_KEY`/`config.php` prüfen.
  - HTTP 429 → `MAX_REQUESTS_PER_HOUR` in `api.php` anpassen oder später erneut versuchen.
  - PHP‑Fehler/Erweiterungen fehlen → Webserver‑Error‑Logs und installierte PHP‑Module prüfen.

### Hinweise zur Sicherheit
- API‑Key niemals im Frontend einbetten. Die Kommunikation läuft über `api.php`.
- `api.php` setzt aktuell `Access-Control-Allow-Origin: *`. In Produktion ggf. auf deine Domain einschränken.
- Schreibrechte nur so offen wie nötig vergeben.

### Modell/Konfiguration
- Das verwendete Modell ist in `api.php` konfiguriert (`OPENAI_MODEL`, aktuell `gpt-4.1-mini`). Du kannst es dort anpassen.


MIT License - siehe LICENSE-Datei für Details.

## 🤝 Beitragen

1. Fork das Repository
2. Erstelle einen Feature-Branch
3. Committe deine Änderungen
4. Push zum Branch
5. Erstelle einen Pull Request

## 📞 Support

Bei Problemen oder Fragen:
- Erstelle ein Issue im Repository
- Prüfe die Troubleshooting-Sektion
- Kontaktiere den Entwickler

---

**Entwickelt mit ❤️ für bessere Traumanalyse**
