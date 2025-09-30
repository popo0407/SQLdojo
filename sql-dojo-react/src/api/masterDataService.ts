// マスターデータAPI関連の型定義とサービス関数
import type { TableRow } from '../types/common';

// マスターデータ更新結果の型定義
export interface MasterDataUpdateResult {
  success: boolean;
  message: string;
  results?: {
    station_master: number;
    measure_master: number;
    set_master: number;
    free_master: number;
    parts_master: number;
    trouble_master: number;
  };
}

// ステーション一覧の型定義
export interface StationInfo {
  sta_no1: string;
  place_name: string;
}

// マスターデータフィルタリクエストの型定義
export interface MasterDataFilterRequest {
  master_type: string;
  sta_no1: string;
  sta_no2: string;
  sta_no3: string;
}

// SQL生成リクエストの型定義
export interface MasterDataSqlRequest {
  master_type: string;
  selected_items: TableRow[];
  include_columns?: string[];
}

// マスターデータAPI関数群
export class MasterDataService {
  private static baseUrl = '/api/master';

  // 全マスターデータ更新
  static async updateAllMasterData(): Promise<MasterDataUpdateResult> {
    try {
      const response = await fetch(`${this.baseUrl}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Master data update failed:', error);
      throw error;
    }
  }

  // ステーション一覧取得
  static async getStations(): Promise<StationInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/station/stations`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch stations:', error);
      throw error;
    }
  }

  // ステーション条件でのフィルタリング
  static async filterStations(filters: Record<string, string>): Promise<TableRow[]> {
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(`${this.baseUrl}/station/filter?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to filter stations:', error);
      throw error;
    }
  }

  // 指定ステーションのマスターデータ取得
  static async getMasterDataByStation(request: MasterDataFilterRequest): Promise<TableRow[]> {
    try {
      const queryParams = new URLSearchParams({
        master_type: request.master_type,
        sta_no1: request.sta_no1,
        sta_no2: request.sta_no2,
        sta_no3: request.sta_no3
      });
      
      const response = await fetch(`${this.baseUrl}/data/by-station?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch master data by station:', error);
      throw error;
    }
  }

  // 選択アイテムからSQL生成
  static async generateSql(request: MasterDataSqlRequest): Promise<{ sql: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to generate SQL:', error);
      throw error;
    }
  }
}