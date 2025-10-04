// マスター検索履歴サービス
import { apiClient } from './apiClient';

// マスター検索履歴の型定義
export interface MasterSearchPreference {
  sta_no1: string;
  sta_no2_first: string;
  updated_at: string;
}

export interface SaveSearchPreferenceRequest {
  sta_no1: string;
  sta_no2_first: string;
}

// マスター検索履歴API関数群
export class MasterSearchPreferenceService {
  private static baseUrl = '/master';

  // 検索履歴を保存
  static async saveSearchPreference(request: SaveSearchPreferenceRequest): Promise<void> {
    try {
      await apiClient.post<void>(`${this.baseUrl}/search-preferences`, request);
    } catch (error) {
      console.error('Failed to save search preference:', error);
      throw error;
    }
  }

  // 検索履歴を取得
  static async getSearchPreference(): Promise<MasterSearchPreference | null> {
    try {
      const response = await apiClient.get<{ data: MasterSearchPreference }>(`${this.baseUrl}/search-preferences`);
      return response.data;
    } catch (error) {
      console.error('Failed to get search preference:', error);
      // エラーが発生した場合はnullを返す（履歴がない場合と同じ扱い）
      return null;
    }
  }
}