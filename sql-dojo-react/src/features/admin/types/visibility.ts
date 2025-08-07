/**
 * ユーザーロール別表示制御機能の型定義
 * 
 * 開発憲章準拠:
 * - 単一責任の原則: 表示制御に関する型のみを定義
 * - 関心の分離: ビジネスロジックからデータ構造を分離
 */

// DBメタデータ関連型
export interface Schema {
  name: string;
  tables: Table[];
}

export interface Table {
  name: string;
  comment?: string;
}

// 表示制御設定関連型
export interface VisibilitySettings {
  [objectName: string]: {
    [roleName: string]: boolean;
  };
}

export interface VisibilitySetting {
  object_name: string;
  role_name: string;
  is_visible: boolean;
}

// 状態管理関連型
export interface VisibilityState {
  metadata: Schema[];
  settings: VisibilitySettings;
  roles: string[];
  loading: boolean;
  error: string | null;
  saving: boolean;
}

// アクション型定義
export type VisibilityAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_METADATA'; payload: Schema[] }
  | { type: 'SET_SETTINGS'; payload: VisibilitySettings }
  | { type: 'SET_ROLES'; payload: string[] }
  | { type: 'TOGGLE_VISIBILITY'; payload: { objectName: string; roleName: string; isVisible: boolean } }
  | { type: 'ADD_ROLE'; payload: string }
  | { type: 'DELETE_ROLE'; payload: string };

// UIコンポーネント props型
export interface VisibilityTableProps {
  metadata: Schema[];
  settings: VisibilitySettings;
  roles: string[];
  onToggleVisibility: (objectName: string, roleName: string, isVisible: boolean) => void;
}

export interface VisibilityCheckboxProps {
  objectName: string;
  roleName: string;
  isVisible: boolean;
  onChange: (objectName: string, roleName: string, isVisible: boolean) => void;
}

export interface RoleColumnManagerProps {
  roles: string[];
  onAddRole: (roleName: string) => void;
  onDeleteRole: (roleName: string) => void;
}

// API レスポンス型
export interface SaveVisibilityRequest {
  settings: VisibilitySetting[];
}

export interface VisibilityApiResponse {
  message: string;
}

// デフォルト値定数
export const DEFAULT_ROLE = 'DEFAULT';
export const OTHER_ROLE = 'その他';
export const PROTECTED_ROLES = [DEFAULT_ROLE, OTHER_ROLE];
