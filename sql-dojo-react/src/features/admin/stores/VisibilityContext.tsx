/**
 * 表示制御機能のContext定義
 * 
 * 開発憲章準拠:
 * - 関心の分離: 状態管理ロジックをUIから分離
 * - 単一責任の原則: 表示制御状態のみを管理
 * - エラーハンドリング: 適切なデフォルト値とエラー状態管理
 */

import React, { createContext, useContext } from 'react';
import type { 
  VisibilityState, 
  VisibilityAction,
  VisibilitySetting
} from '../types/visibility';

// Context型定義
interface VisibilityContextType {
  // 状態
  state: VisibilityState;
  
  // アクション
  dispatch: React.Dispatch<VisibilityAction>;
  
  // 高レベル操作関数
  loadData: () => Promise<void>;
  saveSettings: () => Promise<void>;
  toggleVisibility: (objectName: string, roleName: string, isVisible: boolean) => void;
  addRole: (roleName: string) => void;
  deleteRole: (roleName: string) => void;
  
  // ユーティリティ関数
  getRoleList: () => string[];
  getVisibilityForObject: (objectName: string, roleName: string) => boolean;
  getSettingsForSave: () => VisibilitySetting[];
}

// Context作成（デフォルト値でエラーを明示）
export const VisibilityContext = createContext<VisibilityContextType | null>(null);

// カスタムフック：Context使用
export const useVisibility = (): VisibilityContextType => {
  const context = useContext(VisibilityContext);
  
  if (!context) {
    throw new Error('useVisibility must be used within a VisibilityProvider');
  }
  
  return context;
};

// 型ガード：Contextの値検証
export const isValidVisibilityContext = (context: unknown): context is VisibilityContextType => {
  if (!context || typeof context !== 'object') {
    return false;
  }
  
  const ctx = context as Record<string, unknown>;
  
  return (
    'state' in ctx &&
    'dispatch' in ctx &&
    'loadData' in ctx &&
    'saveSettings' in ctx &&
    'toggleVisibility' in ctx &&
    'addRole' in ctx &&
    'deleteRole' in ctx
  );
};
