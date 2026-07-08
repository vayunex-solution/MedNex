import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
}

interface UiState {
  sidebarCollapsed: boolean;
  toasts: Toast[];
  commandPaletteOpen: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setCommandPaletteOpen: (v: boolean) => void;
}

let toastCounter = 0;

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  toasts: [],
  commandPaletteOpen: false,

  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  addToast: (toast) => {
    const id = `toast-${++toastCounter}`;
    const duration = toast.duration ?? 5000;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
}));

// Convenience helper usable outside components
export const toast = {
  success: (title: string, description?: string) =>
    useUiStore.getState().addToast({ type: 'success', title, description }),
  error: (title: string, description?: string) =>
    useUiStore.getState().addToast({ type: 'error', title, description }),
  warning: (title: string, description?: string) =>
    useUiStore.getState().addToast({ type: 'warning', title, description }),
  info: (title: string, description?: string) =>
    useUiStore.getState().addToast({ type: 'info', title, description }),
};
