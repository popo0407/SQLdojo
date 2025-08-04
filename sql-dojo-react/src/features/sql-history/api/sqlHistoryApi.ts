/**
 * SQL実行履歴のAPI通信
 * 既存のバックエンドAPIエンドポイントを活用
 */

import type { SqlHistoryResponse } from '../types';
import { API_CONFIG } from '../../../config/api';

/**
 * SQL履歴API通信のクラス
 */
export const sqlHistoryApi = {
  /**
   * SQL実行履歴を取得
   * 既存の /api/v1/users/history エンドポイントを使用
   * @returns SQL履歴データのPromise
   */
  async getSqlHistory(): Promise<SqlHistoryResponse> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/users/history`, {
        method: 'GET',
        credentials: 'include', // Cookie認証のために必須
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        let errorMessage = `履歴取得エラー: ${response.status} ${response.statusText}`;
        
        // レスポンスボディからエラー詳細を取得試行
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // JSONパースエラーは無視
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // レスポンス形式の検証
      if (!data || typeof data !== 'object') {
        throw new Error('無効なレスポンス形式です');
      }
      
      // logs配列の存在確認
      if (!Array.isArray(data.logs)) {
        throw new Error('履歴データが見つかりません');
      }
      
      return {
        logs: data.logs,
        total_count: data.total_count || data.logs.length
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      
      // ネットワークエラーなどの場合
      throw new Error('履歴の取得に失敗しました。ネットワーク接続を確認してください。');
    }
  }
};
