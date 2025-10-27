// UI Module für DreamSphere PWA
// Verwaltet alle DOM-Manipulationen und UI-Updates

class DreamUI {
    constructor() {
        this.currentView = null;
        this.currentDream = null;
        this.isLoading = false;
        
        // DOM-Elemente cachen
        this.elements = {
            // Views
            viewNewDream: document.getElementById('view-new-dream'),
            viewLogbook: document.getElementById('view-logbook'),
            viewDreamDetail: document.getElementById('view-dream-detail'),
            
            // Navigation
            navNewDream: document.getElementById('nav-new-dream'),
            navLogbook: document.getElementById('nav-logbook'),
            
            // New Dream Form
            contextInput: document.getElementById('context-input'),
            dreamInput: document.getElementById('dream-input'),
            recordBtn: document.getElementById('record-btn'),
            saveDreamBtn: document.getElementById('save-dream-btn'),
            
            // Logbook
            dreamsContainer: document.getElementById('dreams-container'),
            
            // Dream Detail
            dreamDetailDate: document.getElementById('dream-detail-date'),
            dreamDetailContext: document.getElementById('dream-detail-context'),
            dreamDetailText: document.getElementById('dream-detail-text'),
            backToLogbook: document.getElementById('back-to-logbook'),
            analysisResults: document.getElementById('analysis-results'),
            
            // Loading
            loadingOverlay: document.getElementById('loading-overlay')
        };
        
        this.initializeUI();
    }

    // UI initialisieren
    initializeUI() {
        try {
            // Prüfe ob alle wichtigen Elemente vorhanden sind
            const requiredElements = ['viewNewDream', 'viewLogbook', 'viewDreamDetail'];
            const missingElements = requiredElements.filter(key => !this.elements[key]);
            
            if (missingElements.length > 0) {
                console.error('Fehlende UI-Elemente:', missingElements);
                return false;
            }

            // Zeige initial das Logbuch
            this.showView('logbook');
            
            return true;
        } catch (error) {
            console.error('Fehler bei UI-Initialisierung:', error);
            return false;
        }
    }

    // View anzeigen
    showView(viewId) {
        try {
            // Verstecke alle Views
            Object.values(this.elements).forEach(element => {
                if (element && element.classList && element.classList.contains('view')) {
                    element.classList.remove('active');
                }
            });

            // Zeige gewünschte View
            let targetView;
            switch (viewId) {
                case 'new-dream':
                    targetView = this.elements.viewNewDream;
                    this.updateNavigation('nav-new-dream');
                    break;
                case 'logbook':
                    targetView = this.elements.viewLogbook;
                    this.updateNavigation('nav-logbook');
                    this.renderLogbook();
                    break;
                case 'dream-detail':
                    targetView = this.elements.viewDreamDetail;
                    this.updateNavigation(null); // Keine Navigation für Detail-View
                    break;
                default:
                    console.warn('Unbekannte View:', viewId);
                    return false;
            }

            if (targetView) {
                targetView.classList.add('active');
                this.currentView = viewId;
                
                // Scroll nach oben
                window.scrollTo(0, 0);
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Fehler beim Anzeigen der View:', error);
            return false;
        }
    }

    // Navigation aktualisieren
    updateNavigation(activeNavId) {
        try {
            // Entferne active-Klasse von allen Nav-Buttons
            [this.elements.navNewDream, this.elements.navLogbook].forEach(btn => {
                if (btn) btn.classList.remove('active');
            });

            // Setze active-Klasse für gewählten Button
            if (activeNavId && this.elements[activeNavId]) {
                this.elements[activeNavId].classList.add('active');
            }
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Navigation:', error);
        }
    }

    // Logbuch rendern
    renderLogbook() {
        try {
            if (!this.elements.dreamsContainer) {
                console.error('Dreams-Container nicht gefunden');
                return false;
            }

            // Lade Träume aus Storage
            const dreams = dreamStorage.getDreams();
            
            // Leere Container
            this.elements.dreamsContainer.innerHTML = '';

            if (dreams.length === 0) {
                this.renderEmptyState();
                return true;
            }

            // Erstelle Dream-Cards
            dreams.forEach(dream => {
                const dreamCard = this.createDreamCard(dream);
                this.elements.dreamsContainer.appendChild(dreamCard);
            });

            return true;
        } catch (error) {
            console.error('Fehler beim Rendern des Logbuchs:', error);
            return false;
        }
    }

    // Leeren Zustand rendern
    renderEmptyState() {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <div class="empty-state-icon">🌙</div>
            <h3>Noch keine Träume gespeichert</h3>
            <p>Beginne deine Traumreise, indem du deinen ersten Traum aufzeichnest.</p>
        `;
        
        this.elements.dreamsContainer.appendChild(emptyState);
    }

    // Dream-Card erstellen
    createDreamCard(dream) {
        const card = document.createElement('div');
        card.className = 'dream-card';
        card.dataset.dreamId = dream.id;
        
        // Formatiere Datum
        const date = new Date(dream.date);
        const formattedDate = date.toLocaleDateString('de-DE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Kürze Text für Vorschau
        const previewText = dream.text.length > 150 ? 
            dream.text.substring(0, 150) + '...' : 
            dream.text;
        
        // Anzahl Analysen
        const analysisCount = Object.keys(dream.analyses || {}).length;
        const analysisText = analysisCount > 0 ? 
            `${analysisCount} Analyse${analysisCount !== 1 ? 'n' : ''}` : 
            'Noch nicht analysiert';

        card.innerHTML = `
            <div class="dream-card-date">${formattedDate}</div>
            <div class="dream-card-preview">${previewText}</div>
            ${dream.context ? `<div class="dream-card-context">Stimmung: ${dream.context}</div>` : ''}
            <div class="dream-card-meta">
                <small>${analysisText}</small>
            </div>
        `;

        // Click-Handler für Navigation zur Detail-View
        card.addEventListener('click', () => {
            this.showDreamDetail(dream.id);
        });

        // Keyboard-Navigation
        card.setAttribute('tabindex', '0');
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.showDreamDetail(dream.id);
            }
        });

        return card;
    }

    // Dream-Detail anzeigen
    showDreamDetail(dreamId) {
        try {
            const dream = dreamStorage.getDreamById(dreamId);
            if (!dream) {
                console.error('Traum nicht gefunden:', dreamId);
                return false;
            }

            this.currentDream = dream;
            
            // Fülle Detail-View mit Daten
            this.renderDreamDetail(dream);
            
            // Zeige Detail-View
            this.showView('dream-detail');
            
            return true;
        } catch (error) {
            console.error('Fehler beim Anzeigen der Traum-Details:', error);
            return false;
        }
    }

    // Dream-Detail rendern
    renderDreamDetail(dream) {
        try {
            // Formatiere Datum
            const date = new Date(dream.date);
            const formattedDate = date.toLocaleDateString('de-DE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Fülle Elemente
            if (this.elements.dreamDetailDate) {
                this.elements.dreamDetailDate.textContent = formattedDate;
            }
            
            if (this.elements.dreamDetailContext) {
                this.elements.dreamDetailContext.textContent = dream.context || 'Keine Angabe';
            }
            
            if (this.elements.dreamDetailText) {
                this.elements.dreamDetailText.textContent = dream.text;
            }

            // Rendere bestehende Analysen
            this.renderAnalysisResults(dream.analyses || {});
            
            return true;
        } catch (error) {
            console.error('Fehler beim Rendern der Traum-Details:', error);
            return false;
        }
    }

    // Analyse-Ergebnisse rendern
    renderAnalysisResults(analyses) {
        try {
            if (!this.elements.analysisResults) {
                console.error('Analysis-Results-Container nicht gefunden');
                return false;
            }

            // Leere Container
            this.elements.analysisResults.innerHTML = '';

            // Rendere jede Analyse
            Object.entries(analyses).forEach(([type, analysis]) => {
                const resultElement = this.createAnalysisResult(type, analysis);
                this.elements.analysisResults.appendChild(resultElement);
            });

            return true;
        } catch (error) {
            console.error('Fehler beim Rendern der Analyse-Ergebnisse:', error);
            return false;
        }
    }

    // Einzelnes Analyse-Ergebnis erstellen
    createAnalysisResult(type, analysis) {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'analysis-result';
        resultDiv.dataset.analysisType = type;
        
        // Titel basierend auf Analyse-Typ
        const titles = {
            'jungian': '🧠 Jung\'sche Analyse',
            'freudian': '🔍 Freud\'sche Analyse',
            'sentiment': '😊 Sentiment-Analyse',
            'archetypes': '🎭 Archetypen-Analyse',
            'what_if': '🤔 Was wäre wenn?',
            'poem': '📝 Traum-Poesie'
        };
        
        const title = titles[type] || `Analyse (${type})`;
        
        // Formatiere Zeitstempel
        const timestamp = new Date(analysis.timestamp).toLocaleString('de-DE');
        
        resultDiv.innerHTML = `
            <div class="analysis-header">
                <h4>${title}</h4>
                <button class="btn btn-secondary btn-sm btn-copy-analysis" data-analysis-type="${type}" title="Text kopieren">📋</button>
                <button class="btn btn-delete-analysis" data-analysis-type="${type}" title="Diese Analyse löschen">🗑️</button>
            </div>
            <p class="analysis-text">${analysis.result}</p>
            <small class="analysis-timestamp">Erstellt am ${timestamp}</small>
        `;

        // Event-Listener für Lösch-Button hinzufügen
        const deleteBtn = resultDiv.querySelector('.btn-delete-analysis');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmDeleteAnalysis(type);
            });
        }

        const copyBtn = resultDiv.querySelector('.btn-copy-analysis');
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const text = analysis?.result || '';
                this.copyToClipboard(text, 'Analyse kopiert');
            });
        }

        return resultDiv;
    }

    // Analyse-Ergebnis anzeigen
    displayAnalysisResult(analysisType, result) {
        try {
            if (!this.currentDream) {
                console.error('Kein aktueller Traum für Analyse-Anzeige');
                return false;
            }

            // Speichere Analyse im Storage
            dreamStorage.saveAnalysis(this.currentDream.id, analysisType, result);
            
            // Aktualisiere aktuellen Traum
            this.currentDream = dreamStorage.getDreamById(this.currentDream.id);
            
            // Rendere Analyse-Ergebnisse neu
            this.renderAnalysisResults(this.currentDream.analyses || {});
            
            return true;
        } catch (error) {
            console.error('Fehler beim Anzeigen des Analyse-Ergebnisses:', error);
            return false;
        }
    }

    // Text in Zwischenablage kopieren (mit Fallback)
    async copyToClipboard(text, successMessage = 'Text kopiert') {
        try {
            if (!text) {
                this.showError('Kein Text zum Kopieren gefunden');
                return false;
            }
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.top = '-1000px';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                document.execCommand('copy');
                textarea.remove();
            }
            this.showSuccess(successMessage);
            return true;
        } catch (err) {
            console.error('Kopieren fehlgeschlagen:', err);
            this.showError('Konnte Text nicht kopieren');
            return false;
        }
    }

    // Loading-Zustand anzeigen
    showLoading(message = 'Analysiere Traum...') {
        try {
            if (this.elements.loadingOverlay) {
                const loadingText = this.elements.loadingOverlay.querySelector('p');
                if (loadingText) {
                    loadingText.textContent = message;
                }
                
                this.elements.loadingOverlay.classList.remove('hidden');
                this.isLoading = true;
            }
        } catch (error) {
            console.error('Fehler beim Anzeigen des Loading-Zustands:', error);
        }
    }

    // Loading-Zustand verstecken
    hideLoading() {
        try {
            if (this.elements.loadingOverlay) {
                this.elements.loadingOverlay.classList.add('hidden');
                this.isLoading = false;
            }
        } catch (error) {
            console.error('Fehler beim Verstecken des Loading-Zustands:', error);
        }
    }

    // Fehlermeldung anzeigen
    showError(message, duration = 5000) {
        try {
            // Erstelle Error-Toast
            const errorToast = document.createElement('div');
            errorToast.className = 'error-toast';
            errorToast.innerHTML = `
                <div class="error-content">
                    <span class="error-icon">⚠️</span>
                    <span class="error-message">${message}</span>
                    <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
            `;
            
            // Füge CSS-Styles hinzu falls nicht vorhanden
            if (!document.querySelector('#error-toast-styles')) {
                const style = document.createElement('style');
                style.id = 'error-toast-styles';
                style.textContent = `
                    .error-toast {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: var(--error);
                        color: white;
                        padding: var(--spacing-md);
                        border-radius: var(--border-radius);
                        box-shadow: var(--shadow-lg);
                        z-index: 1001;
                        animation: slideIn 0.3s ease-out;
                        max-width: 300px;
                    }
                    .error-content {
                        display: flex;
                        align-items: center;
                        gap: var(--spacing-sm);
                    }
                    .error-close {
                        background: none;
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-size: 1.2rem;
                        margin-left: auto;
                    }
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(errorToast);
            
            // Automatisch entfernen nach duration
            if (duration > 0) {
                setTimeout(() => {
                    if (errorToast.parentElement) {
                        errorToast.remove();
                    }
                }, duration);
            }
            
        } catch (error) {
            console.error('Fehler beim Anzeigen der Fehlermeldung:', error);
            // Fallback: Browser-Alert
            alert(message);
        }
    }

    // Erfolgs-Nachricht anzeigen
    showSuccess(message, duration = 3000) {
        try {
            // Ähnlich wie showError, aber mit Erfolgs-Styling
            const successToast = document.createElement('div');
            successToast.className = 'success-toast';
            successToast.innerHTML = `
                <div class="success-content">
                    <span class="success-icon">✅</span>
                    <span class="success-message">${message}</span>
                </div>
            `;

            // Füge CSS-Styles hinzu falls nicht vorhanden
            if (!document.querySelector('#success-toast-styles')) {
                const style = document.createElement('style');
                style.id = 'success-toast-styles';
                style.textContent = `
                    .success-toast {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: var(--success);
                        color: white;
                        padding: var(--spacing-md);
                        border-radius: var(--border-radius);
                        box-shadow: var(--shadow-lg);
                        z-index: 1001;
                        animation: slideIn 0.3s ease-out;
                        max-width: 300px;
                    }
                    .success-content {
                        display: flex;
                        align-items: center;
                        gap: var(--spacing-sm);
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(successToast);

            // Automatisch entfernen
            setTimeout(() => {
                if (successToast.parentElement) {
                    successToast.remove();
                }
            }, duration);

        } catch (error) {
            console.error('Fehler beim Anzeigen der Erfolgs-Nachricht:', error);
        }
    }

    // Warn-Nachricht anzeigen
    showWarning(message, duration = 4000) {
        try {
            const warningToast = document.createElement('div');
            warningToast.className = 'warning-toast';
            warningToast.innerHTML = `
                <div class="warning-content">
                    <span class="warning-icon">⚠️</span>
                    <span class="warning-message">${message}</span>
                </div>
            `;

            // Füge CSS-Styles hinzu falls nicht vorhanden
            if (!document.querySelector('#warning-toast-styles')) {
                const style = document.createElement('style');
                style.id = 'warning-toast-styles';
                style.textContent = `
                    .warning-toast {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: #ff9800;
                        color: white;
                        padding: var(--spacing-md);
                        border-radius: var(--border-radius);
                        box-shadow: var(--shadow-lg);
                        z-index: 1001;
                        animation: slideIn 0.3s ease-out;
                        max-width: 300px;
                    }
                    .warning-content {
                        display: flex;
                        align-items: center;
                        gap: var(--spacing-sm);
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(warningToast);

            // Automatisch entfernen
            setTimeout(() => {
                if (warningToast.parentElement) {
                    warningToast.remove();
                }
            }, duration);

        } catch (error) {
            console.error('Fehler beim Anzeigen der Warn-Nachricht:', error);
        }
    }

    // Form zurücksetzen
    resetNewDreamForm() {
        try {
            if (this.elements.dreamInput) {
                this.elements.dreamInput.value = '';
            }
            if (this.elements.contextInput) {
                this.elements.contextInput.value = 'Keine Angabe';
            }
        } catch (error) {
            console.error('Fehler beim Zurücksetzen des Formulars:', error);
        }
    }

    // Bestätigung für Analyse-Löschung
    confirmDeleteAnalysis(analysisType) {
        try {
            const titles = {
                'jungian': 'Jung\'sche Analyse',
                'freudian': 'Freud\'sche Analyse',
                'sentiment': 'Sentiment-Analyse',
                'archetypes': 'Archetypen-Analyse',
                'what_if': 'Was-wäre-wenn-Analyse',
                'poem': 'Traum-Poesie'
            };
            
            const title = titles[analysisType] || 'Analyse';
            
            if (confirm(`Möchtest du die ${title} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
                this.deleteAnalysis(analysisType);
            }
        } catch (error) {
            console.error('Fehler bei Analyse-Löschung-Bestätigung:', error);
        }
    }

    // Einzelne Analyse löschen
    deleteAnalysis(analysisType) {
        try {
            if (!this.currentDream) {
                this.showError('Kein Traum ausgewählt');
                return false;
            }

            // Lösche Analyse aus Storage
            dreamStorage.deleteAnalysis(this.currentDream.id, analysisType);
            
            // Aktualisiere aktuellen Traum
            this.currentDream = dreamStorage.getDreamById(this.currentDream.id);
            
            // Rendere Analyse-Ergebnisse neu
            this.renderAnalysisResults(this.currentDream.analyses || {});
            
            this.showSuccess('Analyse erfolgreich gelöscht');
            return true;
        } catch (error) {
            console.error('Fehler beim Löschen der Analyse:', error);
            this.showError('Fehler beim Löschen der Analyse: ' + error.message);
            return false;
        }
    }

    // Bestätigung für Löschung aller Analysen
    confirmDeleteAllAnalyses() {
        try {
            if (!this.currentDream) {
                this.showError('Kein Traum ausgewählt');
                return;
            }

            const analysisCount = Object.keys(this.currentDream.analyses || {}).length;
            
            if (analysisCount === 0) {
                this.showError('Keine Analysen zum Löschen vorhanden');
                return;
            }

            if (confirm(`Möchtest du wirklich alle ${analysisCount} Analysen dieses Traums löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
                this.deleteAllAnalyses();
            }
        } catch (error) {
            console.error('Fehler bei Alle-Analysen-Löschung-Bestätigung:', error);
        }
    }

    // Alle Analysen löschen
    deleteAllAnalyses() {
        try {
            if (!this.currentDream) {
                this.showError('Kein Traum ausgewählt');
                return false;
            }

            // Lösche alle Analysen aus Storage
            dreamStorage.deleteAllAnalyses(this.currentDream.id);
            
            // Aktualisiere aktuellen Traum
            this.currentDream = dreamStorage.getDreamById(this.currentDream.id);
            
            // Rendere Analyse-Ergebnisse neu
            this.renderAnalysisResults(this.currentDream.analyses || {});
            
            this.showSuccess('Alle Analysen erfolgreich gelöscht');
            return true;
        } catch (error) {
            console.error('Fehler beim Löschen aller Analysen:', error);
            this.showError('Fehler beim Löschen aller Analysen: ' + error.message);
            return false;
        }
    }

    // Bestätigung für Traum-Löschung
    confirmDeleteDream() {
        try {
            if (!this.currentDream) {
                this.showError('Kein Traum ausgewählt');
                return;
            }

            const dreamDate = new Date(this.currentDream.date).toLocaleDateString('de-DE');
            const analysisCount = Object.keys(this.currentDream.analyses || {}).length;
            
            let message = `Möchtest du den Traum vom ${dreamDate} wirklich löschen?`;
            if (analysisCount > 0) {
                message += `\n\nDieser Traum enthält ${analysisCount} Analyse${analysisCount !== 1 ? 'n' : ''}, die ebenfalls gelöscht werden.`;
            }
            message += '\n\nDiese Aktion kann nicht rückgängig gemacht werden.';

            if (confirm(message)) {
                this.deleteDream();
            }
        } catch (error) {
            console.error('Fehler bei Traum-Löschung-Bestätigung:', error);
        }
    }

    // Ganzen Traum löschen
    deleteDream() {
        try {
            if (!this.currentDream) {
                this.showError('Kein Traum ausgewählt');
                return false;
            }

            // Lösche Traum aus Storage
            dreamStorage.deleteDream(this.currentDream.id);
            
            // Zurück zum Logbuch
            this.showView('logbook');
            
            this.showSuccess('Traum erfolgreich gelöscht');
            return true;
        } catch (error) {
            console.error('Fehler beim Löschen des Traums:', error);
            this.showError('Fehler beim Löschen des Traums: ' + error.message);
            return false;
        }
    }

    // Aktuelle View abrufen
    getCurrentView() {
        return this.currentView;
    }

    // Aktuellen Traum abrufen
    getCurrentDream() {
        return this.currentDream;
    }

    // Loading-Status abrufen
    getLoadingStatus() {
        return this.isLoading;
    }
}

// Globale UI-Instanz
const dreamUI = new DreamUI();
