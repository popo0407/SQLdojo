import { createContext } from 'react';
import type { TemplateState, TemplateAction, Template } from '../types/template';

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
