import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ALL_QUIZZES, CATEGORIES } from './constants';
import { StorageService } from './services/storageService';
import { UserAnswers, FlaggedQuestions, SessionState, Question } from './types';
import { Modal } from './components/Modal';
import { Sidebar } from './components/Sidebar';

// Icons - Sizes adjusted for compactness
const SunIcon = ({ className }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const MoonIcon = ({ className }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const ChevronDown = ({ className }: { className?: string }) => <svg className={`w-5 h-5 md:w-6 md:h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>;

type ViewState = 'home' | 'quiz' | 'results';

export function App() {
  // Global State
  const [darkMode, setDarkMode] = useState(false);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [flagged, setFlagged] = useState<FlaggedQuestions>({});

  // Session State
  const [view, setView] = useState<ViewState>('home');
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null);
  const [questionIndices, setQuestionIndices] = useState<number[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<{ [index: number]: string }>({});
  const [shuffledOptions, setShuffledOptions] = useState<{ [index: number]: string[] }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  // UI State
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['cat-anno1', 'cat-anno2']);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    desc: string;
    action: () => void;
    destructive?: boolean;
    confirmText?: string;
  }>({ isOpen: false, title: '', desc: '', action: () => { } });

  // Init
  useEffect(() => {
    // Theme
    const storedTheme = localStorage.getItem('medquiz_theme');
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (storedTheme === 'dark' || (!storedTheme && systemDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // Load Data
    const savedAnswers = StorageService.loadAnswers();
    const savedFlagged = StorageService.loadFlagged();
    setUserAnswers(savedAnswers);
    setFlagged(savedFlagged);

    // Force Title Update
    document.title = "Quiz Medicina";

    // Load Session
    const session = StorageService.loadSession();
    if (session && session.quizId && ALL_QUIZZES[session.quizId]) {
      setCurrentQuizId(session.quizId);
      setQuestionIndices(session.questionIndices);
      setCurrentAttempt(session.currentAttempt);
      // Load shuffled options if available, otherwise fallback to default options (compatibility)
      setShuffledOptions(session.shuffledOptions || {});
      setIsSubmitted(session.submitted);
      setView(session.submitted ? 'results' : 'quiz');
    }

    setLoading(false);
  }, []);

  // Persistence Effects
  useEffect(() => {
    if (!loading) {
      if (view === 'quiz' || view === 'results') {
        StorageService.saveSession({
          quizId: currentQuizId,
          questionIndices,
          currentAttempt,
          shuffledOptions,
          submitted: isSubmitted,
          timestamp: Date.now()
        });
      } else {
        StorageService.clearSession();
      }
    }
  }, [loading, view, currentQuizId, questionIndices, currentAttempt, shuffledOptions, isSubmitted]);

  useEffect(() => {
    if (!loading) StorageService.saveAnswers(userAnswers);
  }, [userAnswers, loading]);

  useEffect(() => {
    if (!loading) StorageService.saveFlagged(flagged);
  }, [flagged, loading]);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('medquiz_theme', newMode ? 'dark' : 'light');
  };

  const getStorageKey = (quizId: string, idx: number) => `${quizId}-${idx}`;

  const getQuizStats = (quizId: string) => {
    const questions = ALL_QUIZZES[quizId] || [];
    const total = questions.length;
    if (total === 0) return { percent: 0, correct: 0, total: 0 };

    let correct = 0;
    questions.forEach((q, idx) => {
      const key = getStorageKey(quizId, idx);
      if (userAnswers[key] === q.answer) correct++;
    });
    return {
      percent: Math.round((correct / total) * 100),
      correct,
      total
    };
  };

  const handleStartQuiz = (quizId: string) => {
    // Check for unfinished attempt
    if (currentQuizId === quizId && questionIndices.length > 0 && !isSubmitted && view === 'home') {
      setView('quiz');
      return;
    }

    const questions = ALL_QUIZZES[quizId];
    // Filter questions not yet answered correctly in global history
    let pool = questions.map((_, i) => i).filter(i => {
      const key = getStorageKey(quizId, i);
      return userAnswers[key] !== questions[i].answer;
    });

    if (pool.length === 0) {
      setModalConfig({
        isOpen: true,
        title: 'Tutto Completato!',
        desc: 'Hai completato tutte le domande di questo quiz. Vuoi resettare i progressi?',
        confirmText: 'Resetta',
        action: () => {
          StorageService.resetQuiz(quizId);
          // Reload local state for UI update
          setUserAnswers(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => { if (k.startsWith(quizId)) delete next[k]; });
            return next;
          });
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }

    // Shuffle pool for session selection
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const sessionIndices = pool.slice(0, 30);

    // Pre-shuffle options for these specific questions so they don't jump around during re-renders
    const newShuffledOptions: { [index: number]: string[] } = {};
    sessionIndices.forEach(idx => {
      const q = questions[idx];
      if (q.options) {
        const opts = [...q.options];
        // Fisher-Yates shuffle for options
        for (let i = opts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [opts[i], opts[j]] = [opts[j], opts[i]];
        }
        newShuffledOptions[idx] = opts;
      }
    });

    setCurrentQuizId(quizId);
    setQuestionIndices(sessionIndices);
    setShuffledOptions(newShuffledOptions);
    setCurrentAttempt({});
    setIsSubmitted(false);
    setView('quiz');
    window.scrollTo(0, 0);
  };

  const handleOptionSelect = (qIndex: number, option: string) => {
    if (isSubmitted) return;
    setCurrentAttempt(prev => ({ ...prev, [qIndex]: option }));
  };

  const handleInput = (qIndex: number, val: string) => {
    if (isSubmitted) return;
    setCurrentAttempt(prev => ({ ...prev, [qIndex]: val }));
  };

  const toggleFlag = (qIndex: number) => {
    if (!currentQuizId || isSubmitted) return;
    const key = getStorageKey(currentQuizId, qIndex);
    setFlagged(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  const handleSubmit = () => {
    const answeredCount = Object.keys(currentAttempt).length;
    const total = questionIndices.length;

    const finalize = () => {
      setIsSubmitted(true);
      setModalConfig(prev => ({ ...prev, isOpen: false }));

      // Update Global History
      const newAnswers = { ...userAnswers };
      questionIndices.forEach(qIndex => {
        const attempt = currentAttempt[qIndex];
        const qData = ALL_QUIZZES[currentQuizId!][qIndex];
        let correct = false;

        if (qData.type === 'text_input') {
          if (attempt && attempt.toLowerCase().replace(/\s/g, '') === qData.answer.toLowerCase().replace(/\s/g, '')) correct = true;
        } else {
          if (attempt === qData.answer) correct = true;
        }

        if (correct) {
          newAnswers[getStorageKey(currentQuizId!, qIndex)] = qData.answer;
        }
      });
      setUserAnswers(newAnswers);
      window.scrollTo(0, 0);
      setView('results');
    };

    if (answeredCount < total) {
      setModalConfig({
        isOpen: true,
        title: 'Quiz Incompleto',
        desc: `Hai risposto a ${answeredCount} su ${total}. Inviare comunque?`,
        confirmText: 'Invia',
        action: finalize
      });
    } else {
      setModalConfig({
        isOpen: true,
        title: 'Conferma',
        desc: 'Inviare le risposte?',
        confirmText: 'Sì, Invia',
        action: finalize
      });
    }
  };

  const handleReturnHome = () => {
    if (!isSubmitted && Object.keys(currentAttempt).length > 0 && view === 'quiz') {
      setModalConfig({
        isOpen: true,
        title: 'Torna alla Home',
        desc: 'La sessione verrà salvata e potrai riprenderla dopo.',
        confirmText: 'Ok',
        action: () => {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          setView('home');
        }
      });
    } else {
      setView('home');
      // Clean session if we are leaving from results or empty quiz
      if (isSubmitted || Object.keys(currentAttempt).length === 0) {
        setCurrentQuizId(null);
        setQuestionIndices([]);
        setShuffledOptions({});
        setCurrentAttempt({});
        setIsSubmitted(false);
        StorageService.clearSession();
      }
    }
  };

  // Render Helpers
  const currentQuizTitle = currentQuizId ? CATEGORIES.flatMap(c => c.quizzes).find(q => q.id === currentQuizId)?.title : '';

  const calculateScore = () => {
    if (!currentQuizId) return 0;
    let score = 0;
    questionIndices.forEach(qIndex => {
      const attempt = currentAttempt[qIndex];
      const qData = ALL_QUIZZES[currentQuizId!][qIndex];
      if (qData.type === 'text_input') {
        if (attempt && attempt.toLowerCase().replace(/\s/g, '') === qData.answer.toLowerCase().replace(/\s/g, '')) score++;
      } else {
        if (attempt === qData.answer) score++;
      }
    });
    return score;
  };

  const score = calculateScore();
  const total = questionIndices.length;

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen flex flex-col items-center pb-20">

      {/* Unified Header */}
      <div className="fixed top-0 left-0 right-0 p-3 md:p-6 z-40 flex items-center justify-between pointer-events-none">

        {/* Left Actions */}
        <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
          {view !== 'home' && (
            <button onClick={handleReturnHome} className="p-2 md:p-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-all">
              <svg className="w-6 h-6 md:w-7 md:h-7 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </button>
          )}
          <button onClick={toggleTheme} className="p-2 md:p-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-all group">
            {darkMode ? (
              <MoonIcon className="w-6 h-6 md:w-7 md:h-7 text-gray-300 transition-transform hover:-rotate-12" />
            ) : (
              <SunIcon className="w-6 h-6 md:w-7 md:h-7 text-yellow-500 transition-transform hover:rotate-12" />
            )}
          </button>
        </div>

        {/* Center Title - Visible on all screens now, adapted size */}
        {view !== 'home' && (
          <div className="absolute left-1/2 transform -translate-x-1/2 pointer-events-auto max-w-[120px] sm:max-w-xs md:max-w-lg transition-all duration-300">
            <h2 className="text-xs sm:text-sm md:text-xl font-bold text-gray-900 dark:text-white drop-shadow-sm bg-white/80 dark:bg-gray-900/80 px-4 py-2 rounded-full backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-sm truncate">
              {currentQuizTitle}
            </h2>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
          {view !== 'home' && (
            <>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md px-3 py-1.5 md:px-5 md:py-2.5 rounded-full text-xs md:text-base font-bold shadow-lg border border-gray-200 dark:border-gray-700 transition-all whitespace-nowrap">
                {(() => {
                  const stats = getQuizStats(currentQuizId!);
                  return `${stats.correct} / ${stats.total}`;
                })()}
              </div>
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 md:p-3 rounded-full bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/30 transition-all active:scale-95 hover:scale-105">
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* HOME SCREEN */}
      {view === 'home' && (
        <div className="w-full max-w-5xl px-4 pt-32 pb-12 flex flex-col items-center animate-fade-in min-h-screen justify-center">
          <div className="w-full space-y-6 md:space-y-8">
            {CATEGORIES.map(cat => {
              const isExpanded = expandedCategories.includes(cat.id);
              return (
                <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl shadow-xl dark:shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300">
                  <button
                    onClick={() => setExpandedCategories(prev => isExpanded ? prev.filter(id => id !== cat.id) : [...prev, cat.id])}
                    className="w-full flex justify-between items-center p-6 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-left group"
                  >
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{cat.title}</h3>
                    <ChevronDown className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} text-gray-400 w-6 h-6 md:w-8 md:h-8`} />
                  </button>

                  {isExpanded && (
                    <div className="p-6 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                        {cat.quizzes.map(quiz => {
                          const stats = getQuizStats(quiz.id);
                          const colorMap: { [key: string]: string } = {
                            amber: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 border-amber-500',
                            blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 border-blue-500',
                            purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 border-purple-500',
                            teal: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30 border-teal-500'
                          };
                          const barColorMap: { [key: string]: string } = { amber: 'bg-amber-500', blue: 'bg-blue-600', purple: 'bg-purple-600', teal: 'bg-teal-600' };
                          const hoverColorMap: { [key: string]: string } = {
                            amber: 'hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-[0_0_15px_rgba(245,158,11,0.5)] dark:hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]',
                            blue: 'hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] dark:hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]',
                            purple: 'hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] dark:hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]',
                            teal: 'hover:border-teal-500 dark:hover:border-teal-500 hover:shadow-[0_0_15px_rgba(20,184,166,0.5)] dark:hover:shadow-[0_0_15px_rgba(20,184,166,0.4)]'
                          };

                          return (
                            <button key={quiz.id} onClick={() => handleStartQuiz(quiz.id)} className={`group relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border-2 border-gray-200 dark:border-gray-700 transition-all duration-300 text-left hover:-translate-y-1 flex flex-col h-full ${hoverColorMap[quiz.color]}`}>
                              <div className="flex items-center gap-4 mb-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform ${colorMap[quiz.color].split(' ').slice(0, 3).join(' ')}`}>
                                  {quiz.icon}
                                </div>
                                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white leading-tight">{quiz.title}</h3>
                              </div>
                              <div className="mt-auto w-full">
                                <div className="flex justify-between text-xs md:text-sm font-semibold mb-1 md:mb-2 text-gray-500 dark:text-gray-400">
                                  <span>Progressi</span>
                                  <span className={stats.percent === 100 ? 'text-green-600 font-bold' : ''}>
                                    {stats.percent}% ({stats.correct}/{stats.total})
                                  </span>
                                </div>
                                <div className="h-2.5 md:h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div className={`h-full transition-all duration-500 ${stats.percent === 100 ? 'bg-green-500' : barColorMap[quiz.color]}`} style={{ width: `${stats.percent}%` }}></div>
                                </div>
                                <span className={`inline-flex items-center text-sm md:text-base font-bold group-hover:underline mt-4 ${colorMap[quiz.color].split(' ')[0]}`}>
                                  {currentQuizId === quiz.id && questionIndices.length > 0 ? 'Riprendi Quiz' : 'Inizia Quiz'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* QUIZ & RESULTS SCREEN */}
      {(view === 'quiz' || view === 'results') && currentQuizId && (
        <div className="w-full max-w-4xl px-4 py-8 mt-12 flex-1 flex flex-col relative animate-fade-in">

          {/* Results Summary */}
          {view === 'results' && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(0,0,0,0.3)] p-5 md:p-8 text-center mb-6 md:mb-8 border border-gray-400 dark:border-gray-700">
              <div className="inline-block p-3 md:p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4 md:mb-6">
                <svg className="w-10 h-10 md:w-14 md:h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h2 className="text-xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-2 md:mb-3">Risultato Quiz</h2>
              <div className="text-3xl md:text-5xl font-black text-primary-600 dark:text-primary-400 my-4 md:my-6 tracking-tight">{Math.round((score / total) * 100)}%</div>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 mb-6 md:mb-8">Risultato: {score} su {total}</p>
              <div className="flex justify-center gap-4 md:gap-6 flex-wrap">
                <button onClick={() => handleStartQuiz(currentQuizId!)} className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 px-5 md:py-3 md:px-8 rounded-xl text-sm md:text-lg transition-colors shadow-md">Nuovo Tentativo</button>
                <button onClick={() => handleReturnHome()} className="bg-white dark:bg-gray-700 border-2 border-gray-400 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 font-semibold py-2.5 px-5 md:py-3 md:px-8 rounded-xl text-sm md:text-lg transition-colors">Torna alla Home</button>
              </div>
            </div>
          )}

          {/* Questions List */}
          <div className="space-y-6 md:space-y-8 pt-4 md:pt-6">
            {questionIndices.map((qIndex, displayIndex) => {
              const qData = ALL_QUIZZES[currentQuizId!][qIndex];
              const key = getStorageKey(currentQuizId!, qIndex);
              const isFlagged = flagged[key];
              const attempt = currentAttempt[qIndex];

              const currentOptions = shuffledOptions[qIndex] || qData.options || [];

              // Determine card style based on state
              let borderColor = 'border-gray-400 dark:border-gray-700';
              if (view === 'results') {
                const correct = qData.answer;
                const isCorrect = qData.type === 'text_input'
                  ? attempt?.toLowerCase().replace(/\s/g, '') === correct.toLowerCase().replace(/\s/g, '')
                  : attempt === correct;
                borderColor = isCorrect ? 'border-green-500 border-2' : 'border-red-500 border-2';
              }

              return (
                <div key={qIndex} id={`q-${qIndex}`} className={`bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl shadow-lg border ${borderColor} p-5 md:p-8 relative transition-all duration-300`}>
                  <div className="flex justify-between items-start mb-6 md:mb-8 gap-4 md:gap-6">
                    <h3 className="text-lg md:text-2xl font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                      <span className="text-primary-600 dark:text-primary-400 font-bold mr-2">{displayIndex + 1}.</span> {qData.question}
                    </h3>
                    <button
                      onClick={() => toggleFlag(qIndex)}
                      disabled={isSubmitted}
                      title={isFlagged ? "Rimuovi segnalazione" : "Segnala domanda"}
                      className={`flex-shrink-0 p-2 md:p-3 rounded-full transition-all duration-200 transform active:scale-90 ${isFlagged
                          ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 ring-2 ring-yellow-200 dark:ring-yellow-800'
                          : isSubmitted
                            ? 'text-gray-300 dark:text-gray-600 cursor-default'
                            : 'text-gray-400 hover:text-yellow-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm'
                        }`}
                    >
                      <svg className={`w-6 h-6 md:w-8 md:h-8 transition-transform duration-300 ${isFlagged ? 'fill-current scale-110' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isFlagged ? 0 : 2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-8a2 2 0 01-2-2h.5A2.5 2.5 0 004 8.5c.828 0 1.62-.2 2.25-.575C7.228 7.375 8.162 7 9 7c1.375 0 2.227.674 3.09 1.417.804.693 1.517 1.083 2.91 1.083 1.396 0 2.372-.65 3.085-1.428.618-.675 1.258-1.572 2.915-1.572v8c-1.33 0-2.316.59-3.085 1.428-.769.838-1.632 1.572-2.915 1.572-1.394 0-2.106-.39-2.91-1.083C11.227 15.674 10.375 15 9 15c-.838 0-1.772.375-2.75 1.075C5.62 16.575 4.828 17 4 17c-.552 0-1 .448-1 1v2" />
                        {isFlagged && <path d="M5 21V4h14l-4 6 4 6H5v5h-2z" fill="currentColor" />}
                        {!isFlagged && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 21V4h14l-4 6 4 6H5v5" />}
                      </svg>
                    </button>
                  </div>

                  {/* Options or Input */}
                  {qData.type === 'text_input' ? (
                    <div className="space-y-4 md:space-y-5 p-1 md:p-2">
                      {view === 'quiz' ? (
                        <input
                          type="text"
                          className="w-full p-3 md:p-4 rounded-xl md:rounded-2xl border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-primary-500 transition-colors text-base md:text-lg"
                          placeholder="La tua risposta..."
                          value={attempt || ''}
                          onChange={(e) => handleInput(qIndex, e.target.value)}
                        />
                      ) : (
                        <div className="p-3 md:p-6 bg-gray-50 dark:bg-gray-900 rounded-xl md:rounded-2xl border border-gray-300 dark:border-gray-600">
                          <p className="text-sm md:text-lg text-gray-500 mb-2 font-semibold">La tua risposta:</p>
                          <div className={`font-bold text-lg md:text-2xl ${attempt?.toLowerCase().replace(/\s/g, '') === qData.answer.toLowerCase().replace(/\s/g, '') ? 'text-green-600' : 'text-red-600'}`}>
                            {attempt || 'Nessuna risposta'}
                          </div>
                          <div className="mt-3 md:mt-4 text-sm md:text-lg text-gray-500 font-semibold border-t border-gray-200 dark:border-gray-700 pt-3 md:pt-4">
                            Risposta corretta: <span className="font-bold text-green-600 dark:text-green-400">{qData.answer}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 md:space-y-5">
                      {currentOptions.map((opt) => {
                        let btnClass = "w-full text-left p-3 md:p-5 rounded-xl md:rounded-2xl transition-all duration-200 flex items-center border-2 text-base md:text-lg ";
                        let dotClass = "w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-primary-600 transition-opacity ";

                        if (view === 'quiz') {
                          const isSelected = attempt === opt;
                          btnClass += isSelected
                            ? "ring-2 ring-primary-500 bg-primary-50 dark:bg-gray-700 border-primary-500"
                            : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700";
                          dotClass += isSelected ? "opacity-100" : "opacity-0";
                        } else {
                          // Results View
                          if (opt === qData.answer) {
                            btnClass += "bg-green-100 border-green-500 text-green-900 dark:bg-green-900/40 dark:border-green-500 dark:text-green-100 font-bold";
                          } else if (opt === attempt && opt !== qData.answer) {
                            btnClass += "bg-red-100 border-red-500 text-red-900 dark:bg-red-900/40 dark:border-red-500 dark:text-red-100 font-bold";
                          } else {
                            btnClass += "bg-white border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 opacity-60";
                          }
                          dotClass = "hidden"; // Hide dot in results
                        }

                        return (
                          <button
                            key={opt}
                            onClick={() => handleOptionSelect(qIndex, opt)}
                            disabled={view === 'results'}
                            className={btnClass}
                          >
                            {view === 'quiz' && (
                              <div className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-gray-300 dark:border-gray-500 mr-3 md:mr-5 flex items-center justify-center flex-shrink-0">
                                <div className={dotClass}></div>
                              </div>
                            )}
                            <span className="text-gray-700 dark:text-gray-200">{opt}</span>
                            {view === 'results' && opt === qData.answer && (
                              <svg className="w-5 h-5 md:w-7 md:h-7 text-green-600 dark:text-green-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            )}
                            {view === 'results' && opt === attempt && opt !== qData.answer && (
                              <svg className="w-5 h-5 md:w-7 md:h-7 text-red-600 dark:text-red-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {view === 'results' && !attempt && (
                    <div className="text-red-500 font-bold text-lg md:text-xl mt-4 text-right flex items-center justify-end gap-2">
                      <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Non risposto
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Button */}
          {view === 'quiz' && (
            <div className="mt-10 mb-8 text-center">
              <button
                onClick={handleSubmit}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-primary-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600 hover:bg-primary-700 hover:shadow-lg hover:-translate-y-1"
              >
                <span>Invia Risposte</span>
                <svg className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Utilities */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        questionIndices={questionIndices}
        attempts={currentAttempt}
        flagged={flagged}
        quizId={currentQuizId || ''}
        isSubmitted={isSubmitted}
        correctAnswers={questionIndices.map(i => ALL_QUIZZES[currentQuizId!]?.[i].answer)}
        currentIndex={0} // Not strictly tracked for scroll, we use anchor logic
        onNavigate={(idx) => {
          const el = document.getElementById(`q-${idx}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />

      <Modal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        description={modalConfig.desc}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.action}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        isDestructive={modalConfig.destructive}
      />

      {/* Scroll to Action Button (Floating) */}
      {(view === 'quiz' || view === 'results') && (
        <button
          onClick={() => {
            if (view === 'results') {
              // Scroll to top or new attempt
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              // Scroll to submit
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }
          }}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-12 h-12 md:w-16 md:h-16 bg-primary-600 text-white rounded-full shadow-2xl hover:bg-primary-700 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center z-30"
        >
          {view === 'results' ? (
            <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
          ) : (
            <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
          )}
        </button>
      )}

    </div>
  );
}