/**
 * 表示制御機能専用APIサービス
 * 
 * 開発憲章準拠:
 * - 単一責任の原則: 表示制御APIのみを担当
 * - 依存性注入: 認証済みfetch関数を外部から注入
 * - エラーハンドリング: 適切な例外処理とログ出力
 */

import type { 
  Schema, 
  VisibilitySettings, 
  VisibilitySetting, 
  SaveVisibilityRequest,
  VisibilityApiResponse 
} from '../types/visibility';

export class AdminVisibilityService {
  private fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;

  constructor(fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>) {
    this.fetchWithAuth = fetchWithAuth;
  }

  /**
   * 全メタデータ取得（管理者用・フィルタリングなし）
   */
  async getAllMetadata(): Promise<Schema[]> {
    try {
      const response = await this.fetchWithAuth('/admin/metadata/all-raw');
      
      if (!response.ok) {
        throw new Error(`メタデータ取得失敗: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data as Schema[];
    } catch (error) {
      console.error('メタデータ取得エラー:', error);
      throw error instanceof Error ? error : new Error('メタデータ取得中に不明なエラーが発生しました');
    }
  }

  /**
   * 表示設定取得
   */
  async getVisibilitySettings(): Promise<VisibilitySettings> {
    try {
      const response = await this.fetchWithAuth('/admin/visibility-settings');
      
      if (!response.ok) {
        throw new Error(`表示設定取得失敗: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      // 新形式(プレーンマップ) / 旧形式({settings: map}) 両対応
      const normalized: VisibilitySettings = (data && typeof data === 'object' && 'settings' in data)
        ? (data as any).settings
        : data;
      return normalized as VisibilitySettings;
    } catch (error) {
      console.error('表示設定取得エラー:', error);
      throw error instanceof Error ? error : new Error('表示設定取得中に不明なエラーが発生しました');
    }
  }

  /**
   * 表示設定保存
   */
  async saveVisibilitySettings(settings: VisibilitySetting[]): Promise<VisibilityApiResponse> {
    try {
      const request: SaveVisibilityRequest = { settings };
      
      const response = await this.fetchWithAuth('/admin/visibility-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`設定保存失敗: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as VisibilityApiResponse;
    } catch (error) {
      console.error('設定保存エラー:', error);
      throw error instanceof Error ? error : new Error('設定保存中に不明なエラーが発生しました');
    }
  }

  /**
   * 同時データ取得（メタデータ + 設定）
   * パフォーマンス最適化のため
   */
  async loadAllData(): Promise<{ metadata: Schema[]; settings: VisibilitySettings }> {
    try {
      const [metadata, settings] = await Promise.all([
        this.getAllMetadata(),
        this.getVisibilitySettings()
      ]);

      return { metadata, settings };
    } catch (error) {
      console.error('データ一括取得エラー:', error);
      throw error instanceof Error ? error : new Error('データ取得中に不明なエラーが発生しました');
    }
  }
}
