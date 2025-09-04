// Haupt-App-Logik für DreamSphere PWA
// Verwaltet Event-Listeners, Spracherkennung und API-Kommunikation

class DreamSphereApp {
    constructor() {
        this.speechRecognition = null;
        this.isRecording = false;
        this.isOnline = navigator.onLine;
        
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
            
            // Spracherkennung initialisieren
            this.initializeSpeechRecognition();
            
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

    // Spracherkennung initialisieren
    initializeSpeechRecognition() {
        try {
            // Prüfe Browser-Unterstützung
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            
            if (!SpeechRecognition) {
                console.warn('Spracherkennung wird von diesem Browser nicht unterstützt');
                this.disableSpeechRecognition();
                return;
            }

            this.speechRecognition = new SpeechRecognition();
            
            // Konfiguration
            this.speechRecognition.continuous = true;
            this.speechRecognition.interimResults = true;
            this.speechRecognition.lang = 'de-DE';
            
            // Event-Handler
            this.speechRecognition.onstart = () => {
                console.log('Spracherkennung gestartet');
                this.isRecording = true;
                this.updateRecordButton(true);
            };
            
            this.speechRecognition.onresult = (event) => {
                this.handleSpeechResult(event);
            };
            
            this.speechRecognition.onerror = (event) => {
                console.error('Spracherkennungsfehler:', event.error);
                this.handleSpeechError(event.error);
            };
            
            this.speechRecognition.onend = () => {
                console.log('Spracherkennung beendet');
                this.isRecording = false;
                this.updateRecordButton(false);
            };
            
        } catch (error) {
            console.error('Fehler bei Spracherkennung-Initialisierung:', error);
            this.disableSpeechRecognition();
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
                recordBtn.addEventListener('click', () => this.toggleSpeechRecognition());
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

    // Spracherkennung umschalten
    toggleSpeechRecognition() {
        try {
            if (!this.speechRecognition) {
                dreamUI.showError('Spracherkennung nicht verfügbar');
                return;
            }

            if (this.isRecording) {
                this.speechRecognition.stop();
            } else {
                this.speechRecognition.start();
            }
        } catch (error) {
            console.error('Fehler bei Spracherkennung:', error);
            dreamUI.showError('Fehler bei der Spracherkennung');
        }
    }

    // Spracherkennung-Ergebnis verarbeiten
    handleSpeechResult(event) {
        try {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            const dreamInput = document.getElementById('dream-input');
            if (dreamInput) {
                // Füge finalen Text hinzu
                if (finalTranscript) {
                    const currentText = dreamInput.value;
                    dreamInput.value = currentText + (currentText ? ' ' : '') + finalTranscript;
                }
                
                // Zeige vorläufigen Text in Platzhalter
                if (interimTranscript) {
                    dreamInput.placeholder = `Erkannt: ${interimTranscript}`;
                } else {
                    dreamInput.placeholder = 'Erzähle von deinem Traum...';
                }
            }
        } catch (error) {
            console.error('Fehler bei Spracherkennung-Ergebnis:', error);
        }
    }

    // Spracherkennung-Fehler behandeln
    handleSpeechError(error) {
        let errorMessage = 'Fehler bei der Spracherkennung';
        
        switch (error) {
            case 'no-speech':
                errorMessage = 'Keine Sprache erkannt. Bitte versuche es erneut.';
                break;
            case 'audio-capture':
                errorMessage = 'Mikrofon nicht verfügbar. Bitte prüfe die Berechtigungen.';
                break;
            case 'not-allowed':
                errorMessage = 'Mikrofon-Berechtigung verweigert. Bitte erlaube den Zugriff.';
                break;
            case 'network':
                errorMessage = 'Netzwerkfehler bei der Spracherkennung.';
                break;
        }
        
        dreamUI.showError(errorMessage);
        this.isRecording = false;
        this.updateRecordButton(false);
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

    // Spracherkennung deaktivieren
    disableSpeechRecognition() {
        const recordBtn = document.getElementById('record-btn');
        if (recordBtn) {
            recordBtn.disabled = true;
            recordBtn.innerHTML = '🎤 Nicht verfügbar';
            recordBtn.title = 'Spracherkennung wird von diesem Browser nicht unterstützt';
        }
    }

    // Traum speichern
    saveDream() {
        try {
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
        
        // Ctrl/Cmd + R: Spracherkennung umschalten
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            if (dreamUI.getCurrentView() === 'new-dream') {
                this.toggleSpeechRecognition();
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
            speechRecognitionAvailable: !!this.speechRecognition,
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
