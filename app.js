// Haupt-App-Logik für DreamSphere PWA
// Verwaltet Event-Listeners, Spracherkennung und API-Kommunikation

class DreamSphereApp {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isTranscribing = false;
        this.isOnline = navigator.onLine;
        this.wakeLock = null;

        // Initialisierung nach DOM-Load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    // App initialisieren
    async initialize() {
        try {
            console.log('DreamSphere App wird initialisiert...');
            
            // Service Worker registrieren
            await this.registerServiceWorker();

            // Audio-Aufnahme initialisieren
            await this.initializeAudioRecording();

            // Event-Listeners einrichten
            this.setupEventListeners();
            
            // Online/Offline-Status überwachen
            this.setupNetworkListeners();
            
            // URL-Parameter prüfen (für Deep-Links)
            this.handleURLParameters();
            
            console.log('DreamSphere App erfolgreich initialisiert');
            
        } catch (error) {
            console.error('Fehler bei App-Initialisierung:', error);
            dreamUI.showError('Fehler beim Starten der App');
        }
    }

    // Service Worker registrieren
    async registerServiceWorker() {
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registriert:', registration.scope);
                
                // Update-Handler
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Neue Version verfügbar
                            this.showUpdateAvailable();
                        }
                    });
                });
            }
        } catch (error) {
            console.error('Service Worker Registrierung fehlgeschlagen:', error);
        }
    }

    // Audio-Aufnahme initialisieren
    async initializeAudioRecording() {
        try {
            // Prüfe Browser-Unterstützung für MediaRecorder
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn('Audio-Aufnahme wird von diesem Browser nicht unterstützt');
                this.disableAudioRecording();
                return;
            }

            // Mikrofon-Berechtigung wird beim ersten Aufnahme-Start angefordert
            console.log('Audio-Aufnahme bereit');

        } catch (error) {
            console.error('Fehler bei Audio-Aufnahme-Initialisierung:', error);
            this.disableAudioRecording();
        }
    }

    // Event-Listeners einrichten
    setupEventListeners() {
        try {
            // Navigation
            const navNewDream = document.getElementById('nav-new-dream');
            const navLogbook = document.getElementById('nav-logbook');
            
            if (navNewDream) {
                navNewDream.addEventListener('click', () => dreamUI.showView('new-dream'));
            }
            
            if (navLogbook) {
                navLogbook.addEventListener('click', () => dreamUI.showView('logbook'));
            }

            // New Dream Form
            const recordBtn = document.getElementById('record-btn');
            const saveDreamBtn = document.getElementById('save-dream-btn');
            
            if (recordBtn) {
                recordBtn.addEventListener('click', () => this.toggleAudioRecording());
            }
            
            if (saveDreamBtn) {
                saveDreamBtn.addEventListener('click', () => this.saveDream());
            }

            // Dream Detail
            const backToLogbook = document.getElementById('back-to-logbook');
            if (backToLogbook) {
                backToLogbook.addEventListener('click', () => dreamUI.showView('logbook'));
            }

            // Traumtext kopieren
            const copyDreamBtn = document.getElementById('copy-dream-btn');
            if (copyDreamBtn) {
                copyDreamBtn.addEventListener('click', () => {
                    const textEl = document.getElementById('dream-detail-text');
                    const text = textEl ? textEl.textContent : '';
                    dreamUI.copyToClipboard(text, 'Traumtext kopiert');
                });
            }

            // Analyse-Buttons
            const analysisButtons = document.querySelectorAll('.btn-analysis');
            analysisButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const method = e.target.dataset.method;
                    if (method) {
                        this.analyzeDream(method);
                    }
                });
            });

            // Lösch-Buttons
            const deleteDreamBtn = document.getElementById('delete-dream-btn');
            if (deleteDreamBtn) {
                deleteDreamBtn.addEventListener('click', () => dreamUI.confirmDeleteDream());
            }

            const deleteAllAnalysesBtn = document.getElementById('delete-all-analyses-btn');
            if (deleteAllAnalysesBtn) {
                deleteAllAnalysesBtn.addEventListener('click', () => dreamUI.confirmDeleteAllAnalyses());
            }

            // Keyboard-Shortcuts
            document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
            
            // Form-Validierung
            const dreamInput = document.getElementById('dream-input');
            if (dreamInput) {
                dreamInput.addEventListener('input', () => this.validateDreamForm());
            }

        } catch (error) {
            console.error('Fehler beim Einrichten der Event-Listeners:', error);
        }
    }

    // Netzwerk-Listeners einrichten
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Verbindung wiederhergestellt');
            dreamUI.showSuccess('Verbindung wiederhergestellt');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Verbindung verloren');
            dreamUI.showError('Keine Internetverbindung - Analyse-Funktionen nicht verfügbar');
        });

        // Wake Lock bei Sichtbarkeitswechsel behandeln
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible' && this.isRecording) {
                // Wake Lock erneuern wenn App wieder sichtbar und Aufnahme läuft
                await this.requestWakeLock();
            }
        });
    }

    // URL-Parameter verarbeiten
    handleURLParameters() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const view = urlParams.get('view');
            
            if (view) {
                dreamUI.showView(view);
            }
        } catch (error) {
            console.error('Fehler beim Verarbeiten der URL-Parameter:', error);
        }
    }

    // Audio-Aufnahme umschalten
    async toggleAudioRecording() {
        try {
            if (this.isRecording) {
                // Aufnahme beenden
                this.stopRecording();
            } else {
                // Aufnahme starten
                await this.startRecording();
            }
        } catch (error) {
            console.error('Fehler bei Audio-Aufnahme:', error);
            dreamUI.showError('Fehler bei der Audio-Aufnahme: ' + error.message);
            this.isRecording = false;
            this.updateRecordButton(false);
        }
    }

    // Audio-Aufnahme starten
    async startRecording() {
        try {
            // Wake Lock anfordern, um Bildschirm-Ausschalten zu verhindern
            await this.requestWakeLock();

            // Mikrofon-Stream anfordern
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000
                }
            });

            // MediaRecorder erstellen
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            this.currentRecordingSize = 0;

            // Event-Handler
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    this.currentRecordingSize += event.data.size;

                    // Größencheck: 24 MB Limit
                    const maxSize = 24 * 1024 * 1024; // 24 MB
                    if (this.currentRecordingSize > maxSize) {
                        console.log('Maximale Dateigröße erreicht, stoppe Aufnahme');
                        dreamUI.showWarning('Maximale Dateigröße (24 MB) erreicht. Aufnahme wird beendet.');
                        this.stopRecording();
                    }
                }
            };

            this.mediaRecorder.onstop = async () => {
                console.log('Aufnahme beendet, starte Transkription...');

                // Auto-Stop-Timer löschen falls vorhanden
                if (this.recordingTimeout) {
                    clearTimeout(this.recordingTimeout);
                    this.recordingTimeout = null;
                }

                // Audio-Blob erstellen
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

                // Stream stoppen
                stream.getTracks().forEach(track => track.stop());

                // Wake Lock freigeben
                await this.releaseWakeLock();

                // Größe zurücksetzen
                this.currentRecordingSize = 0;

                // Transkription starten
                await this.transcribeAudio(audioBlob);
            };

            // Aufnahme starten mit timeslice für regelmäßige Größenprüfung
            // timeslice: 1000ms = jede Sekunde wird ondataavailable aufgerufen
            this.mediaRecorder.start(1000);
            this.isRecording = true;
            this.updateRecordButton(true);

            // Timer-Anzeige im Textfeld starten
            this.startRecordingTimer();

            // Auto-Stop nach 9 Minuten (540 Sekunden)
            this.recordingTimeout = setTimeout(() => {
                console.log('Auto-Stop nach 9 Minuten');
                dreamUI.showWarning('Maximale Aufnahmedauer (9 Min) erreicht. Aufnahme wird beendet.');
                this.stopRecording();
            }, 540000); // 9 Minuten = 540000 ms

            console.log('Audio-Aufnahme gestartet (max. 9 Minuten)');

        } catch (error) {
            // Wake Lock freigeben bei Fehler
            await this.releaseWakeLock();

            if (error.name === 'NotAllowedError') {
                dreamUI.showError('Mikrofon-Berechtigung verweigert. Bitte erlaube den Zugriff.');
            } else if (error.name === 'NotFoundError') {
                dreamUI.showError('Kein Mikrofon gefunden.');
            } else {
                dreamUI.showError('Fehler beim Starten der Aufnahme: ' + error.message);
            }
            throw error;
        }
    }

    // Audio-Aufnahme stoppen
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.updateRecordButton(false);
            this.stopRecordingTimer();
            console.log('Stoppe Audio-Aufnahme...');
        }
    }

    // Timer für Aufnahme-Anzeige starten
    startRecordingTimer() {
        const dreamInput = document.getElementById('dream-input');
        if (!dreamInput) return;

        // Ursprünglichen Wert speichern
        this.recordingOriginalValue = dreamInput.value;
        this.recordingOriginalPlaceholder = dreamInput.placeholder;

        // Timer-Variablen initialisieren
        this.recordingStartTime = Date.now();
        this.recordingTimerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000); // Sekunden
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;

            // Format: MM:SS / 09:00
            const currentTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            dreamInput.placeholder = `🎙️ Aufnahme läuft... ${currentTime} / 09:00`;
        }, 1000);
    }

    // Timer für Aufnahme-Anzeige stoppen
    stopRecordingTimer() {
        if (this.recordingTimerInterval) {
            clearInterval(this.recordingTimerInterval);
            this.recordingTimerInterval = null;
        }

        // Placeholder zurücksetzen
        const dreamInput = document.getElementById('dream-input');
        if (dreamInput && this.recordingOriginalPlaceholder !== undefined) {
            dreamInput.placeholder = this.recordingOriginalPlaceholder;
        }
    }

    // Audio mit Whisper transkribieren
    async transcribeAudio(audioBlob) {
        try {
            this.isTranscribing = true;

            // Zeige "Transkribiere..." im Textfeld
            const dreamInput = document.getElementById('dream-input');
            const originalValue = dreamInput ? dreamInput.value : '';
            const originalPlaceholder = dreamInput ? dreamInput.placeholder : '';

            if (dreamInput) {
                dreamInput.placeholder = 'Transkribiere...';
                dreamInput.disabled = true;
            }

            // Konvertiere WebM zu MP3/WAV falls nötig und erstelle FormData
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            // API-Request
            const response = await fetch('./transcribe.php', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Transkription in Textfeld einfügen
            if (dreamInput && data.text) {
                const currentText = originalValue.trim();
                dreamInput.value = currentText + (currentText ? ' ' : '') + data.text;
                dreamInput.placeholder = originalPlaceholder;
                dreamInput.disabled = false;
                dreamInput.focus();

                // Validierung auslösen
                this.validateDreamForm();

                // Automatisch speichern nach erfolgreicher Transkription
                dreamUI.showSuccess('Transkription erfolgreich! Speichere Traum...');

                // Kurze Verzögerung für bessere UX
                setTimeout(() => {
                    this.saveDream();
                }, 500);
            } else {
                dreamUI.showSuccess('Transkription erfolgreich!');
            }

        } catch (error) {
            console.error('Fehler bei Transkription:', error);
            dreamUI.showError('Fehler bei der Transkription: ' + error.message);

            // Textfeld wieder aktivieren
            const dreamInput = document.getElementById('dream-input');
            if (dreamInput) {
                dreamInput.placeholder = 'Erzähle von deinem Traum...';
                dreamInput.disabled = false;
            }
        } finally {
            this.isTranscribing = false;
        }
    }

    // Record-Button aktualisieren
    updateRecordButton(isRecording) {
        const recordBtn = document.getElementById('record-btn');
        if (recordBtn) {
            if (isRecording) {
                recordBtn.innerHTML = '🔴 Aufnahme läuft...';
                recordBtn.classList.add('recording');
            } else {
                recordBtn.innerHTML = '🎤 Aufnehmen';
                recordBtn.classList.remove('recording');
            }
        }
    }

    // Audio-Aufnahme deaktivieren
    disableAudioRecording() {
        const recordBtn = document.getElementById('record-btn');
        if (recordBtn) {
            recordBtn.disabled = true;
            recordBtn.innerHTML = '🎤 Nicht verfügbar';
            recordBtn.title = 'Audio-Aufnahme wird von diesem Browser nicht unterstützt';
        }
    }

    // Wake Lock anfordern (verhindert Bildschirm-Ausschalten)
    async requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake Lock aktiviert - Bildschirm bleibt an');

                // Event-Listener für Wake Lock Release
                this.wakeLock.addEventListener('release', () => {
                    console.log('Wake Lock wurde freigegeben');
                });
            } else {
                console.log('Wake Lock API nicht verfügbar');
            }
        } catch (error) {
            console.error('Wake Lock Fehler:', error);
            // Fehler nicht an Benutzer weitergeben, da Wake Lock optional ist
        }
    }

    // Wake Lock freigeben
    async releaseWakeLock() {
        try {
            if (this.wakeLock !== null) {
                await this.wakeLock.release();
                this.wakeLock = null;
                console.log('Wake Lock manuell freigegeben');
            }
        } catch (error) {
            console.error('Fehler beim Freigeben des Wake Lock:', error);
        }
    }

    // Traum speichern
    saveDream() {
        try {
            // Wenn gerade aufgenommen wird, beende die Aufnahme
            // (dies startet automatisch die Transkription und das Speichern)
            if (this.isRecording) {
                dreamUI.showSuccess('Beende Aufnahme und speichere Traum...');
                this.stopRecording();
                return;
            }

            // Wenn gerade transkribiert wird, warte darauf
            // (die Transkription wird automatisch speichern)
            if (this.isTranscribing) {
                dreamUI.showSuccess('Warte auf Transkription...');
                return;
            }

            const dreamInput = document.getElementById('dream-input');
            const contextInput = document.getElementById('context-input');

            if (!dreamInput) {
                dreamUI.showError('Traum-Eingabefeld nicht gefunden');
                return;
            }

            const dreamText = dreamInput.value.trim();
            const context = contextInput ? contextInput.value.trim() : '';

            // Validierung
            if (!dreamText) {
                dreamUI.showError('Bitte gib deinen Traum ein');
                dreamInput.focus();
                return;
            }

            if (dreamText.length < 10) {
                dreamUI.showError('Der Traum sollte mindestens 10 Zeichen lang sein');
                dreamInput.focus();
                return;
            }

            // Traum-Objekt erstellen
            const dreamData = {
                text: dreamText,
                context: context,
                date: new Date().toISOString()
            };

            // Speichern
            const savedDream = dreamStorage.saveDream(dreamData);
            
            if (savedDream) {
                dreamUI.showSuccess('Traum erfolgreich gespeichert!');
                dreamUI.resetNewDreamForm();
                
                // Nach kurzer Verzögerung zum Logbuch wechseln
                setTimeout(() => {
                    dreamUI.showView('logbook');
                }, 1500);
            }

        } catch (error) {
            console.error('Fehler beim Speichern des Traums:', error);
            dreamUI.showError('Fehler beim Speichern des Traums');
        }
    }

    // Traum analysieren
    async analyzeDream(method) {
        try {
            if (!this.isOnline) {
                dreamUI.showError('Keine Internetverbindung für Analyse verfügbar');
                return;
            }

            const currentDream = dreamUI.getCurrentDream();
            if (!currentDream) {
                dreamUI.showError('Kein Traum für Analyse ausgewählt');
                return;
            }

            // Prüfe ob Analyse bereits existiert
            if (currentDream.analyses && currentDream.analyses[method]) {
                const existingAnalysis = currentDream.analyses[method];
                dreamUI.showError(`${this.getAnalysisTitle(method)} bereits vorhanden (${new Date(existingAnalysis.timestamp).toLocaleDateString()})`);
                return;
            }

            // Loading anzeigen
            dreamUI.showLoading(`${this.getAnalysisTitle(method)} wird erstellt...`);

            // API-Request
            const response = await this.callAnalysisAPI(currentDream.text, currentDream.context, method);
            
            if (response.error) {
                throw new Error(response.error);
            }

            // Ergebnis anzeigen
            dreamUI.displayAnalysisResult(method, response.result);
            dreamUI.showSuccess(`${this.getAnalysisTitle(method)} abgeschlossen!`);

        } catch (error) {
            console.error('Fehler bei Traumanalyse:', error);
            dreamUI.showError(`Fehler bei der Analyse: ${error.message}`);
        } finally {
            dreamUI.hideLoading();
        }
    }

    // API-Aufruf für Analyse
    async callAnalysisAPI(dreamText, context, method) {
        try {
            const requestData = {
                dream_text: dreamText,
                context: context || '',
                analysis_method: method
            };

            const response = await fetch('./api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            return data;

        } catch (error) {
            console.error('API-Fehler:', error);
            
            // Offline-Fallback
            if (!this.isOnline) {
                return {
                    error: 'Keine Internetverbindung verfügbar'
                };
            }
            
            throw error;
        }
    }

    // Analyse-Titel abrufen
    getAnalysisTitle(method) {
        const titles = {
            'jungian': 'Jung\'sche Analyse',
            'freudian': 'Freud\'sche Analyse',
            'sentiment': 'Sentiment-Analyse',
            'archetypes': 'Archetypen-Analyse',
            'what_if': 'Was-wäre-wenn-Analyse',
            'poem': 'Traum-Poesie'
        };
        
        return titles[method] || 'Analyse';
    }

    // Form-Validierung
    validateDreamForm() {
        const dreamInput = document.getElementById('dream-input');
        const saveDreamBtn = document.getElementById('save-dream-btn');
        
        if (dreamInput && saveDreamBtn) {
            const isValid = dreamInput.value.trim().length >= 10;
            saveDreamBtn.disabled = !isValid;
            
            if (isValid) {
                saveDreamBtn.classList.remove('disabled');
            } else {
                saveDreamBtn.classList.add('disabled');
            }
        }
    }

    // Keyboard-Shortcuts
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + S: Traum speichern
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            if (dreamUI.getCurrentView() === 'new-dream') {
                this.saveDream();
            }
        }
        
        // Escape: Zurück zum Logbuch
        if (event.key === 'Escape') {
            if (dreamUI.getCurrentView() === 'dream-detail') {
                dreamUI.showView('logbook');
            }
        }
        
        // Ctrl/Cmd + R: Audio-Aufnahme umschalten
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            if (dreamUI.getCurrentView() === 'new-dream') {
                this.toggleAudioRecording();
            }
        }
    }

    // Update verfügbar anzeigen
    showUpdateAvailable() {
        const updateBanner = document.createElement('div');
        updateBanner.className = 'update-banner';
        updateBanner.innerHTML = `
            <div class="update-content">
                <span>🔄 Neue Version verfügbar!</span>
                <button onclick="window.location.reload()" class="btn btn-primary btn-sm">
                    Aktualisieren
                </button>
            </div>
        `;
        
        // CSS für Update-Banner
        if (!document.querySelector('#update-banner-styles')) {
            const style = document.createElement('style');
            style.id = 'update-banner-styles';
            style.textContent = `
                .update-banner {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    background: var(--primary-color);
                    color: white;
                    padding: var(--spacing-sm);
                    z-index: 1002;
                    text-align: center;
                }
                .update-content {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--spacing-md);
                }
                .btn-sm {
                    padding: var(--spacing-xs) var(--spacing-sm);
                    font-size: 0.875rem;
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.insertBefore(updateBanner, document.body.firstChild);
    }

    // App-Status abrufen
    getAppStatus() {
        return {
            isOnline: this.isOnline,
            isRecording: this.isRecording,
            audioRecordingAvailable: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            currentView: dreamUI.getCurrentView(),
            isLoading: dreamUI.getLoadingStatus()
        };
    }
}

// App-Instanz erstellen
const dreamSphereApp = new DreamSphereApp();

// Globale Funktionen für Debugging
window.dreamSphereApp = dreamSphereApp;
window.dreamStorage = dreamStorage;
window.dreamUI = dreamUI;
