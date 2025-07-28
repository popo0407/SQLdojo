import type { TemplateState, TemplateAction } from '../types/template';

/**
 * テンプレート状態の初期値
 */
export const initialTemplateState: TemplateState = {
  // テンプレート一覧
  userTemplates: [],
  adminTemplates: [],
  
  // ドロップダウン用データ
  dropdownTemplates: [],
  
  // 設定管理用データ
  templatePreferences: [],
  
  // 初期化状態
  isInitialized: false,
  
  // UI状態
  isLoading: false,
  isLoadingDropdown: false,
  isLoadingPreferences: false,
  error: null,
  
  // モーダル状態
  isSaveModalOpen: false,
  isEditModalOpen: false,
  isOrderModalOpen: false,
  
  // 編集中のテンプレート
  editingTemplate: null,
  
  // 未保存変更フラグ
  hasUnsavedChanges: false,
};

/**
 * テンプレート状態管理用のReducer
 * @param state 現在の状態
 * @param action 実行するアクション
 * @returns 新しい状態
 */
export function templateReducer(state: TemplateState, action: TemplateAction): TemplateState {
  switch (action.type) {
    // ローディング状態管理
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
        error: action.payload ? null : state.error, // ローディング開始時はエラーをクリア
      };

    case 'SET_LOADING_DROPDOWN':
      return {
        ...state,
        isLoadingDropdown: action.payload,
      };

    case 'SET_LOADING_PREFERENCES':
      return {
        ...state,
        isLoadingPreferences: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        isLoadingDropdown: false,
        isLoadingPreferences: false,
      };

    case 'SET_INITIALIZED':
      return {
        ...state,
        isInitialized: action.payload,
      };

    // テンプレート一覧操作
    case 'SET_USER_TEMPLATES':
      return {
        ...state,
        userTemplates: action.payload,
        error: null,
      };

    case 'SET_ADMIN_TEMPLATES':
      return {
        ...state,
        adminTemplates: action.payload,
        error: null,
      };

    case 'ADD_USER_TEMPLATE':
      return {
        ...state,
        userTemplates: [...state.userTemplates, action.payload],
        error: null,
      };

    case 'UPDATE_USER_TEMPLATE':
      return {
        ...state,
        userTemplates: state.userTemplates.map(template =>
          template.id === action.payload.id ? action.payload : template
        ),
        error: null,
      };

    case 'DELETE_USER_TEMPLATE':
      return {
        ...state,
        userTemplates: state.userTemplates.filter(template => template.id !== action.payload),
        error: null,
      };

    case 'ADD_ADMIN_TEMPLATE':
      return {
        ...state,
        adminTemplates: [...state.adminTemplates, action.payload],
        error: null,
      };

    case 'UPDATE_ADMIN_TEMPLATE':
      return {
        ...state,
        adminTemplates: state.adminTemplates.map(template =>
          template.id === action.payload.id ? action.payload : template
        ),
        error: null,
      };

    case 'DELETE_ADMIN_TEMPLATE':
      return {
        ...state,
        adminTemplates: state.adminTemplates.filter(template => template.id !== action.payload),
        error: null,
      };

    // ドロップダウン用データ操作
    case 'SET_DROPDOWN_TEMPLATES':
      return {
        ...state,
        dropdownTemplates: action.payload,
        error: null,
      };

    // 設定管理操作
    case 'SET_TEMPLATE_PREFERENCES':
      return {
        ...state,
        templatePreferences: action.payload,
        hasUnsavedChanges: false,
        error: null,
      };

    case 'UPDATE_TEMPLATE_PREFERENCES':
      return {
        ...state,
        templatePreferences: action.payload,
        hasUnsavedChanges: true,
      };

    case 'MOVE_TEMPLATE_UP': {
      const templates = [...state.templatePreferences];
      const index = templates.findIndex(t => t.template_id === action.payload);
      
      if (index > 0) {
        // 現在の表示順を取得
        const currentOrder = templates[index].display_order;
        const prevOrder = templates[index - 1].display_order;
        
        // 表示順を交換
        templates[index].display_order = prevOrder;
        templates[index - 1].display_order = currentOrder;
        
        // 配列の順序も交換
        [templates[index], templates[index - 1]] = [templates[index - 1], templates[index]];
      }
      
      return {
        ...state,
        templatePreferences: templates,
        hasUnsavedChanges: true,
      };
    }

    case 'MOVE_TEMPLATE_DOWN': {
      const templates = [...state.templatePreferences];
      const index = templates.findIndex(t => t.template_id === action.payload);
      
      if (index < templates.length - 1) {
        // 現在の表示順を取得
        const currentOrder = templates[index].display_order;
        const nextOrder = templates[index + 1].display_order;
        
        // 表示順を交換
        templates[index].display_order = nextOrder;
        templates[index + 1].display_order = currentOrder;
        
        // 配列の順序も交換
        [templates[index], templates[index + 1]] = [templates[index + 1], templates[index]];
      }
      
      return {
        ...state,
        templatePreferences: templates,
        hasUnsavedChanges: true,
      };
    }

    case 'TOGGLE_TEMPLATE_VISIBILITY':
      return {
        ...state,
        templatePreferences: state.templatePreferences.map(template =>
          template.template_id === action.payload.id
            ? { ...template, is_visible: action.payload.isVisible }
            : template
        ),
        hasUnsavedChanges: true,
      };

    // モーダル操作
    case 'OPEN_SAVE_MODAL':
      return {
        ...state,
        isSaveModalOpen: true,
      };

    case 'CLOSE_SAVE_MODAL':
      return {
        ...state,
        isSaveModalOpen: false,
      };

    case 'OPEN_EDIT_MODAL':
      return {
        ...state,
        isEditModalOpen: true,
        editingTemplate: action.payload,
      };

    case 'CLOSE_EDIT_MODAL':
      return {
        ...state,
        isEditModalOpen: false,
        editingTemplate: null,
      };

    case 'OPEN_ORDER_MODAL':
      return {
        ...state,
        isOrderModalOpen: true,
      };

    case 'CLOSE_ORDER_MODAL':
      return {
        ...state,
        isOrderModalOpen: false,
      };

    // 変更状態管理
    case 'SET_UNSAVED_CHANGES':
      return {
        ...state,
        hasUnsavedChanges: action.payload,
      };

    default:
      return state;
  }
}

/**
 * テンプレート一覧を表示順でソートする関数
 * @param templates テンプレート配列
 * @returns ソート済みテンプレート配列
 */
export function sortTemplatesByDisplayOrder<T extends { display_order: number }>(templates: T[]): T[] {
  return [...templates].sort((a, b) => a.display_order - b.display_order);
}

/**
 * 表示可能なテンプレートのみを抽出する関数
 * @param templates テンプレート配列
 * @returns 表示可能なテンプレート配列
 */
export function getVisibleTemplates<T extends { is_visible: boolean }>(templates: T[]): T[] {
  return templates.filter(template => template.is_visible);
}

/**
 * テンプレートの表示順を再計算する関数
 * @param templates テンプレート配列
 * @returns 表示順が再計算されたテンプレート配列
 */
export function recalculateDisplayOrder<T extends { display_order: number }>(templates: T[]): T[] {
  return templates.map((template, index) => ({
    ...template,
    display_order: index + 1,
  }));
}
