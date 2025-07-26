import { useCallback, useRef } from 'react';
import { useTemplateContext } from './useTemplateContext';
import type { TemplateWithPreferences, TemplatePreference } from '../types/template';

/**
 * テンプレート操作に特化したカスタムフック
 */
export const useTemplates = () => {
  const { state, actions } = useTemplateContext();
  
  // 初期化中フラグ（React StrictModeでの重複実行を防ぐ）
  const initializingRef = useRef(false);

  /**
   * 初期データを読み込み
   * template-preferencesに統一してすべてのデータを取得
   */
  const initializeTemplates = useCallback(async () => {
    // 既に初期化済みの場合はスキップ
    if (state.isInitialized) {
      console.log('initializeTemplates: 既に初期化済みのためスキップ');
      return;
    }
    
    // 初期化中の場合はスキップ（React StrictMode対策）
    if (initializingRef.current) {
      console.log('initializeTemplates: 初期化中のためスキップ');
      return;
    }
    
    initializingRef.current = true;
    console.log('initializeTemplates: 初期化開始');
    
    try {
      await actions.loadTemplatePreferences(); // これだけですべてのデータを取得
      console.log('initializeTemplates: 初期化完了');
    } catch (error) {
      console.error('テンプレート初期化エラー:', error);
    } finally {
      initializingRef.current = false;
    }
  }, [actions, state.isInitialized]);

  /**
   * テンプレートを保存（エラーハンドリング付き）
   */
  const saveTemplate = useCallback(async (name: string, sql: string): Promise<boolean> => {
    try {
      await actions.saveUserTemplate(name, sql);
      return true;
    } catch (error) {
      console.error('テンプレート保存エラー:', error);
      return false;
    }
  }, [actions]);

  /**
   * テンプレートを更新（エラーハンドリング付き）
   */
  const updateTemplate = useCallback(async (template: TemplateWithPreferences): Promise<boolean> => {
    try {
      await actions.updateUserTemplate(template);
      return true;
    } catch (error) {
      console.error('テンプレート更新エラー:', error);
      return false;
    }
  }, [actions]);

  /**
   * テンプレートを削除（エラーハンドリング付き）
   */
  const deleteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    try {
      await actions.deleteUserTemplate(templateId);
      return true;
    } catch (error) {
      console.error('テンプレート削除エラー:', error);
      return false;
    }
  }, [actions]);

  /**
   * テンプレート設定を保存（エラーハンドリング付き）
   */
  const savePreferences = useCallback(async (): Promise<boolean> => {
    try {
      await actions.updateTemplatePreferences();
      return true;
    } catch (error) {
      console.error('テンプレート設定保存エラー:', error);
      return false;
    }
  }, [actions]);

  /**
   * 表示可能なテンプレートのみを取得
   * template-preferencesから取得したデータでis_visibleがtrueのもの
   */
  const getVisibleTemplates = useCallback(() => {
    return state.templatePreferences.filter(template => template.is_visible);
  }, [state.templatePreferences]);

  /**
   * 個人テンプレートのみを取得（typeが"user"のもの）
   * template-preferencesから取得したデータを使用
   */
  const getUserTemplates = useCallback(() => {
    return state.templatePreferences.filter(template => template.type === 'user');
  }, [state.templatePreferences]);

  /**
   * ドロップダウン用の個人テンプレートを取得
   */
  const getUserTemplatesForDropdown = useCallback(() => {
    return state.templatePreferences.filter(template => template.type === 'user');
  }, [state.templatePreferences]);

  /**
   * 共通テンプレートのみを取得（管理者テンプレート）
   * template-preferencesから取得したデータでtypeが"admin"のもの
   */
  const getAdminTemplates = useCallback(() => {
    return state.templatePreferences.filter(template => template.type === 'admin');
  }, [state.templatePreferences]);

  return {
    // 状態
    state,
    
    // データ取得用関数
    getVisibleTemplates,
    getUserTemplates,
    getUserTemplatesForDropdown,
    getAdminTemplates,
    
    // 操作関数
    initializeTemplates,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    savePreferences,
    
    // 直接アクション
    actions,
  };
};

/**
 * テンプレートモーダル操作に特化したカスタムフック
 */
export const useTemplateModals = () => {
  const { state, actions } = useTemplateContext();

  return {
    // 保存モーダル
    isSaveModalOpen: state.isSaveModalOpen,
    openSaveModal: actions.openSaveModal,
    closeSaveModal: actions.closeSaveModal,
    
    // 編集モーダル
    isEditModalOpen: state.isEditModalOpen,
    editingTemplate: state.editingTemplate,
    openEditModal: actions.openEditModal,
    closeEditModal: actions.closeEditModal,
    
    // 順序変更モーダル
    isOrderModalOpen: state.isOrderModalOpen,
    openOrderModal: actions.openOrderModal,
    closeOrderModal: actions.closeOrderModal,
  };
};

/**
 * テンプレート順序操作に特化したカスタムフック
 */
export const useTemplateOrder = () => {
  const { state, actions } = useTemplateContext();

  /**
   * テンプレート順序を変更
   */
  const reorderTemplate = useCallback(async (templateId: string, direction: 'up' | 'down' | 'top' | 'bottom'): Promise<boolean> => {
    try {
      await actions.reorderTemplate(templateId, direction);
      return true;
    } catch (error) {
      console.error('順序変更エラー:', error);
      return false;
    }
  }, [actions]);

  /**
   * テンプレート表示設定を更新
   */
  const updatePreferences = useCallback(async (preferences: TemplatePreference[]): Promise<boolean> => {
    try {
      await actions.updateTemplatePreferences({ preferences });
      return true;
    } catch (error) {
      console.error('表示設定更新エラー:', error);
      return false;
    }
  }, [actions]);

  return {
    // 状態
    ...state,
    templates: state.templatePreferences,
    
    // 基本操作
    initializeTemplates,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    getUserTemplates: actions.loadUserTemplates,
    
    // 順序・表示制御
    reorderTemplate,
    updatePreferences,
  };
};
