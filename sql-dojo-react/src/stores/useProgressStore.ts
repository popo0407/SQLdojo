import { create } from 'zustand';

interface ProgressState {
  isVisible: boolean;
  totalCount?: number;
  currentCount?: number;
  progressPercentage?: number;
  message?: string;
}

interface ProgressActions {
  showProgress: (data: {
    totalCount?: number;
    currentCount?: number;
    progressPercentage?: number;
    message?: string;
  }) => void;
  updateProgress: (data: {
    currentCount?: number;
    progressPercentage?: number;
    message?: string;
  }) => void;
  hideProgress: () => void;
  resetProgress: () => void;
}

type ProgressStore = ProgressState & ProgressActions;

export const useProgressStore = create<ProgressStore>((set) => ({
  // 初期状態
  isVisible: false,
  totalCount: undefined,
  currentCount: undefined,
  progressPercentage: undefined,
  message: undefined,

  // アクション
  showProgress: (data) => {
    set((state) => ({
      ...state,
      isVisible: true,
      totalCount: data.totalCount,
      currentCount: data.currentCount,
      progressPercentage: data.progressPercentage,
      message: data.message,
    }));
  },

  updateProgress: (data) => {
    set((state) => ({
      ...state,
      currentCount: data.currentCount ?? state.currentCount,
      progressPercentage: data.progressPercentage ?? state.progressPercentage,
      message: data.message ?? state.message,
    }));
  },

  hideProgress: () => {
    set((state) => ({
      ...state,
      isVisible: false,
    }));
  },

  resetProgress: () => {
    set({
      isVisible: false,
      totalCount: undefined,
      currentCount: undefined,
      progressPercentage: undefined,
      message: undefined,
    });
  },
}));
