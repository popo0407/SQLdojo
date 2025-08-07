/**
 * 表示制御機能のReducer
 * 
 * 開発憲章準拠:
 * - 単一責任の原則: 状態更新ロジックのみを担当
 * - 不変性: state の直接変更を避ける
 * - エラーハンドリング: 不正なアクションに対する適切な処理
 */

import type { VisibilityState, VisibilityAction } from '../types/visibility';
import { DEFAULT_ROLE, PROTECTED_ROLES } from '../types/visibility';

// 初期状態
export const initialVisibilityState: VisibilityState = {
  metadata: [],
  settings: {},
  roles: [DEFAULT_ROLE],
  loading: false,
  error: null,
  saving: false,
};

// Reducer実装
export const visibilityReducer = (
  state: VisibilityState, 
  action: VisibilityAction
): VisibilityState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
        error: action.payload ? null : state.error, // ローディング開始時はエラーをクリア
      };

    case 'SET_SAVING':
      return {
        ...state,
        saving: action.payload,
        error: action.payload ? null : state.error, // 保存開始時はエラーをクリア
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
        saving: false,
      };

    case 'SET_METADATA':
      return {
        ...state,
        metadata: action.payload,
        loading: false,
        error: null,
      };

    case 'SET_SETTINGS':
      return {
        ...state,
        settings: action.payload,
        loading: false,
        error: null,
      };

    case 'SET_ROLES': {
      // 保護されたロールを必ず含める
      const uniqueRoles = Array.from(new Set([...PROTECTED_ROLES, ...action.payload]));
      return {
        ...state,
        roles: uniqueRoles,
      };
    }

    case 'TOGGLE_VISIBILITY': {
      const { objectName, roleName, isVisible } = action.payload;
      
      return {
        ...state,
        settings: {
          ...state.settings,
          [objectName]: {
            ...state.settings[objectName],
            [roleName]: isVisible,
          },
        },
      };
    }

    case 'ADD_ROLE': {
      const newRole = action.payload.trim();
      
      // 空文字や既存ロールのチェック
      if (!newRole || state.roles.includes(newRole)) {
        return {
          ...state,
          error: !newRole ? 'ロール名を入力してください' : 'そのロール名は既に存在します',
        };
      }
      
      return {
        ...state,
        roles: [...state.roles, newRole],
        error: null,
      };
    }

    case 'DELETE_ROLE': {
      const roleToDelete = action.payload;
      
      // 保護されたロールの削除を防ぐ
      if (PROTECTED_ROLES.includes(roleToDelete)) {
        return {
          ...state,
          error: `${roleToDelete} ロールは削除できません`,
        };
      }
      
      // ロール削除と関連設定のクリーンアップ
      const updatedRoles = state.roles.filter(role => role !== roleToDelete);
      const updatedSettings = { ...state.settings };
      
        // 削除されたロールの設定を削除
        Object.keys(updatedSettings).forEach(objectName => {
          if (updatedSettings[objectName] && updatedSettings[objectName][roleToDelete]) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [roleToDelete]: _deleted, ...rest } = updatedSettings[objectName];
            updatedSettings[objectName] = rest;
          }
        });      return {
        ...state,
        roles: updatedRoles,
        settings: updatedSettings,
        error: null,
      };
    }

    default: {
      // TypeScript での網羅性チェック
      const exhaustiveCheck: never = action;
      console.error('不明なアクション:', exhaustiveCheck);
      return state;
    }
  }
};

// ユーティリティ関数: ロール一覧取得
export const getRoleListFromState = (state: VisibilityState): string[] => {
  return state.roles.slice().sort((a, b) => {
    // DEFAULT を最初に、その他は辞書順
    if (a === DEFAULT_ROLE) return -1;
    if (b === DEFAULT_ROLE) return 1;
    return a.localeCompare(b);
  });
};

// ユーティリティ関数: オブジェクトの表示状態取得
export const getVisibilityForObject = (
  state: VisibilityState, 
  objectName: string, 
  roleName: string
): boolean => {
  const objectSettings = state.settings[objectName];
  
  if (!objectSettings) {
    // 新規オブジェクトのデフォルトは非表示
    return false;
  }
  
  if (roleName in objectSettings) {
    return objectSettings[roleName];
  }
  
  // ロール固有設定がない場合はDEFAULTを使用
  return objectSettings[DEFAULT_ROLE] ?? false;
};
