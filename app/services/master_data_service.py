# -*- coding: utf-8 -*-
"""
マスターデータサービス
Snowflakeからマスターデータを取得し、metadata_cache.dbに保存
"""
from typing import List, Dict, Optional, Any
from datetime import datetime

from app.logger import get_logger
from app.metadata_cache import MetadataCache


class MasterDataService:
    """マスターデータサービス"""
    
    def __init__(self, query_executor, metadata_cache: MetadataCache):
        self.query_executor = query_executor
        self.metadata_cache = metadata_cache
        self.logger = get_logger(__name__)

    def update_all_master_data(self) -> Dict[str, int]:
        """すべてのマスターデータを更新"""
        self.logger.info("全マスターデータ更新を開始")
        
        results = {}
        try:
            # STATION_MASTERの更新
            station_count = self._update_station_master()
            results['station_master'] = station_count
            
            # MEASURE_MASTERの更新
            measure_count = self._update_measure_master()
            results['measure_master'] = measure_count
            
            # SET_MASTERの更新
            set_count = self._update_set_master()
            results['set_master'] = set_count
            
            # FREE_MASTERの更新
            free_count = self._update_free_master()
            results['free_master'] = free_count
            
            # PARTS_MASTERの更新
            parts_count = self._update_parts_master()
            results['parts_master'] = parts_count
            
            # TROUBLE_MASTERの更新
            trouble_count = self._update_trouble_master()
            results['trouble_master'] = trouble_count
            
            total_records = sum(results.values())
            self.logger.info(f"全マスターデータ更新完了: 合計 {total_records} 件")
            
            return results
            
        except Exception as e:
            self.logger.error(f"マスターデータ更新エラー: {str(e)}")
            raise

    def _update_station_master(self) -> int:
        """STATION_MASTERテーブルの更新"""
        try:
            self.logger.info("STATION_MASTER更新開始")
            
            sql = """
            SELECT 
                HF1SFM01.STA_NO1 AS sta_no1,
                HF1SDM01.PLACE_NAME AS place_name,
                LEFT(HF1SFM01.STA_NO2,1) AS sta_no2_first_digit,
                HF1SFM01.STA_NO2 AS sta_no2,
                HF1SEM01.LINE_NAME AS line_name,
                HF1SFM01.STA_NO3 AS sta_no3,
                HF1SFM01.ST_NAME AS st_name
            FROM HF1SFM01
            LEFT OUTER JOIN HF1SEM01 ON (HF1SFM01.STA_NO1 = HF1SEM01.STA_NO1 AND HF1SFM01.STA_NO2 = HF1SEM01.STA_NO2)
            LEFT OUTER JOIN HF1SDM01 ON (HF1SFM01.STA_NO1 = HF1SDM01.STA_NO1)
            ORDER BY HF1SFM01.STA_NO1, HF1SFM01.STA_NO2, HF1SFM01.STA_NO3
            """
            
            result = self.query_executor.execute_query(sql)
            
            if result.success and result.data and len(result.data) > 0:
                self.logger.info(f"取得データ件数: {len(result.data)} 件")
                self.logger.debug(f"サンプルデータ: {result.data[0]}")
                
                count = self.metadata_cache.save_station_master(result.data)
                self.logger.info(f"STATION_MASTER更新完了: {count} 件")
                return count
            else:
                self.logger.warning("STATION_MASTERデータが見つかりません")
                return 0
                
        except Exception as e:
            self.logger.error(f"STATION_MASTER更新エラー: {str(e)}")
            raise

    def _update_measure_master(self) -> int:
        """MEASURE_MASTERテーブルの更新"""
        try:
            self.logger.info("MEASURE_MASTER更新開始")
            
            sql = """
            SELECT 
                STA_NO1 AS sta_no1,
                STA_NO2 AS sta_no2,
                STA_NO3 AS sta_no3,
                STEP AS step,
                CONCAT('MEASURE_', LPAD(TO_VARCHAR(ITEM_NO), 2, '0')) AS measure,
                ITEM_NAME AS item_name,
                DIVISION_FIGURE AS division_figure,
                MEASURE_INFO AS measure_info
            FROM HF1SJM01
            """
            
            result = self.query_executor.execute_query(sql)
            
            if result.success and result.data and len(result.data) > 0:
                count = self.metadata_cache.save_measure_master(result.data)
                self.logger.info(f"MEASURE_MASTER更新完了: {count} 件")
                return count
            else:
                self.logger.warning("MEASURE_MASTERデータが見つかりません")
                return 0
                
        except Exception as e:
            self.logger.error(f"MEASURE_MASTER更新エラー: {str(e)}")
            raise

    def _update_set_master(self) -> int:
        """SET_MASTERテーブルの更新"""
        try:
            self.logger.info("SET_MASTER更新開始")
            
            sql = """
            SELECT 
                STA_NO1 AS sta_no1,
                STA_NO2 AS sta_no2,
                STA_NO3 AS sta_no3,
                STEP AS step,
                CONCAT('SETDATA_', LPAD(TO_VARCHAR(ITEM_NO), 2, '0')) AS setdata,
                ITEM_NAME AS item_name
            FROM HF1SIM01
            """
            
            result = self.query_executor.execute_query(sql)
            
            if result.success and result.data and len(result.data) > 0:
                count = self.metadata_cache.save_set_master(result.data)
                self.logger.info(f"SET_MASTER更新完了: {count} 件")
                return count
            else:
                self.logger.warning("SET_MASTERデータが見つかりません")
                return 0
                
        except Exception as e:
            self.logger.error(f"SET_MASTER更新エラー: {str(e)}")
            raise

    def _update_free_master(self) -> int:
        """FREE_MASTERテーブルの更新"""
        try:
            self.logger.info("FREE_MASTER更新開始")
            
            sql = """
            SELECT 
                STA_NO1 AS sta_no1,
                STA_NO2 AS sta_no2,
                STA_NO3 AS sta_no3,
                STEP AS step,
                CONCAT('FREEDATA_', LPAD(TO_VARCHAR(ITEM_NO), 2, '0')) AS freedata,
                ITEM_NAME AS item_name
            FROM HF1SLM01
            """
            
            result = self.query_executor.execute_query(sql)
            
            if result.success and result.data and len(result.data) > 0:
                count = self.metadata_cache.save_free_master(result.data)
                self.logger.info(f"FREE_MASTER更新完了: {count} 件")
                return count
            else:
                self.logger.warning("FREE_MASTERデータが見つかりません")
                return 0
                
        except Exception as e:
            self.logger.error(f"FREE_MASTER更新エラー: {str(e)}")
            raise

    def _update_parts_master(self) -> int:
        """PARTS_MASTERテーブルの更新"""
        try:
            self.logger.info("PARTS_MASTER更新開始")
            
            sql = """
            SELECT 
                STA_NO1 AS sta_no1,
                STA_NO2 AS sta_no2,
                STA_NO3 AS sta_no3,
                MAIN_PARTS_NAME AS main_parts_name,
                CONCAT('SUB_SERIAL_', LPAD(TO_VARCHAR(PARTS_NO), 2, '0')) AS sub_parts,
                SUB_PARTS_NAME AS sub_parts_name
            FROM HF1SKM01
            """
            
            result = self.query_executor.execute_query(sql)
            
            if result.success and result.data and len(result.data) > 0:
                count = self.metadata_cache.save_parts_master(result.data)
                self.logger.info(f"PARTS_MASTER更新完了: {count} 件")
                return count
            else:
                self.logger.warning("PARTS_MASTERデータが見つかりません")
                return 0
                
        except Exception as e:
            self.logger.error(f"PARTS_MASTER更新エラー: {str(e)}")
            raise

    def _update_trouble_master(self) -> int:
        """TROUBLE_MASTERテーブルの更新"""
        try:
            self.logger.info("TROUBLE_MASTER更新開始")
            
            sql = """
            SELECT 
                STA_NO1 AS sta_no1,
                STA_NO2 AS sta_no2,
                STA_NO3 AS sta_no3,
                CODE_NO AS code_no,
                TROUBLE_NG_INFO AS trouble_ng_info
            FROM HF1SGM01
            """
            
            result = self.query_executor.execute_query(sql)
            
            if result.success and result.data and len(result.data) > 0:
                count = self.metadata_cache.save_trouble_master(result.data)
                self.logger.info(f"TROUBLE_MASTER更新完了: {count} 件")
                return count
            else:
                self.logger.warning("TROUBLE_MASTERデータが見つかりません")
                return 0
                
        except Exception as e:
            self.logger.error(f"TROUBLE_MASTER更新エラー: {str(e)}")
            raise

    # フィルタリング機能
    def get_station_master_stations(self) -> List[Dict[str, Any]]:
        """ステーション一覧取得"""
        return self.metadata_cache.get_station_master_stations()

    def get_station_master_by_filter(self, **filters) -> List[Dict[str, Any]]:
        """フィルタ条件でSTATION_MASTER取得"""
        return self.metadata_cache.get_station_master_by_filter(**filters)

    def get_master_data_by_station(self, master_type: str, sta_no1: str, sta_no2: str, sta_no3: str) -> List[Dict[str, Any]]:
        """ステーション条件でマスターデータ取得"""
        return self.metadata_cache.get_master_data_by_station(master_type, sta_no1, sta_no2, sta_no3)

    def generate_sql_for_master(self, master_type: str, selected_items: List[Dict[str, Any]],
                              include_columns: Optional[List[str]] = None) -> str:
        """選択されたマスターデータからSQL生成"""
        
        if not selected_items:
            return ""
        
        # テーブル名マッピング
        table_mapping = {
            'station': 'HF1SJM04',
            'measure': 'HF1SJM01',
            'set': 'HF1SJM02',
            'free': 'HF1SJM06',
            'parts': 'HF1SJM07',
            'trouble': 'HF1SJM08'
        }
        
        table_name = table_mapping.get(master_type.lower())
        if not table_name:
            raise ValueError(f"未対応のマスタータイプ: {master_type}")
        
        # WHERE条件構築
        conditions = []
        for item in selected_items:
            condition_parts = []
            
            if master_type.lower() == 'trouble':
                # TROUBLEテーブルは特殊な構造
                if 'trouble_no' in item:
                    condition_parts.append(f"TROUBLE_NO = '{item['trouble_no']}'")
            else:
                # 他のテーブルは共通のステーション情報を持つ
                if 'sta_no1' in item:
                    condition_parts.append(f"STA_NO1 = '{item['sta_no1']}'")
                if 'sta_no2' in item:
                    condition_parts.append(f"STA_NO2 = '{item['sta_no2']}'")
                if 'sta_no3' in item:
                    condition_parts.append(f"STA_NO3 = '{item['sta_no3']}'")
                    
                # 固有フィールド
                if master_type.lower() == 'measure' and 'item_no' in item:
                    condition_parts.append(f"ITEM_NO = '{item['item_no']}'")
                elif master_type.lower() == 'set' and 'set_no' in item:
                    condition_parts.append(f"SET_NO = '{item['set_no']}'")
                elif master_type.lower() == 'free' and 'item_no' in item:
                    condition_parts.append(f"ITEM_NO = '{item['item_no']}'")
                elif master_type.lower() == 'parts' and 'parts_no' in item:
                    condition_parts.append(f"PARTS_NO = '{item['parts_no']}'")
            
            if condition_parts:
                conditions.append(f"({' AND '.join(condition_parts)})")
        
        if not conditions:
            return ""
        
        # SELECT句構築
        select_clause = "*"
        if include_columns:
            select_clause = ", ".join(include_columns)
        
        # SQL生成
        sql = f"""SELECT {select_clause}
FROM {table_name}
WHERE {' OR '.join(conditions)}
ORDER BY 1"""
        
        return sql

    # 個別マスターデータ取得メソッド
    def get_all_station_master(self) -> List[Dict[str, Any]]:
        """STATION_MASTERの全データを取得"""
        return self.metadata_cache.get_station_master()
        
    def get_all_measure_master(self) -> List[Dict[str, Any]]:
        """MEASURE_MASTERの全データを取得"""
        return self.metadata_cache.get_measure_master()
        
    def get_all_set_master(self) -> List[Dict[str, Any]]:
        """SET_MASTERの全データを取得"""
        return self.metadata_cache.get_set_master()
        
    def get_all_free_master(self) -> List[Dict[str, Any]]:
        """FREE_MASTERの全データを取得"""
        return self.metadata_cache.get_free_master()
        
    def get_all_parts_master(self) -> List[Dict[str, Any]]:
        """PARTS_MASTERの全データを取得"""
        return self.metadata_cache.get_parts_master()
        
    def get_all_trouble_master(self) -> List[Dict[str, Any]]:
        """TROUBLE_MASTERの全データを取得"""
        return self.metadata_cache.get_trouble_master()