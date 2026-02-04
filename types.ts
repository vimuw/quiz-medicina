export type QuestionType = 'multiple_choice' | 'text_input';

export interface Question {
  question: string;
  options?: string[];
  answer: string;
  type?: QuestionType;
}

export interface QuizData {
  [key: string]: Question[];
}

export interface UserAnswers {
  [questionId: string]: string; // Key is "quizId-index", Value is answer
}

export interface FlaggedQuestions {
  [questionId: string]: boolean;
}

export interface SessionState {
  quizId: string | null;
  questionIndices: number[];
  currentAttempt: { [index: number]: string }; // Local index -> answer
  shuffledOptions: { [index: number]: string[] }; // Store shuffled order
  submitted: boolean;
  timestamp: number;
}

export interface CategoryInfo {
  id: string;
  title: string;
  quizzes: {
    id: string;
    title: string;
    icon: string;
    color: string; // Tailwind color name base (e.g., 'amber', 'blue')
  }[];
}