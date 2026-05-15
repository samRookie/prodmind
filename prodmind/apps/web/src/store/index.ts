import { create } from 'zustand';

interface AppState {
  isReady: boolean;
  setReady: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isReady: false,
  setReady: () => set({ isReady: true }),
}));
