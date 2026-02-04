import { UserAnswers, FlaggedQuestions, SessionState } from '../types';

const KEYS = {
  ANSWERS: 'medquiz_answers',
  FLAGGED: 'medquiz_flagged',
  SESSION: 'medquiz_session',
  THEME: 'medquiz_theme'
};

export const StorageService = {
  // Global Progress
  saveAnswers: (answers: UserAnswers) => {
    try {
      localStorage.setItem(KEYS.ANSWERS, JSON.stringify(answers));
    } catch (e) { console.error('Save failed', e); }
  },

  loadAnswers: (): UserAnswers => {
    try {
      const data = localStorage.getItem(KEYS.ANSWERS);
      return data ? JSON.parse(data) : {};
    } catch (e) { return {}; }
  },

  // Flagged Questions
  saveFlagged: (flagged: FlaggedQuestions) => {
    try {
      localStorage.setItem(KEYS.FLAGGED, JSON.stringify(flagged));
    } catch (e) { console.error('Save flagged failed', e); }
  },

  loadFlagged: (): FlaggedQuestions => {
    try {
      const data = localStorage.getItem(KEYS.FLAGGED);
      return data ? JSON.parse(data) : {};
    } catch (e) { return {}; }
  },

  // Active Session
  saveSession: (session: SessionState) => {
    try {
      localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
    } catch (e) { console.error('Save session failed', e); }
  },

  loadSession: (): SessionState | null => {
    try {
      const data = localStorage.getItem(KEYS.SESSION);
      return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
  },

  clearSession: () => {
    localStorage.removeItem(KEYS.SESSION);
  },

  // Clear All
  resetAll: () => {
    localStorage.removeItem(KEYS.ANSWERS);
    localStorage.removeItem(KEYS.FLAGGED);
    localStorage.removeItem(KEYS.SESSION);
  },

  resetQuiz: (quizId: string) => {
    const answers = StorageService.loadAnswers();
    const flagged = StorageService.loadFlagged();
    
    // Filter out keys starting with this quizId
    const newAnswers: UserAnswers = {};
    const newFlagged: FlaggedQuestions = {};

    Object.keys(answers).forEach(key => {
      if (!key.startsWith(`${quizId}-`)) newAnswers[key] = answers[key];
    });

    Object.keys(flagged).forEach(key => {
      if (!key.startsWith(`${quizId}-`)) newFlagged[key] = flagged[key];
    });

    StorageService.saveAnswers(newAnswers);
    StorageService.saveFlagged(newFlagged);
    StorageService.clearSession();
  }
};