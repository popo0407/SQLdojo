/**
 * テンプレート関連のAPIクライアント
 */

import type {
  Template,
  TemplateDropdownItem,
  TemplatePreference,
  TemplateWithPreferences,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  UpdateTemplatePreferencesRequest,
  TemplatesResponse,
  TemplateDropdownResponse,
  TemplatePreferencesResponse,
} from '../types/template';

// API基本設定
const API_BASE_URL = 'http://localhost:8001/api/v1';

// 汎用エラークラス
export class TemplateApiError extends Error {
  public status?: number;
  public response?: Response;

  constructor(
    message: string,
    status?: number,
    response?: Response
  ) {
    super(message);
    this.name = 'TemplateApiError';
    this.status = status;
    this.response = response;
  }
}

// 汎用リクエスト関数
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      credentials: 'include', // セッションCookieを含める
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new TemplateApiError(
        `API Error: ${response.status} ${response.statusText} - ${errorText}`,
        response.status,
        response
      );
    }

    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  } catch (error) {
    if (error instanceof TemplateApiError) {
      throw error;
    }
    throw new TemplateApiError(
      `Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * テンプレート関連のAPIクライアント
 */
export const templateApi = {
  /**
   * ユーザーテンプレート一覧を取得
   */
  getUserTemplates: async (): Promise<Template[]> => {
    const response = await request<TemplatesResponse>('/users/templates');
    return response.templates;
  },

  /**
   * ドロップダウン用テンプレート一覧を取得
   */
  getDropdownTemplates: async (): Promise<TemplateDropdownItem[]> => {
    const response = await request<TemplateDropdownResponse>('/users/templates-for-dropdown');
    return response.templates;
  },

  /**
   * テンプレート設定を取得
   */
  getTemplatePreferences: async (): Promise<TemplateWithPreferences[]> => {
    const response = await request<TemplatePreferencesResponse>('/users/template-preferences');
    return response.templates;
  },

  /**
   * 新しいテンプレートを作成
   */
  createTemplate: async (data: CreateTemplateRequest): Promise<Template> => {
    return await request<Template>('/users/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * テンプレートを更新
   */
  updateTemplate: async (templateId: string, data: UpdateTemplateRequest): Promise<Template> => {
    return await request<Template>(`/users/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * テンプレートを削除
   */
  deleteTemplate: async (templateId: string): Promise<void> => {
    await request<void>(`/users/templates/${templateId}`, {
      method: 'DELETE',
    });
  },

  /**
   * テンプレート設定を更新
   */
  updateTemplatePreferences: async (data: UpdateTemplatePreferencesRequest): Promise<TemplateWithPreferences[]> => {
    const response = await request<TemplatePreferencesResponse>('/users/template-preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.templates;
  },

  /**
   * テンプレート順序を変更
   */
  reorderTemplate: async (templateId: string, direction: 'up' | 'down' | 'top' | 'bottom'): Promise<TemplateWithPreferences[]> => {
    // 現在の設定を取得
    const currentPreferences = await templateApi.getTemplatePreferences();
    
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

    // display_orderを更新
    const updatedPreferences: TemplatePreference[] = reorderedPreferences.map((pref, index) => ({
      template_id: pref.template_id,
      template_type: pref.type, // typeをtemplate_typeにマッピング
      is_visible: pref.is_visible,
      display_order: index + 1
    }));

    // APIで更新
    return await templateApi.updateTemplatePreferences({ preferences: updatedPreferences });
  },

  /**
   * 管理者テンプレート一覧を取得
   */
  getAdminTemplates: async (): Promise<Template[]> => {
    const response = await request<TemplatesResponse>('/admin/templates');
    return response.templates;
  },
};
