import { useCallback } from 'react';
import { useTemplateContext } from './useTemplateContext';
import type { Template } from '../types/template';

/**
 * テンプレート操作に特化したカスタムフック
 */
export const useTemplates = () => {
  const { state, actions } = useTemplateContext();

  /**
   * 初期データを読み込み
   */
  const initializeTemplates = useCallback(async () => {
    try {
      await Promise.all([
        actions.loadDropdownTemplates(),
        actions.loadTemplatePreferences(),
      ]);
    } catch (error) {
      console.error('テンプレート初期化エラー:', error);
    }
  }, [actions.loadDropdownTemplates, actions.loadTemplatePreferences]);

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
  const updateTemplate = useCallback(async (template: Template): Promise<boolean> => {
    try {
      await actions.updateUserTemplate(template);
      return true;
    } catch (error) {
      console.error('テンプレート更新エラー:', error);
      return false;
    }
  }, [actions]);

  /**
   * テンプレートを削除（確認ダイアログ付き）
   */
  const deleteTemplate = useCallback(async (templateId: string, templateName: string): Promise<boolean> => {
    const confirmed = window.confirm(`テンプレート「${templateName}」を削除しますか？\nこの操作は取り消せません。`);
    
    if (!confirmed) {
      return false;
    }

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
   * is_visibleフィールドがない場合は全て表示
   */
  const getVisibleTemplates = useCallback(() => {
    return state.dropdownTemplates;
  }, [state.dropdownTemplates]);

  /**
   * 個人テンプレートのみを取得
   */
  const getUserTemplates = useCallback(() => {
    return state.templatePreferences.filter(template => template.type === 'user');
  }, [state.templatePreferences]);

  /**
   * 共通テンプレートのみを取得
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
   * テンプレートが上に移動可能かチェック
   */
  const canMoveUp = useCallback((templateId: string): boolean => {
    const index = state.templatePreferences.findIndex(t => t.id === templateId);
    return index > 0;
  }, [state.templatePreferences]);

  /**
   * テンプレートが下に移動可能かチェック
   */
  const canMoveDown = useCallback((templateId: string): boolean => {
    const index = state.templatePreferences.findIndex(t => t.id === templateId);
    return index >= 0 && index < state.templatePreferences.length - 1;
  }, [state.templatePreferences]);

  return {
    // 状態
    templates: state.templatePreferences,
    hasUnsavedChanges: state.hasUnsavedChanges,
    
    // チェック関数
    canMoveUp,
    canMoveDown,
    
    // 操作関数
    moveUp: actions.moveTemplateUp,
    moveDown: actions.moveTemplateDown,
    toggleVisibility: actions.toggleTemplateVisibility,
    
    // 保存・リセット
    save: actions.updateTemplatePreferences,
    reset: actions.resetPreferences,
  };
};
