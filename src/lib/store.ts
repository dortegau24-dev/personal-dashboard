/** Lightweight Zustand stores for client-side UI state */
import { create } from 'zustand';

type UIStore = {
  /** Refreshing flag for individual modules — triggers re-fetch */
  refreshKeys: Record<string, number>;
  bump: (key: string) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  refreshKeys: {},
  bump: (key) =>
    set((s) => ({
      refreshKeys: { ...s.refreshKeys, [key]: (s.refreshKeys[key] ?? 0) + 1 },
    })),
}));
