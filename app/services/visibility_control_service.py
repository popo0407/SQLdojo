import sqlite3
from typing import List, Dict, Any
from app.metadata_cache import MetadataCache
from app.logger import get_logger

class VisibilityControlService:
    def __init__(self, metadata_cache: MetadataCache):
        self.cache = metadata_cache
        self.logger = get_logger(__name__)

    def _get_conn(self):
        return sqlite3.connect(self.cache.db_path)

    def get_all_settings(self) -> Dict[str, Dict[str, bool]]:
        """管理者UI用に全ての表示設定を取得します。"""
        settings = {}
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT object_name, role_name, is_visible FROM visibility_settings")
                for row in cursor.fetchall():
                    if row['object_name'] not in settings:
                        settings[row['object_name']] = {}
                    settings[row['object_name']][row['role_name']] = bool(row['is_visible'])
            return settings
        except Exception as e:
            self.logger.error("表示設定の取得エラー", exception=e)
            return {}

    def save_settings(self, settings_list: List[Any]):
        """管理者UIからの設定を保存します。"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                sql = "INSERT OR REPLACE INTO visibility_settings (object_type, object_name, role_name, is_visible) VALUES (?, ?, ?, ?)"
                data_to_save = []
                for s in settings_list:
                    object_name = s.object_name
                    role_name = s.role_name
                    is_visible = int(s.is_visible)
                    # object_type判定
                    if '.' in object_name:
                        object_type = 'TABLE'
                    else:
                        object_type = 'SCHEMA'
                    data_to_save.append((object_type, object_name, role_name, is_visible))
                cursor.executemany(sql, data_to_save)
                conn.commit()
            self.logger.info(f"表示設定を {len(data_to_save)} 件保存しました。")
        except Exception as e:
            self.logger.error("表示設定の保存エラー", exception=e)
            raise

    def filter_metadata(self, metadata: List[Dict[str, Any]], role: str) -> List[Dict[str, Any]]:
        """ユーザーのロールに基づいてメタデータをフィルタリングします。"""
        settings = self.get_all_settings()
        self.logger.info(f"[DEBUG] filter_metadata: role={role}")
        self.logger.info(f"[DEBUG] settings.keys={list(settings.keys())}")
        if not settings:
            self.logger.info("[DEBUG] settings is empty, returning all metadata")
            return metadata

        filtered_metadata = []
        for schema_data in metadata:
            schema_name = schema_data.get("name")
            schema_settings = settings.get(schema_name, {})
            self.logger.info(f"[DEBUG] schema: {schema_name}, schema_settings={schema_settings}")
            
            # スキーマの表示設定を取得
            if role in schema_settings:
                is_schema_visible = schema_settings[role]
                self.logger.info(f"[DEBUG] schema {schema_name}: role({role}) found, is_schema_visible={is_schema_visible}")
            else:
                is_schema_visible = schema_settings.get('DEFAULT', True)
                self.logger.info(f"[DEBUG] schema {schema_name}: role({role}) not found, DEFAULT used, is_schema_visible={is_schema_visible}")

            # テーブルのフィルタリング（スキーマの表示設定に関係なく実行）
            filtered_tables = []
            for table_data in schema_data.get("tables", []):
                table_full_name = f"{schema_name}.{table_data.get('name')}"
                table_settings = settings.get(table_full_name, {})
                self.logger.info(f"[DEBUG] table: {table_full_name}, table_settings={table_settings}")
                if role in table_settings:
                    is_table_visible = table_settings[role]
                    self.logger.info(f"[DEBUG] table {table_full_name}: role({role}) found, is_table_visible={is_table_visible}")
                else:
                    is_table_visible = table_settings.get('DEFAULT', True)
                    self.logger.info(f"[DEBUG] table {table_full_name}: role({role}) not found, DEFAULT used, is_table_visible={is_table_visible}")
                if is_table_visible:
                    filtered_tables.append(table_data)
            
            # スキーマが表示対象、またはテーブルが1つでも表示対象の場合にスキーマを含める
            if is_schema_visible or filtered_tables:
                filtered_schema = schema_data.copy()
                filtered_schema["tables"] = filtered_tables
                # スキーマが非表示でテーブルのみ表示の場合、スキーマ情報にマークを付ける
                if not is_schema_visible and filtered_tables:
                    filtered_schema["schema_hidden"] = True
                    self.logger.info(f"[DEBUG] schema {schema_name}: schema hidden but tables visible")
                filtered_metadata.append(filtered_schema)
                
        self.logger.info(f"[DEBUG] filtered_metadata schema count: {len(filtered_metadata)}")
        return filtered_metadata 