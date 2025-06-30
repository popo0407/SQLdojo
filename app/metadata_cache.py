# -*- coding: utf-8 -*-
"""
メタデータSQLiteキャッシュ管理モジュール
"""
import sqlite3
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from app.logger import get_logger

class MetadataCache:
    """SQLiteを使用したメタデータの永続的キャッシュ（正規化形式）"""

    def __init__(self, db_path: str = "metadata_cache.db", expires_hours: int = 24):
        self.db_path = Path(db_path)
        self.expires_delta = timedelta(hours=expires_hours)
        self.logger = get_logger(__name__)
        self._init_db()

    def _get_conn(self):
        """DB接続を取得"""
        return sqlite3.connect(self.db_path)

    def _init_db(self):
        """データベースとテーブルを初期化"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                
                # スキーマ情報を保存するテーブル
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS schemas (
                    name TEXT PRIMARY KEY,
                    owner TEXT,
                    created_on TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """)

                # テーブル情報を保存するテーブル
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS tables (
                    name TEXT NOT NULL,
                    schema_name TEXT NOT NULL,
                    table_type TEXT,
                    row_count INTEGER,
                    created_on TEXT,
                    last_altered TEXT,
                    comment TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (schema_name, name)
                )
                """)

                # カラム情報を保存するテーブル
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS columns (
                    name TEXT NOT NULL,
                    table_name TEXT NOT NULL,
                    schema_name TEXT NOT NULL,
                    data_type TEXT,
                    is_nullable BOOLEAN,
                    comment TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (schema_name, table_name, name)
                )
                """)
                
                conn.commit()
        except Exception as e:
            self.logger.error("メタデータキャッシュDBの初期化に失敗", exception=e)

    def save_all_metadata_normalized(self, all_metadata: List[Dict[str, Any]]):
        """全てのメタデータを正規化してDBに保存"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                # 全データを一度削除
                cursor.execute("DELETE FROM schemas")
                cursor.execute("DELETE FROM tables")
                cursor.execute("DELETE FROM columns")

                for schema_data in all_metadata:
                    # スキーマ情報を保存
                    schema_sql = "INSERT OR IGNORE INTO schemas (name, owner, created_on) VALUES (?, ?, ?)"
                    schema_params = (schema_data.get('name'), schema_data.get('owner'), schema_data.get('created_on'))
                    cursor.execute(schema_sql, schema_params)
                    
                    for table_data in schema_data.get('tables', []):
                        # row_count, created_on, last_altered, comment型変換
                        row_count = table_data.get('row_count')
                        if row_count is not None:
                            try:
                                row_count = int(row_count)
                            except Exception:
                                row_count = None
                        table_sql = """INSERT OR IGNORE INTO tables (name, schema_name, table_type, row_count, created_on, last_altered, comment) 
                                      VALUES (?, ?, ?, ?, ?, ?, ?)"""
                        table_params = (
                            table_data.get('name'),
                            schema_data.get('name'),
                            table_data.get('table_type'),
                            row_count,
                            table_data.get('created_on'),
                            table_data.get('last_altered'),
                            table_data.get('comment')
                        )
                        cursor.execute(table_sql, table_params)
                        
                        for column_data in table_data.get('columns', []):
                            # is_nullable型変換
                            is_nullable = column_data.get('is_nullable')
                            if is_nullable is not None:
                                is_nullable = bool(is_nullable)
                            # ordinal_position, default_valueは保存しない
                            column_sql = """INSERT OR IGNORE INTO columns (name, table_name, schema_name, data_type, is_nullable, comment)
                                          VALUES (?, ?, ?, ?, ?, ?)"""
                            column_params = (
                                column_data.get('name'),
                                table_data.get('name'),
                                schema_data.get('name'),
                                column_data.get('data_type'),
                                is_nullable,
                                column_data.get('comment')
                            )
                            cursor.execute(column_sql, column_params)
                conn.commit()
                self.logger.info("メタデータキャッシュを更新しました")
        except Exception as e:
            self.logger.error("メタデータキャッシュの保存に失敗", error=str(e))
            # 例外を再発生させる
            raise

    def load_schemas(self) -> List[Dict[str, Any]]:
        """SQLiteからスキーマ一覧を取得"""
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                sql = "SELECT * FROM schemas ORDER BY name"
                cursor.execute(sql)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error("スキーマ一覧の取得に失敗", exception=e)
            return []

    def load_tables(self, schema_name: str) -> List[Dict[str, Any]]:
        """SQLiteから指定されたスキーマのテーブル一覧を取得"""
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                sql = "SELECT * FROM tables WHERE schema_name = ? ORDER BY name"
                params = (schema_name,)
                cursor.execute(sql, params)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error(f"スキーマ {schema_name} のテーブル一覧取得に失敗", exception=e)
            return []

    def load_columns(self, schema_name: str, table_name: str) -> List[Dict[str, Any]]:
        """SQLiteから指定されたテーブルのカラム一覧を取得"""
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                sql = "SELECT * FROM columns WHERE schema_name = ? AND table_name = ? ORDER BY name"
                params = (schema_name, table_name)
                cursor.execute(sql, params)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error(f"テーブル {schema_name}.{table_name} のカラム一覧取得に失敗", exception=e)
            return []

    def load_all_metadata_hierarchical(self) -> Optional[List[Dict[str, Any]]]:
        """正規化キャッシュから階層構造のメタデータを取得"""
        try:
            schemas = self.load_schemas()
            all_metadata = []
            
            for schema in schemas:
                schema_name = schema['name']
                tables = self.load_tables(schema_name)
                
                for table in tables:
                    table_name = table['name']
                    columns = self.load_columns(schema_name, table_name)
                    table['columns'] = columns
                
                schema['tables'] = tables
                all_metadata.append(schema)
            
            return all_metadata
        except Exception as e:
            self.logger.error("階層構造メタデータの取得に失敗", exception=e)
            return None

    def get_all_metadata_normalized(self) -> Optional[List[Dict[str, Any]]]:
        """正規化キャッシュから階層構造のメタデータを取得（エイリアス）"""
        return self.load_all_metadata_hierarchical()

    def clear_cache(self):
        """キャッシュを削除"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM schemas")
                cursor.execute("DELETE FROM tables")
                cursor.execute("DELETE FROM columns")
                conn.commit()
                self.logger.info("メタデータキャッシュをクリアしました。")
        except Exception as e:
            self.logger.error("キャッシュのクリアに失敗", exception=e)

    def is_cache_valid(self) -> bool:
        """キャッシュが有効かどうかをチェック"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM schemas")
                count = cursor.fetchone()[0]
                return count > 0
        except Exception as e:
            self.logger.error("キャッシュ有効性チェックに失敗", exception=e)
            return False 