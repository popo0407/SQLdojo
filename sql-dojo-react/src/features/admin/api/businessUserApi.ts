// 業務システムユーザー管理API
import { API_CONFIG } from '../../../config/api';

export interface BusinessUser {
  user_id: string;
  user_name: string;
  role?: string;
}

export interface BusinessUserListResponse {
  users: BusinessUser[];
  total_count: number;
}

export interface BusinessUserRefreshResponse {
  success: boolean;
  updated_count: number;
  message: string;
}

class BusinessUserApi {
  private baseUrl = `${API_CONFIG.BASE_URL}/admin/business-users`;

  /**
   * 業務システムユーザー一覧を取得
   */
  async getBusinessUsers(): Promise<BusinessUserListResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || `ユーザー一覧取得に失敗: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 業務システムユーザー情報を更新
   */
  async refreshBusinessUsers(): Promise<BusinessUserRefreshResponse> {
    const response = await fetch(`${this.baseUrl}/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || `ユーザー情報更新に失敗: ${response.status}`);
    }

    return response.json();
  }
}

export const businessUserApi = new BusinessUserApi();
