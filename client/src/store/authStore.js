import { create } from 'zustand';
export const useAuthStore = create((set) => ({
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
