/**
 * テンプレート機能に関する型定義
 */

/**
 * テンプレートの基本情報
 */
export interface Template {
  id: string;
  name: string;
  sql: string;
  is_common: boolean;
  type: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

/**
 * template-preferences APIから返される完全なテンプレート情報
 * すべてのテンプレート操作でこの型を使用
 */
export interface TemplateWithPreferences {
  template_id: string;
  name: string;
  sql: string;
  created_at: string;
  updated_at?: string; // 編集時に使用
  type: 'user' | 'admin';
  is_common: boolean;
  display_order: number;
  is_visible: boolean;
}

/**
 * テンプレート表示設定
 */
export interface TemplatePreference {
  template_id: string;
  display_order: number;
  is_visible: boolean;
  template_type: 'user' | 'admin'; // 必須フィールドに変更
}

/**
 * ドロップダウン用テンプレート情報
 */
export interface TemplateDropdownItem {
  id: string;
  name: string;
  sql: string;
  type: 'user' | 'admin';
  display_order?: number;
  is_visible?: boolean;
  is_common?: boolean;
}

/**
 * テンプレート保存リクエスト
 */
export interface CreateTemplateRequest {
  name: string;
  sql: string;
}

/**
 * テンプレート更新リクエスト
 */
export interface UpdateTemplateRequest {
  name: string;
  sql: string;
}

/**
 * APIリクエスト用テンプレート設定項目（バックエンドAPI仕様に準拠）
 */
export interface UpdateTemplatePreferenceItem {
  template_id: string;
  template_type: 'user' | 'admin';
  display_order: number;
  is_visible: boolean;
}

/**
 * テンプレート設定更新リクエスト
 */
export interface UpdateTemplatePreferencesRequest {
  preferences: UpdateTemplatePreferenceItem[];
}

/**
 * API レスポンス - テンプレート一覧
 */
export interface TemplatesResponse {
  templates: Template[];
}

/**
 * API レスポンス - ドロップダウン用テンプレート一覧
 */
export interface TemplateDropdownResponse {
  templates: TemplateDropdownItem[];
}

/**
 * API レスポンス - テンプレート設定
 */
export interface TemplatePreferencesResponse {
  templates: TemplateWithPreferences[];
}

/**
 * テンプレート状態管理用の State
 */
export interface TemplateState {
  // テンプレート一覧
  userTemplates: Template[];
  adminTemplates: Template[];
  
  // ドロップダウン用データ（表示順・表示設定反映済み）
  dropdownTemplates: TemplateDropdownItem[];
  
  // 設定管理用データ（実際のAPIはTemplateWithPreferences形式）
  templatePreferences: TemplateWithPreferences[];
  
  // 初期化状態
  isInitialized: boolean;
  
  // UI状態
  isLoading: boolean;
  isLoadingDropdown: boolean;
  isLoadingPreferences: boolean;
  error: string | null;
  
  // モーダル状態
  isSaveModalOpen: boolean;
  isEditModalOpen: boolean;
  isOrderModalOpen: boolean;
  
  // 編集中のテンプレート
  editingTemplate: Template | null;
  
  // 未保存変更フラグ
  hasUnsavedChanges: boolean;
}

/**
 * テンプレート関連のアクション
 */
export type TemplateAction =
  // データ読み込み
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOADING_DROPDOWN'; payload: boolean }
  | { type: 'SET_LOADING_PREFERENCES'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  
  // テンプレート一覧操作
  | { type: 'SET_USER_TEMPLATES'; payload: Template[] }
  | { type: 'SET_ADMIN_TEMPLATES'; payload: Template[] }
  | { type: 'ADD_USER_TEMPLATE'; payload: Template }
  | { type: 'UPDATE_USER_TEMPLATE'; payload: Template }
  | { type: 'DELETE_USER_TEMPLATE'; payload: string }
  | { type: 'ADD_ADMIN_TEMPLATE'; payload: Template }
  | { type: 'UPDATE_ADMIN_TEMPLATE'; payload: Template }
  | { type: 'DELETE_ADMIN_TEMPLATE'; payload: string }
  
  // ドロップダウン用データ操作
  | { type: 'SET_DROPDOWN_TEMPLATES'; payload: TemplateDropdownItem[] }
  
  // 設定管理操作
  | { type: 'SET_TEMPLATE_PREFERENCES'; payload: TemplateWithPreferences[] }
  | { type: 'UPDATE_TEMPLATE_PREFERENCES'; payload: TemplateWithPreferences[] }
  | { type: 'MOVE_TEMPLATE_UP'; payload: string }
  | { type: 'MOVE_TEMPLATE_DOWN'; payload: string }
  | { type: 'TOGGLE_TEMPLATE_VISIBILITY'; payload: { id: string; isVisible: boolean } }
  
  // モーダル操作
  | { type: 'OPEN_SAVE_MODAL' }
  | { type: 'CLOSE_SAVE_MODAL' }
  | { type: 'OPEN_EDIT_MODAL'; payload: Template }
  | { type: 'CLOSE_EDIT_MODAL' }
  | { type: 'OPEN_ORDER_MODAL' }
  | { type: 'CLOSE_ORDER_MODAL' }
  
  // 変更状態管理
  | { type: 'SET_UNSAVED_CHANGES'; payload: boolean };

/**
 * エラー種別
 */
export type TemplateErrorType = 
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'SERVER_ERROR';

/**
 * エラー情報
 */
export interface TemplateError {
  type: TemplateErrorType;
  message: string;
  details?: string;
}

/**
 * テンプレート保存モーダルのprops
 */
export interface TemplateSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, sql: string) => Promise<void>;
  initialSql?: string;
  isLoading?: boolean;
  // 外部からモーダルのエラーメッセージを渡せるようにする（テストやAPIエラー表示用）
  error?: string;
}

/**
 * テンプレート編集モーダルのprops
 */
export interface TemplateEditModalProps {
  isOpen: boolean;
  template: Template | null;
  onClose: () => void;
  onSave: (template: Template) => Promise<void>;
  isLoading?: boolean;
}

/**
 * テンプレートドロップダウンのprops
 */
export interface TemplateDropdownProps {
  templates: TemplateDropdownItem[];
  onSelectTemplate: (template: TemplateDropdownItem) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * テンプレート一覧のprops
 */
export interface TemplateListProps {
  templates: TemplateDropdownItem[];
  onEdit: (template: Template) => void;
  onDelete: (templateId: string) => void;
  onToggleVisibility: (templateId: string, isVisible: boolean) => void;
  onMoveUp: (templateId: string) => void;
  onMoveDown: (templateId: string) => void;
  isLoading?: boolean;
  hasUnsavedChanges?: boolean;
}
