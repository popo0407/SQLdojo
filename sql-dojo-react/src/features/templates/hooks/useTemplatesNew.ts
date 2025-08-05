import { useCallback } from 'react';
import { useTemplateStore } from '../stores/useTemplateStore';
import type { 
  TemplateWithPreferences
} from '../types/template';

/**
 * テンプレート機能の統合フック
 * 新しいZustandベースのストアを使用
 */
export const useTemplates = () => {
  // ストアのstate/actionsを取得
  const store = useTemplateStore();

  // ===========================================
  // データアクセサ
  // ===========================================

  const {
    // データ
    userTemplates,
    adminTemplates,
    dropdownTemplates,
    templatePreferences,
    
    // UI状態
    isLoading,
    isLoadingDropdown,
    isLoadingPreferences,
    error,
    isInitialized,
    
    // モーダル状態
    isSaveModalOpen,
    isEditModalOpen,
    isOrderModalOpen,
    editingTemplate,
    hasUnsavedChanges,
  } = store;

  // ===========================================
  // 計算値（useMemo相当）
  // ===========================================

  const allTemplates = useCallback(() => [
    ...userTemplates,
    ...adminTemplates
  ], [userTemplates, adminTemplates]);

  const visibleTemplates = useCallback(() => 
    allTemplates().filter(template => {
      const pref = templatePreferences.find(p => p.template_id === template.template_id);
      return pref?.is_visible !== false;
    }).sort((a, b) => {
      const orderA = templatePreferences.find(p => p.template_id === a.template_id)?.display_order || 0;
      const orderB = templatePreferences.find(p => p.template_id === b.template_id)?.display_order || 0;
      return orderA - orderB;
    })
  , [allTemplates, templatePreferences]);

  const isAnyLoading = useCallback(() => 
    isLoading || isLoadingDropdown || isLoadingPreferences
  , [isLoading, isLoadingDropdown, isLoadingPreferences]);

  // ===========================================
  // アクション（ストアのアクションをそのまま使用）
  // ===========================================

  const {
    // 基本アクション
    reset,
    clearError,
    setError,
    
    // データ更新
    fetchUserTemplates,
    fetchAdminTemplates,
    fetchDropdownTemplates,
    fetchTemplatePreferences,
    
    // CRUD操作
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    updateTemplatePreferences,
    
    // モーダル操作
    setSaveModalOpen,
    setEditModalOpen,
    setOrderModalOpen,
    closeAllModals,
    openEditModal,
    
    // 編集状態
    setEditingTemplate,
    setHasUnsavedChanges,
    
    // 初期化
    initializeStore,
  } = store;

  // ===========================================
  // カスタムアクション
  // ===========================================

  /**
   * テンプレートを複製
   */
  const duplicateTemplate = useCallback(async (template: TemplateWithPreferences) => {
    const duplicatedTemplate = {
      name: `${template.name} (Copy)`,
      sql: template.sql,
      type: template.type,
      is_common: template.is_common,
      is_visible: true,
      display_order: Math.max(...templatePreferences.map(p => p.display_order), 0) + 1,
    };

    await saveTemplate(duplicatedTemplate);
  }, [saveTemplate, templatePreferences]);

  /**
   * テンプレートの表示設定を切り替え
   */
  const toggleTemplateVisibility = useCallback(async (templateId: string) => {
    const currentPref = templatePreferences.find(p => p.template_id === templateId);
    if (!currentPref) return;

    const updatedPreferences = templatePreferences.map(pref =>
      pref.template_id === templateId
        ? { ...pref, is_visible: !pref.is_visible }
        : pref
    );

    await updateTemplatePreferences(updatedPreferences);
  }, [templatePreferences, updateTemplatePreferences]);

  /**
   * テンプレートの表示順序を変更
   */
  const reorderTemplates = useCallback(async (reorderedTemplateIds: string[]) => {
    const updatedPreferences = templatePreferences.map(pref => {
      const newOrder = reorderedTemplateIds.indexOf(pref.template_id);
      return newOrder >= 0 ? { ...pref, display_order: newOrder } : pref;
    });

    await updateTemplatePreferences(updatedPreferences);
  }, [templatePreferences, updateTemplatePreferences]);

  /**
   * 初期化の確認とロード
   */
  const ensureInitialized = useCallback(async () => {
    if (!isInitialized) {
      await initializeStore();
    }
  }, [isInitialized, initializeStore]);

  // ===========================================
  // 戻り値
  // ===========================================

  return {
    // データ
    userTemplates,
    adminTemplates,
    dropdownTemplates,
    templatePreferences,
    allTemplates: allTemplates(),
    visibleTemplates: visibleTemplates(),
    
    // 状態
    isLoading,
    isLoadingDropdown,
    isLoadingPreferences,
    isAnyLoading: isAnyLoading(),
    error,
    isInitialized,
    
    // モーダル状態
    isSaveModalOpen,
    isEditModalOpen,
    isOrderModalOpen,
    editingTemplate,
    hasUnsavedChanges,
    
    // 基本アクション
    reset,
    clearError,
    setError,
    
    // データ取得
    fetchUserTemplates,
    fetchAdminTemplates,
    fetchDropdownTemplates,
    fetchTemplatePreferences,
    ensureInitialized,
    
    // CRUD操作
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    
    // 設定操作
    updateTemplatePreferences,
    toggleTemplateVisibility,
    reorderTemplates,
    
    // モーダル操作
    setSaveModalOpen,
    setEditModalOpen,
    setOrderModalOpen,
    closeAllModals,
    openEditModal,
    
    // 編集状態
    setEditingTemplate,
    setHasUnsavedChanges,
    
    // 初期化
    initializeStore,
  };
};
