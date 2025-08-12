import { create } from 'zustand';
import { API_CONFIG } from '../../../config/api';
import type { 
  TemplateWithPreferences, 
  TemplatePreference,
  TemplateDropdownItem 
} from '../types/template';
import type { 
  BaseStoreState, 
  BaseStoreActions 
} from '../../../types';

// ===========================================
// ストア状態の型定義
// ===========================================

/**
 * テンプレートストアの状態型定義
 */
export interface TemplateStoreState extends BaseStoreState {
  // テンプレートデータ
  userTemplates: TemplateWithPreferences[];
  adminTemplates: TemplateWithPreferences[];
  dropdownTemplates: TemplateDropdownItem[];
  templatePreferences: TemplatePreference[];
  
  // 個別ローディング状態
  isLoadingDropdown: boolean;
  isLoadingPreferences: boolean;
  
  // UI状態
  isSaveModalOpen: boolean;
  isEditModalOpen: boolean;
  isOrderModalOpen: boolean;
  
  // 編集中のテンプレート
  editingTemplate: TemplateWithPreferences | null;
  
  // 未保存変更フラグ
  hasUnsavedChanges: boolean;
}

/**
 * テンプレートストアのアクション型定義
 */
export interface TemplateStoreActions extends BaseStoreActions {
  // データ設定アクション
  setUserTemplates: (templates: TemplateWithPreferences[]) => void;
  setAdminTemplates: (templates: TemplateWithPreferences[]) => void;
  setDropdownTemplates: (templates: TemplateDropdownItem[]) => void;
  setTemplatePreferences: (preferences: TemplatePreference[]) => void;
  
  // 個別ローディング状態
  setLoadingDropdown: (loading: boolean) => void;
  setLoadingPreferences: (loading: boolean) => void;
  
  // モーダル状態管理
  setSaveModalOpen: (open: boolean) => void;
  setEditModalOpen: (open: boolean) => void;
  setOrderModalOpen: (open: boolean) => void;
  
  // 編集状態管理
  setEditingTemplate: (template: TemplateWithPreferences | null) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  
  // 非同期アクション
  fetchUserTemplates: () => Promise<void>;
  fetchAdminTemplates: () => Promise<void>;
  fetchDropdownTemplates: () => Promise<void>;
  fetchTemplatePreferences: () => Promise<void>;
  
  // CRUD操作
  saveTemplate: (template: Omit<TemplateWithPreferences, 'template_id' | 'created_at'>) => Promise<void>;
  updateTemplate: (templateId: string, updates: Partial<TemplateWithPreferences>) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  
  // テンプレート設定操作
  updateTemplatePreferences: (preferences: TemplatePreference[]) => Promise<void>;
  
  // 便利なアクション
  openEditModal: (template: TemplateWithPreferences) => void;
  closeAllModals: () => void;
  initializeStore: () => Promise<void>;
}

/**
 * 完全なテンプレートストア型定義
 */
export type TemplateStore = TemplateStoreState & TemplateStoreActions;

// ===========================================
// 初期状態
// ===========================================

const initialState: TemplateStoreState = {
  // BaseStoreState
  isLoading: false,
  error: null,
  isInitialized: false,
  
  // テンプレートデータ
  userTemplates: [],
  adminTemplates: [],
  dropdownTemplates: [],
  templatePreferences: [],
  
  // 個別ローディング状態
  isLoadingDropdown: false,
  isLoadingPreferences: false,
  
  // UI状態
  isSaveModalOpen: false,
  isEditModalOpen: false,
  isOrderModalOpen: false,
  
  // 編集状態
  editingTemplate: null,
  hasUnsavedChanges: false,
};

// ===========================================
// API通信ヘルパー
// ===========================================

const DEFAULT_API_BASE_URL = API_CONFIG.BASE_URL;

/**
 * 認証付きfetch処理
 */
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const fullUrl = `${DEFAULT_API_BASE_URL}${endpoint}`;
  
  const response = await fetch(fullUrl, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || errorData.detail || `API Error: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

// ===========================================
// ストアファクトリー関数
// ===========================================

/**
 * テンプレートストアを作成
 * テスト用にファクトリー関数として提供
 */
export const createTemplateStore = () => create<TemplateStore>((set, get) => ({
  ...initialState,

  // ===========================================
  // 基本アクション
  // ===========================================

  reset: () => set(initialState),

  clearError: () => set({ error: null }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setError: (error: string | null) => set({ error, isLoading: false }),

  // ===========================================
  // データ設定アクション
  // ===========================================

  setUserTemplates: (userTemplates) => set({ userTemplates }),

  setAdminTemplates: (adminTemplates) => set({ adminTemplates }),

  setDropdownTemplates: (dropdownTemplates) => set({ dropdownTemplates }),

  setTemplatePreferences: (templatePreferences) => set({ templatePreferences }),

  // ===========================================
  // ローディング状態管理
  // ===========================================

  setLoadingDropdown: (isLoadingDropdown) => set({ isLoadingDropdown }),

  setLoadingPreferences: (isLoadingPreferences) => set({ isLoadingPreferences }),

  // ===========================================
  // モーダル状態管理
  // ===========================================

  setSaveModalOpen: (isSaveModalOpen) => set({ isSaveModalOpen }),

  setEditModalOpen: (isEditModalOpen) => set({ isEditModalOpen }),

  setOrderModalOpen: (isOrderModalOpen) => set({ isOrderModalOpen }),

  closeAllModals: () => set({
    isSaveModalOpen: false,
    isEditModalOpen: false,
    isOrderModalOpen: false,
    editingTemplate: null,
  }),

  // ===========================================
  // 編集状態管理
  // ===========================================

  setEditingTemplate: (editingTemplate) => set({ editingTemplate }),

  setHasUnsavedChanges: (hasUnsavedChanges) => set({ hasUnsavedChanges }),

  openEditModal: (template) => set({
    editingTemplate: template,
    isEditModalOpen: true,
  }),

  // ===========================================
  // 非同期アクション - データ取得
  // ===========================================

  fetchUserTemplates: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetchWithAuth('/templates/user');
      const templates = Array.isArray(response) ? response : response.data || [];
      set({ userTemplates: templates, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch user templates',
        isLoading: false 
      });
    }
  },

  fetchAdminTemplates: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetchWithAuth('/templates/admin');
      const templates = Array.isArray(response) ? response : response.data || [];
      set({ adminTemplates: templates, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch admin templates',
        isLoading: false 
      });
    }
  },

  fetchDropdownTemplates: async () => {
    try {
      set({ isLoadingDropdown: true });
      const response = await fetchWithAuth('/templates/dropdown');
      const templates = Array.isArray(response) ? response : response.data || [];
      set({ dropdownTemplates: templates, isLoadingDropdown: false });
    } catch (error) {
      console.error('Failed to fetch dropdown templates:', error);
      // ドロップダウンのエラーは無視（ノンブロッキング）
      set({ isLoadingDropdown: false });
    }
  },

  fetchTemplatePreferences: async () => {
    try {
      set({ isLoadingPreferences: true });
      const response = await fetchWithAuth('/templates/template-preferences');
      const preferences = Array.isArray(response) ? response : response.data || [];
      set({ templatePreferences: preferences, isLoadingPreferences: false });
    } catch (error) {
      console.error('Failed to fetch template preferences:', error);
      set({ isLoadingPreferences: false });
    }
  },

  // ===========================================
  // 非同期アクション - CRUD操作
  // ===========================================

  saveTemplate: async (template) => {
    try {
      set({ isLoading: true, error: null });
      
      await fetchWithAuth('/templates', {
        method: 'POST',
        body: JSON.stringify(template),
      });

      // 成功時はテンプレートリストを再取得
      await get().fetchUserTemplates();
      await get().fetchAdminTemplates();
      
      set({ 
        isLoading: false,
        isSaveModalOpen: false,
        hasUnsavedChanges: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to save template',
        isLoading: false 
      });
    }
  },

  updateTemplate: async (templateId, updates) => {
    try {
      set({ isLoading: true, error: null });
      
      await fetchWithAuth(`/templates/${templateId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      // ローカル状態を更新
      const state = get();
      const updateList = (templates: TemplateWithPreferences[]) =>
        templates.map(t => t.template_id === templateId ? { ...t, ...updates } : t);

      set({
        userTemplates: updateList(state.userTemplates),
        adminTemplates: updateList(state.adminTemplates),
        editingTemplate: state.editingTemplate?.template_id === templateId 
          ? { ...state.editingTemplate, ...updates }
          : state.editingTemplate,
        isLoading: false,
        hasUnsavedChanges: false,
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update template',
        isLoading: false 
      });
    }
  },

  deleteTemplate: async (templateId) => {
    try {
      set({ isLoading: true, error: null });
      
      await fetchWithAuth(`/templates/${templateId}`, {
        method: 'DELETE',
      });

      // ローカル状態から削除
      const state = get();
      const filterList = (templates: TemplateWithPreferences[]) =>
        templates.filter(t => t.template_id !== templateId);

      set({
        userTemplates: filterList(state.userTemplates),
        adminTemplates: filterList(state.adminTemplates),
        isLoading: false,
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete template',
        isLoading: false 
      });
    }
  },

  updateTemplatePreferences: async (preferences) => {
    try {
      set({ isLoadingPreferences: true });
      
      await fetchWithAuth('/templates/template-preferences', {
        method: 'POST',
        body: JSON.stringify(preferences),
      });

      set({ 
        templatePreferences: preferences,
        isLoadingPreferences: false,
        hasUnsavedChanges: false,
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update preferences',
        isLoadingPreferences: false 
      });
    }
  },

  // ===========================================
  // 初期化
  // ===========================================

  initializeStore: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // 並行して全データを取得
      await Promise.all([
        get().fetchUserTemplates(),
        get().fetchAdminTemplates(),
        get().fetchDropdownTemplates(),
        get().fetchTemplatePreferences(),
      ]);

      set({ isInitialized: true, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to initialize store',
        isLoading: false 
      });
    }
  },
}));

// ===========================================
// デフォルトストアインスタンス
// ===========================================

/**
 * デフォルトのテンプレートストア
 */
export const useTemplateStore = createTemplateStore();
