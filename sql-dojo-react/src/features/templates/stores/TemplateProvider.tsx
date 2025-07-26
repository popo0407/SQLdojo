import React, { useReducer, useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Template, TemplateWithPreferences } from '../types/template';
import { templateReducer, initialTemplateState } from './templateReducer';
import { TemplateContext } from './templateContext';
import type { TemplateContextValue } from './templateContext';

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
const DEFAULT_API_BASE_URL = 'http://localhost:8001/api/v1';

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
    const fullUrl = `${apiBaseUrl}${endpoint}`;
    
    try {
      const response = await fetch(fullUrl, {
        ...options,
        credentials: 'include', // セッションCookieを含める
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || `API Error: ${response.statusText}`;
        console.error('API Error:', errorMessage, 'URL:', fullUrl, 'Status:', response.status);
        throw new Error(errorMessage);
      }

      // レスポンスが空の場合は空オブジェクトを返す
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } catch (error) {
      console.error('Network Error:', error, 'URL:', fullUrl);
      throw error;
    }
  }, [apiBaseUrl]);

  /**
   * ユーザーテンプレート一覧を読み込み
   */
  const loadUserTemplates = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const data = await fetchWithAuth('/users/templates');
      dispatch({ type: 'SET_USER_TEMPLATES', payload: data.templates || [] });
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
      
      // APIレスポンスが配列の場合はそのまま使用、オブジェクトの場合は.templatesを使用
      const templates = Array.isArray(data) ? data : (data.templates || []);
      dispatch({ type: 'SET_DROPDOWN_TEMPLATES', payload: templates });
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
      // 初期化フラグは常に設定（重複初期化の問題を回避）
      dispatch({ type: 'SET_INITIALIZED', payload: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'テンプレート設定の読み込みに失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING_PREFERENCES', payload: false });
    }
  }, [fetchWithAuth]);

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
  const updateUserTemplate = useCallback(async (template: TemplateWithPreferences) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      console.log('Template Update - ID:', template.template_id, 'Name:', template.name);
      
      const requestBody = { 
        name: template.name, 
        sql: template.sql,
        display_order: template.display_order
      };
      console.log('Update Request Body:', requestBody);
      
      // 編集時は現在の表示順序を保持するため、display_orderも送信
      const data = await fetchWithAuth(`/users/templates/${template.template_id}`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });
      
      if (data.template) {
        dispatch({ type: 'UPDATE_USER_TEMPLATE', payload: data.template });
      }
      
      // 設定データも更新
      await loadTemplatePreferences();
    } catch (error) {
      console.error('テンプレート更新エラー:', error);
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
   * テンプレート設定を更新
   */
  const updateTemplatePreferences = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING_PREFERENCES', payload: true });
      
      const preferences = state.templatePreferences.map(template => {
        // TemplateWithPreferencesの場合typeフィールドがある
        const templateType = 'type' in template ? (template as TemplateWithPreferences).type : 'user';
        
        return {
          template_id: template.template_id,
          template_type: templateType,
          display_order: template.display_order,
          is_visible: template.is_visible,
        };
      });

      await fetchWithAuth('/users/template-preferences', {
        method: 'PUT',
        body: JSON.stringify({ preferences }),
      });
      
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false });
      
      // 設定は既にtemplatePreferencesに反映されているので、再読み込み不要
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'テンプレート設定の保存に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING_PREFERENCES', payload: false });
    }
  }, [fetchWithAuth, state.templatePreferences]);

  /**
   * 初期化統一メソッド
   */
  const initializeTemplates = useCallback(async () => {
    if (!state.isInitialized) {
      await loadTemplatePreferences();
    }
  }, [loadTemplatePreferences, state.isInitialized]);

  /**
   * 設定をリセット（最後に保存した状態に戻す）
   */
  const resetPreferences = useCallback(async () => {
    await loadTemplatePreferences();
  }, [loadTemplatePreferences]);

  /**
   * テンプレート順序を変更
   */
  const reorderTemplate = useCallback(async (templateId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    try {
      dispatch({ type: 'SET_LOADING_PREFERENCES', payload: true });
      
      // 現在の設定を取得
      const currentPreferences = state.templatePreferences;
      
      // 対象テンプレートのインデックスを取得
      const currentIndex = currentPreferences.findIndex(t => t.template_id === templateId);
      if (currentIndex === -1) {
        throw new Error('テンプレートが見つかりません');
      }

      // 新しい順序を計算
      let newIndex: number;
      switch (direction) {
        case 'up':
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case 'down':
          newIndex = Math.min(currentPreferences.length - 1, currentIndex + 1);
          break;
        case 'top':
          newIndex = 0;
          break;
        case 'bottom':
          newIndex = currentPreferences.length - 1;
          break;
        default:
          throw new Error('不正な移動方向です');
      }

      // 順序変更
      const reorderedPreferences = [...currentPreferences];
      const [movedItem] = reorderedPreferences.splice(currentIndex, 1);
      reorderedPreferences.splice(newIndex, 0, movedItem);

      // display_orderを更新 - template_typeを必須で含める
      const updatedPreferences = reorderedPreferences.map((pref, index) => {
        // TemplateWithPreferencesの場合typeフィールドがある
        const templateType = 'type' in pref ? (pref as TemplateWithPreferences).type : 'user';
        
        return {
          template_id: pref.template_id,
          template_type: templateType,
          is_visible: pref.is_visible !== undefined ? pref.is_visible : true,
          display_order: index + 1
        };
      });

      // APIで更新
      await fetchWithAuth('/users/template-preferences', {
        method: 'PUT',
        body: JSON.stringify({ preferences: updatedPreferences }),
      });
      
      // 成功した場合、ローカルで並び替え済みのデータを使用
      dispatch({ type: 'SET_TEMPLATE_PREFERENCES', payload: reorderedPreferences });
      dispatch({ type: 'SET_INITIALIZED', payload: true });
    } catch (error) {
      console.error('テンプレート順序変更エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'テンプレートの順序変更に失敗しました';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING_PREFERENCES', payload: false });
    }
  }, [fetchWithAuth, state.templatePreferences]);

  // アクション関数をまとめたオブジェクト
  const actions = useMemo(() => ({
    // 初期化
    initializeTemplates,
    
    // データ読み込み
    loadUserTemplates,
    loadAdminTemplates,
    loadDropdownTemplates,
    loadTemplatePreferences,
    
    // テンプレート操作
    saveUserTemplate,
    updateUserTemplate,
    deleteUserTemplate,
    
    // 設定操作
    updateTemplatePreferences,
    reorderTemplate,
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
    setTemplatePreferences: (preferences: TemplateWithPreferences[]) => dispatch({ type: 'SET_TEMPLATE_PREFERENCES', payload: preferences }),
  }), [
    initializeTemplates,
    loadUserTemplates,
    loadAdminTemplates,
    loadDropdownTemplates,
    loadTemplatePreferences,
    saveUserTemplate,
    updateUserTemplate,
    deleteUserTemplate,
    updateTemplatePreferences,
    reorderTemplate,
    resetPreferences,
    dispatch,
  ]);

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

  const contextValue: TemplateContextValue = useMemo(() => ({
    state,
    dispatch,
    actions,
  }), [state, dispatch, actions]);

  return (
    <TemplateContext.Provider value={contextValue}>
      {children}
    </TemplateContext.Provider>
  );
};
