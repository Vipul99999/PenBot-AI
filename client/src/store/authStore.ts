import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role?: 'user' | 'admin';
  settings?: {
    defaultExportFormat: 'pdf' | 'docx' | 'markdown' | 'txt';
    ocrMode: 'fast' | 'balanced' | 'high_accuracy';
    documentTemplate: 'study_notes' | 'lab_report' | 'exam_revision' | 'formula_sheet' | 'qa_worksheet';
    maxPdfPages: number;
  };
}
interface AuthState {
  token: string | null;
  user: User | null;
  setUser: (user: User) => void;
  setAuth: (token: string | null | undefined, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setUser: (user) => set({ user }),
  setAuth: (token, user) => {
    set({ token: token || null, user });
  },
  logout: () => {
    set({ token: null, user: null });
  }
}));
