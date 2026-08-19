import { create } from 'zustand';

type LayoutState = {
  isSidebarOpen: boolean;
  pageTitle: string;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  setPageTitle: (title: string) => void;
};

export const useLayoutStore = create<LayoutState>((set) => ({
  isSidebarOpen: false,
  pageTitle: '',
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),
  setPageTitle: (title) => set({ pageTitle: title }),
}));
