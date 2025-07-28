/* eslint-disable react-refresh/only-export-components */
import React, { useReducer, ReactNode, useCallback, useEffect, createContext, useContext } from 'react';
import type { Template, TemplateWithPreferences, TemplateState, TemplateAction } from '../types/template';
import { templateReducer, initialTemplateState } from './templateReducer';

/**
 * テンプレートコンテキストの値の型定義
 */
export interface TemplateContextValue {
  // 状態
  state: TemplateState;
  
  // 基本的な状態更新アクション
  dispatch: React.Dispatch<TemplateAction>;
  
  // 高レベルなアクション関数
  actions: {
    // データ読み込み
    loadUserTemplates: () => Promise<void>;
    loadAdminTemplates: () => Promise<void>;
    loadDropdownTemplates: () => Promise<void>;
    loadTemplatePreferences: () => Promise<void>;
    
    // テンプレート操作
    saveUserTemplate: (name: string, sql: string) => Promise<void>;
    updateUserTemplate: (template: Template) => Promise<void>;
    deleteUserTemplate: (templateId: string) => Promise<void>;
    saveAdminTemplate: (name: string, sql: string) => Promise<void>;
    updateAdminTemplate: (template: Template) => Promise<void>;
    deleteAdminTemplate: (templateId: string) => Promise<void>;
    
    // 設定操作
    updateTemplatePreferences: () => Promise<void>;
    moveTemplateUp: (templateId: string) => void;
    moveTemplateDown: (templateId: string) => void;
    toggleTemplateVisibility: (templateId: string, isVisible: boolean) => void;
    resetPreferences: () => Promise<void>;
    
    // モーダル操作
    openSaveModal: () => void;
    closeSaveModal: () => void;
    openEditModal: (template: Template) => void;
    closeEditModal: () => void;
    openOrderModal: () => void;
    closeOrderModal: () => void;
    
    // ユーティリティ
    clearError: () => void;
    setUnsavedChanges: (hasChanges: boolean) => void;
  };
}

/**
 * テンプレートコンテキスト
 */
export const TemplateContext = createContext<TemplateContextValue | undefined>(undefined);

/**
 * テンプレートコンテキストプロバイダーのprops
 */
interface TemplateProviderProps {
  children: ReactNode;
  apiBaseUrl?: string;
}

/**
 * API通信用のベースURL（デフォルト値）
 */
const DEFAULT_API_BASE_URL = '/api';

/**
 * テンプレートコンテキストプロバイダー
 * テンプレート関連の状態管理とAPI通信を提供
 */
export const TemplateProvider: React.FC<TemplateProviderProps> = ({ 
  children, 
  apiBaseUrl = DEFAULT_API_BASE_URL 
}) => {
  const [state, dispatch] = useReducer(templateReducer, initialTemplateState);

  /**
   * 共通のfetch処理
   */
  const fetchWithAuth = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      ...options,
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

    return response.json();
  }, [apiBaseUrl]);

  /**
   * ユーザーテンプレート一覧を読み込み
   */
  const loadUserTemplates = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const data = await fetchWithAuth('/templates');
      console.log('loadUserTemplates API response:', data);
      dispatch({ type: 'SET_USER_TEMPLATES', payload: data || [] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ユーザーテンプレートの読み込みに失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fetchWithAuth]);

  /**
   * 管理者テンプレート一覧を読み込み
   */
  const loadAdminTemplates = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const data = await fetchWithAuth('/admin/templates');
      dispatch({ type: 'SET_ADMIN_TEMPLATES', payload: data.templates || [] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '管理者テンプレートの読み込みに失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fetchWithAuth]);

  /**
   * ドロップダウン用テンプレート一覧を読み込み
   */
  const loadDropdownTemplates = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING_DROPDOWN', payload: true });
      const data = await fetchWithAuth('/users/templates-for-dropdown');
      dispatch({ type: 'SET_DROPDOWN_TEMPLATES', payload: data.templates || [] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'テンプレートの読み込みに失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING_DROPDOWN', payload: false });
    }
  }, [fetchWithAuth]);

  /**
   * テンプレート設定を読み込み
   */
  const loadTemplatePreferences = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING_PREFERENCES', payload: true });
      const data = await fetchWithAuth('/users/template-preferences');
      dispatch({ type: 'SET_TEMPLATE_PREFERENCES', payload: data.templates || [] });
      // 初期化フラグは初回のみ設定
      if (!state.isInitialized) {
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'テンプレート設定の読み込みに失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING_PREFERENCES', payload: false });
    }
  }, [fetchWithAuth, state.isInitialized]);

  /**
   * ユーザーテンプレートを保存
   */
  const saveUserTemplate = useCallback(async (name: string, sql: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const data = await fetchWithAuth('/users/templates', {
        method: 'POST',
        body: JSON.stringify({ name, sql }),
      });
      
      if (data.template) {
        dispatch({ type: 'ADD_USER_TEMPLATE', payload: data.template });
      }
      
      // テンプレート保存後、template-preferencesを再読み込み
      await loadTemplatePreferences();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'テンプレートの保存に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error; // コンポーネント側でエラーハンドリングできるように再throw
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fetchWithAuth, loadTemplatePreferences]);

  /**
   * ユーザーテンプレートを更新
   */
  const updateUserTemplate = useCallback(async (template: Template) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const data = await fetchWithAuth(`/users/templates/${template.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: template.name, sql: template.sql }),
      });
      
      if (data.template) {
        dispatch({ type: 'UPDATE_USER_TEMPLATE', payload: data.template });
      }
      
      // 設定データも更新
      await loadTemplatePreferences();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'テンプレートの更新に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fetchWithAuth, loadTemplatePreferences]);

  /**
   * ユーザーテンプレートを削除
   */
  const deleteUserTemplate = useCallback(async (templateId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await fetchWithAuth(`/users/templates/${templateId}`, {
        method: 'DELETE',
      });
      
      dispatch({ type: 'DELETE_USER_TEMPLATE', payload: templateId });
      
      // テンプレート削除後、template-preferencesを再読み込み
      await loadTemplatePreferences();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'テンプレートの削除に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fetchWithAuth, loadTemplatePreferences]);

  /**
   * 管理者テンプレートを保存
   */
  const saveAdminTemplate = useCallback(async (name: string, sql: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const data = await fetchWithAuth('/admin/templates', {
        method: 'POST',
        body: JSON.stringify({ name, sql }),
      });
      
      if (data.template) {
        dispatch({ type: 'ADD_ADMIN_TEMPLATE', payload: data.template });
      }
      
      // テンプレート保存後、管理者テンプレート一覧を再読み込み
      await loadAdminTemplates();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '管理者テンプレートの保存に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fetchWithAuth, loadAdminTemplates]);

  /**
   * 管理者テンプレートを更新
   */
  const updateAdminTemplate = useCallback(async (template: Template) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const data = await fetchWithAuth(`/admin/templates/${template.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: template.name, sql: template.sql }),
      });
      
      if (data.template) {
        dispatch({ type: 'UPDATE_ADMIN_TEMPLATE', payload: data.template });
      }
      
      // テンプレート更新後、管理者テンプレート一覧を再読み込み
      await loadAdminTemplates();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '管理者テンプレートの更新に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fetchWithAuth, loadAdminTemplates]);

  /**
   * 管理者テンプレートを削除
   */
  const deleteAdminTemplate = useCallback(async (templateId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await fetchWithAuth(`/admin/templates/${templateId}`, {
        method: 'DELETE',
      });
      
      dispatch({ type: 'DELETE_ADMIN_TEMPLATE', payload: templateId });
      
      // テンプレート削除後、管理者テンプレート一覧を再読み込み
      await loadAdminTemplates();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '管理者テンプレートの削除に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fetchWithAuth, loadAdminTemplates]);

  /**
   * テンプレート設定を更新
   */
  const updateTemplatePreferences = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING_PREFERENCES', payload: true });
      
      const preferences = state.templatePreferences.map(template => ({
        template_id: template.template_id,
        display_order: template.display_order,
        is_visible: template.is_visible,
      }));

      await fetchWithAuth('/users/template-preferences', {
        method: 'PUT',
        body: JSON.stringify({ preferences }),
      });
      
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false });
      
      // 設定は既にtemplatePreferencesに反映されているので、再読み込み不要
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'テンプレート設定の保存に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING_PREFERENCES', payload: false });
    }
  }, [fetchWithAuth, state.templatePreferences]);

  /**
   * 設定をリセット（最後に保存した状態に戻す）
   */
  const resetPreferences = useCallback(async () => {
    await loadTemplatePreferences();
  }, [loadTemplatePreferences]);

  // アクション関数をまとめたオブジェクト
  const actions = {
    // 初期化
    initializeTemplates: async () => {
      await Promise.all([
        loadUserTemplates(),
        loadAdminTemplates(),
        loadDropdownTemplates(),
        loadTemplatePreferences()
      ]);
      dispatch({ type: 'SET_INITIALIZED', payload: true });
    },
    
    // データ読み込み
    loadUserTemplates,
    loadAdminTemplates,
    loadDropdownTemplates,
    loadTemplatePreferences,
    
    // テンプレート操作
    saveUserTemplate,
    updateUserTemplate,
    deleteUserTemplate,
    saveAdminTemplate,
    updateAdminTemplate,
    deleteAdminTemplate,
    
    // 設定操作
    updateTemplatePreferences,
    moveTemplateUp: (templateId: string) => dispatch({ type: 'MOVE_TEMPLATE_UP', payload: templateId }),
    moveTemplateDown: (templateId: string) => dispatch({ type: 'MOVE_TEMPLATE_DOWN', payload: templateId }),
    toggleTemplateVisibility: (templateId: string, isVisible: boolean) => 
      dispatch({ type: 'TOGGLE_TEMPLATE_VISIBILITY', payload: { id: templateId, isVisible } }),
    resetPreferences,
    
    // モーダル操作
    openSaveModal: () => dispatch({ type: 'OPEN_SAVE_MODAL' }),
    closeSaveModal: () => dispatch({ type: 'CLOSE_SAVE_MODAL' }),
    openEditModal: (template: Template) => dispatch({ type: 'OPEN_EDIT_MODAL', payload: template }),
    closeEditModal: () => dispatch({ type: 'CLOSE_EDIT_MODAL' }),
    openOrderModal: () => dispatch({ type: 'OPEN_ORDER_MODAL' }),
    closeOrderModal: () => dispatch({ type: 'CLOSE_ORDER_MODAL' }),
    
    // ユーティリティ
    clearError: () => dispatch({ type: 'SET_ERROR', payload: null }),
    setUnsavedChanges: (hasChanges: boolean) => dispatch({ type: 'SET_UNSAVED_CHANGES', payload: hasChanges }),
    setTemplatePreferences: (preferences: TemplateWithPreferences[]) => 
      dispatch({ type: 'SET_TEMPLATE_PREFERENCES', payload: preferences }),
  };

  // 未保存変更の警告を設定
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '未保存の変更があります。ページを離れますか？';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [state.hasUnsavedChanges]);

  const contextValue: TemplateContextValue = {
    state,
    dispatch,
    actions,
  };

  return (
    <TemplateContext.Provider value={contextValue}>
      {children}
    </TemplateContext.Provider>
  );
};

/**
 * テンプレートコンテキストを使用するためのカスタムフック
 * @returns テンプレートコンテキストの値
 * @throws TemplateProvider外で使用された場合はエラー
 */
export const useTemplateContext = (): TemplateContextValue => {
  const context = useContext(TemplateContext);
  
  if (context === undefined) {
    throw new Error('useTemplateContext must be used within a TemplateProvider');
  }
  
  return context;
};
