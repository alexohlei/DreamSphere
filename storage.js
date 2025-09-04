// Storage Module für DreamSphere PWA
// Verwaltet alle localStorage-Interaktionen

class DreamStorage {
    constructor() {
        this.STORAGE_KEY = 'dreamsphere_dreams';
        this.SETTINGS_KEY = 'dreamsphere_settings';
        this.VERSION_KEY = 'dreamsphere_version';
        this.CURRENT_VERSION = '1.0.0';
        
        this.initializeStorage();
    }

    // Initialisierung des Storage
    initializeStorage() {
        try {
            // Prüfe ob localStorage verfügbar ist
            if (!this.isLocalStorageAvailable()) {
                console.warn('localStorage ist nicht verfügbar');
                return false;
            }

            // Versionsprüfung und Migration
            this.checkVersion();
            
            // Initialisiere leeres Array falls keine Träume vorhanden
            if (!localStorage.getItem(this.STORAGE_KEY)) {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
            }

            // Initialisiere Standard-Einstellungen
            if (!localStorage.getItem(this.SETTINGS_KEY)) {
                const defaultSettings = {
                    theme: 'dark',
                    language: 'de',
                    notifications: true,
                    voiceRecognition: true,
                    autoSave: true
                };
                localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(defaultSettings));
            }

            return true;
        } catch (error) {
            console.error('Fehler bei Storage-Initialisierung:', error);
            return false;
        }
    }

    // Prüfe localStorage-Verfügbarkeit
    isLocalStorageAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Versionsprüfung und Migration
    checkVersion() {
        const storedVersion = localStorage.getItem(this.VERSION_KEY);
        
        if (!storedVersion || storedVersion !== this.CURRENT_VERSION) {
            console.log('Führe Datenmigration durch...');
            this.migrateData(storedVersion, this.CURRENT_VERSION);
            localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
        }
    }

    // Datenmigration zwischen Versionen
    migrateData(fromVersion, toVersion) {
        try {
            // Hier können zukünftige Migrationen implementiert werden
            console.log(`Migration von ${fromVersion || 'unbekannt'} zu ${toVersion}`);
            
            // Beispiel: Alte Datenstruktur aktualisieren
            const dreams = this.getDreams();
            let migrated = false;

            dreams.forEach(dream => {
                // Füge fehlende Felder hinzu
                if (!dream.version) {
                    dream.version = toVersion;
                    migrated = true;
                }
                if (!dream.tags) {
                    dream.tags = [];
                    migrated = true;
                }
                if (!dream.analyses) {
                    dream.analyses = {};
                    migrated = true;
                }
            });

            if (migrated) {
                this.saveDreamsArray(dreams);
                console.log('Datenmigration abgeschlossen');
            }
        } catch (error) {
            console.error('Fehler bei Datenmigration:', error);
        }
    }

    // Alle Träume abrufen
    getDreams() {
        try {
            const dreamsJson = localStorage.getItem(this.STORAGE_KEY);
            if (!dreamsJson) {
                return [];
            }
            
            const dreams = JSON.parse(dreamsJson);
            
            // Sortiere nach Datum (neueste zuerst)
            return dreams.sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (error) {
            console.error('Fehler beim Laden der Träume:', error);
            return [];
        }
    }

    // Einzelnen Traum nach ID abrufen
    getDreamById(id) {
        try {
            const dreams = this.getDreams();
            return dreams.find(dream => dream.id === id) || null;
        } catch (error) {
            console.error('Fehler beim Laden des Traums:', error);
            return null;
        }
    }

    // Neuen Traum speichern
    saveDream(dreamData) {
        try {
            // Validierung der Traumdaten
            if (!dreamData.text || dreamData.text.trim() === '') {
                throw new Error('Traumtext ist erforderlich');
            }

            // Erstelle Traum-Objekt
            const dream = {
                id: dreamData.id || Date.now(),
                date: dreamData.date || new Date().toISOString(),
                text: dreamData.text.trim(),
                context: dreamData.context ? dreamData.context.trim() : '',
                tags: dreamData.tags || [],
                analyses: dreamData.analyses || {},
                version: this.CURRENT_VERSION,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Lade bestehende Träume
            const dreams = this.getDreams();
            
            // Prüfe ob Traum bereits existiert (Update)
            const existingIndex = dreams.findIndex(d => d.id === dream.id);
            
            if (existingIndex >= 0) {
                // Update bestehenden Traum
                dreams[existingIndex] = { ...dreams[existingIndex], ...dream, updatedAt: new Date().toISOString() };
            } else {
                // Füge neuen Traum hinzu
                dreams.unshift(dream);
            }

            // Speichere aktualisierte Liste
            this.saveDreamsArray(dreams);
            
            console.log('Traum gespeichert:', dream.id);
            return dream;
        } catch (error) {
            console.error('Fehler beim Speichern des Traums:', error);
            throw error;
        }
    }

    // Traum löschen
    deleteDream(id) {
        try {
            const dreams = this.getDreams();
            const filteredDreams = dreams.filter(dream => dream.id !== id);
            
            if (dreams.length === filteredDreams.length) {
                throw new Error('Traum nicht gefunden');
            }
            
            this.saveDreamsArray(filteredDreams);
            console.log('Traum gelöscht:', id);
            return true;
        } catch (error) {
            console.error('Fehler beim Löschen des Traums:', error);
            throw error;
        }
    }

    // Analyse zu Traum hinzufügen
    saveAnalysis(dreamId, analysisType, analysisResult) {
        try {
            const dream = this.getDreamById(dreamId);
            if (!dream) {
                throw new Error('Traum nicht gefunden');
            }

            // Füge Analyse hinzu
            dream.analyses[analysisType] = {
                result: analysisResult,
                timestamp: new Date().toISOString()
            };

            // Speichere aktualisierten Traum
            return this.saveDream(dream);
        } catch (error) {
            console.error('Fehler beim Speichern der Analyse:', error);
            throw error;
        }
    }

    // Einzelne Analyse löschen
    deleteAnalysis(dreamId, analysisType) {
        try {
            const dream = this.getDreamById(dreamId);
            if (!dream) {
                throw new Error('Traum nicht gefunden');
            }

            if (!dream.analyses || !dream.analyses[analysisType]) {
                throw new Error('Analyse nicht gefunden');
            }

            // Entferne die spezifische Analyse
            delete dream.analyses[analysisType];

            // Speichere aktualisierten Traum
            const updatedDream = this.saveDream(dream);
            console.log(`Analyse ${analysisType} für Traum ${dreamId} gelöscht`);
            return updatedDream;
        } catch (error) {
            console.error('Fehler beim Löschen der Analyse:', error);
            throw error;
        }
    }

    // Alle Analysen eines Traums löschen
    deleteAllAnalyses(dreamId) {
        try {
            const dream = this.getDreamById(dreamId);
            if (!dream) {
                throw new Error('Traum nicht gefunden');
            }

            // Setze Analysen zurück
            dream.analyses = {};

            // Speichere aktualisierten Traum
            const updatedDream = this.saveDream(dream);
            console.log(`Alle Analysen für Traum ${dreamId} gelöscht`);
            return updatedDream;
        } catch (error) {
            console.error('Fehler beim Löschen aller Analysen:', error);
            throw error;
        }
    }

    // Träume-Array speichern (interne Funktion)
    saveDreamsArray(dreams) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dreams));
            return true;
        } catch (error) {
            console.error('Fehler beim Speichern der Träume-Liste:', error);
            throw error;
        }
    }

    // Einstellungen abrufen
    getSettings() {
        try {
            const settingsJson = localStorage.getItem(this.SETTINGS_KEY);
            return settingsJson ? JSON.parse(settingsJson) : {};
        } catch (error) {
            console.error('Fehler beim Laden der Einstellungen:', error);
            return {};
        }
    }

    // Einstellungen speichern
    saveSettings(settings) {
        try {
            const currentSettings = this.getSettings();
            const updatedSettings = { ...currentSettings, ...settings };
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updatedSettings));
            return updatedSettings;
        } catch (error) {
            console.error('Fehler beim Speichern der Einstellungen:', error);
            throw error;
        }
    }

    // Statistiken abrufen
    getStatistics() {
        try {
            const dreams = this.getDreams();
            
            return {
                totalDreams: dreams.length,
                totalAnalyses: dreams.reduce((sum, dream) => sum + Object.keys(dream.analyses || {}).length, 0),
                averageDreamLength: dreams.length > 0 ? 
                    Math.round(dreams.reduce((sum, dream) => sum + dream.text.length, 0) / dreams.length) : 0,
                oldestDream: dreams.length > 0 ? dreams[dreams.length - 1].date : null,
                newestDream: dreams.length > 0 ? dreams[0].date : null,
                dreamsThisMonth: dreams.filter(dream => {
                    const dreamDate = new Date(dream.date);
                    const now = new Date();
                    return dreamDate.getMonth() === now.getMonth() && 
                           dreamDate.getFullYear() === now.getFullYear();
                }).length
            };
        } catch (error) {
            console.error('Fehler beim Berechnen der Statistiken:', error);
            return {};
        }
    }

    // Daten exportieren
    exportData() {
        try {
            const data = {
                dreams: this.getDreams(),
                settings: this.getSettings(),
                version: this.CURRENT_VERSION,
                exportDate: new Date().toISOString()
            };
            
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Fehler beim Exportieren der Daten:', error);
            throw error;
        }
    }

    // Daten importieren
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (!data.dreams || !Array.isArray(data.dreams)) {
                throw new Error('Ungültiges Datenformat');
            }

            // Backup der aktuellen Daten
            const backup = this.exportData();
            
            try {
                // Importiere Träume
                this.saveDreamsArray(data.dreams);
                
                // Importiere Einstellungen falls vorhanden
                if (data.settings) {
                    this.saveSettings(data.settings);
                }
                
                console.log('Daten erfolgreich importiert');
                return true;
            } catch (importError) {
                // Stelle Backup wieder her bei Fehler
                const backupData = JSON.parse(backup);
                this.saveDreamsArray(backupData.dreams);
                this.saveSettings(backupData.settings);
                throw importError;
            }
        } catch (error) {
            console.error('Fehler beim Importieren der Daten:', error);
            throw error;
        }
    }

    // Alle Daten löschen
    clearAllData() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            localStorage.removeItem(this.SETTINGS_KEY);
            localStorage.removeItem(this.VERSION_KEY);
            
            // Neu initialisieren
            this.initializeStorage();
            
            console.log('Alle Daten gelöscht');
            return true;
        } catch (error) {
            console.error('Fehler beim Löschen der Daten:', error);
            throw error;
        }
    }
}

// Globale Storage-Instanz
const dreamStorage = new DreamStorage();

