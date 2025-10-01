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

    def _get_conn(self) -> sqlite3.Connection:
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
                
                # ユーザー情報を保存するテーブル (roleカラムを追加)
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    user_name TEXT NOT NULL,
                    role TEXT
                )
                """)

                # ユーザテンプレートを保存するテーブル
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_templates (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    sql TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
                """)

                # 管理者（共通）テンプレートを保存するテーブル
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS admin_templates (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    sql TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """)

                # ユーザーパーツを保存するテーブル
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_parts (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    sql TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
                """)

                # 管理者（共通）パーツを保存するテーブル
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS admin_parts (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    sql TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """)
                
                # ▼▼▼ 以下を末尾に追加 ▼▼▼
                # 表示制御設定を保存するテーブル
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS visibility_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    object_type TEXT NOT NULL,
                    object_name TEXT NOT NULL,
                    role_name TEXT NOT NULL,
                    is_visible INTEGER NOT NULL,
                    UNIQUE(object_name, role_name)
                )
                """)
                
                # ▼▼▼ マスターテーブル群 ▼▼▼
                # STATION_MASTERテーブル
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS station_master (
                    sta_no1 TEXT NOT NULL,
                    place_name TEXT,
                    sta_no2_first_digit TEXT,
                    sta_no2 TEXT,
                    line_name TEXT,
                    sta_no3 TEXT,
                    st_name TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (sta_no1, sta_no2, sta_no3)
                )
                """)
                
                # MEASURE_MASTERテーブル
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS measure_master (
                    sta_no1 TEXT NOT NULL,
                    sta_no2 TEXT NOT NULL,
                    sta_no3 TEXT NOT NULL,
                    step INTEGER NOT NULL,
                    measure TEXT NOT NULL,
                    item_name TEXT,
                    division_figure INTEGER,
                    measure_info TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (sta_no1, sta_no2, sta_no3, step, measure)
                )
                """)
                
                # SET_MASTERテーブル
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS set_master (
                    sta_no1 TEXT NOT NULL,
                    sta_no2 TEXT NOT NULL,
                    sta_no3 TEXT NOT NULL,
                    step INTEGER NOT NULL,
                    setdata TEXT NOT NULL,
                    item_name TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (sta_no1, sta_no2, sta_no3, step, setdata)
                )
                """)
                
                # FREE_MASTERテーブル
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS free_master (
                    sta_no1 TEXT NOT NULL,
                    sta_no2 TEXT NOT NULL,
                    sta_no3 TEXT NOT NULL,
                    step INTEGER NOT NULL,
                    freedata TEXT NOT NULL,
                    item_name TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (sta_no1, sta_no2, sta_no3, step, freedata)
                )
                """)
                
                # PARTS_MASTERテーブル
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS parts_master (
                    sta_no1 TEXT NOT NULL,
                    sta_no2 TEXT NOT NULL,
                    sta_no3 TEXT NOT NULL,
                    main_parts_name TEXT,
                    sub_parts TEXT NOT NULL,
                    sub_parts_name TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (sta_no1, sta_no2, sta_no3, sub_parts)
                )
                """)
                
                # TROUBLE_MASTERテーブル
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS trouble_master (
                    sta_no1 TEXT NOT NULL,
                    sta_no2 TEXT NOT NULL,
                    sta_no3 TEXT NOT NULL,
                    code_no INTEGER NOT NULL,
                    trouble_ng_info TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (sta_no1, sta_no2, sta_no3, code_no)
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
                self.logger.debug("メタデータキャッシュを更新しました")
        except Exception as e:
            self.logger.error(f"メタデータキャッシュの保存に失敗: {str(e)}")
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

    # ▼▼▼ マスターデータ操作メソッド ▼▼▼
    
    def save_station_master(self, data: List[Dict[str, Any]]) -> int:
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM station_master")
                
                for i, row in enumerate(data):
                    # デバッグ: 最初の行の詳細を出力
                    if i == 0:
                        self.logger.info(f"保存データサンプル: {row}")
                        self.logger.info(f"使用可能なキー: {list(row.keys())}")
                    
                    # SQLクエリ結果の小文字キーに対応
                    cursor.execute("""
                        INSERT INTO station_master 
                        (sta_no1, place_name, sta_no2_first_digit, sta_no2, line_name, sta_no3, st_name)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        row.get('sta_no1'),
                        row.get('place_name'),
                        row.get('sta_no2_first_digit'),
                        row.get('sta_no2'),
                        row.get('line_name'),
                        row.get('sta_no3'),
                        row.get('st_name')
                    ))
                conn.commit()
                self.logger.info(f"STATION_MASTERデータを保存しました: {len(data)}件")
                return len(data)
        except Exception as e:
            self.logger.error("STATION_MASTERデータの保存に失敗", exception=e)
            raise

    def save_measure_master(self, data: List[Dict[str, Any]]) -> int:
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM measure_master")
                
                for row in data:
                    cursor.execute("""
                        INSERT INTO measure_master 
                        (sta_no1, sta_no2, sta_no3, step, measure, item_name, division_figure, measure_info)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        row.get('sta_no1'),
                        row.get('sta_no2'),
                        row.get('sta_no3'),
                        int(row.get('step')) if row.get('step') is not None else None,
                        row.get('measure'),
                        row.get('item_name'),
                        int(row.get('division_figure')) if row.get('division_figure') is not None else None,
                        row.get('measure_info')
                    ))
                conn.commit()
                self.logger.info(f"MEASURE_MASTERデータを保存しました: {len(data)}件")
                return len(data)
        except Exception as e:
            self.logger.error("MEASURE_MASTERデータの保存に失敗", exception=e)
            raise

    def save_set_master(self, data: List[Dict[str, Any]]):
        """SET_MASTERデータを保存"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM set_master")
                
                for row in data:
                    cursor.execute("""
                        INSERT INTO set_master 
                        (sta_no1, sta_no2, sta_no3, step, setdata, item_name)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        row.get('sta_no1'),
                        row.get('sta_no2'),
                        row.get('sta_no3'),
                        int(row.get('step')) if row.get('step') is not None else None,
                        row.get('setdata'),
                        row.get('item_name')
                    ))
                conn.commit()
                self.logger.info(f"SET_MASTERデータを保存しました: {len(data)}件")
                return len(data)
        except Exception as e:
            self.logger.error("SET_MASTERデータの保存に失敗", exception=e)
            raise

    def save_free_master(self, data: List[Dict[str, Any]]):
        """FREE_MASTERデータを保存"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM free_master")
                
                for row in data:
                    cursor.execute("""
                        INSERT INTO free_master 
                        (sta_no1, sta_no2, sta_no3, step, freedata, item_name)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        row.get('sta_no1'),
                        row.get('sta_no2'),
                        row.get('sta_no3'),
                        int(row.get('step')) if row.get('step') is not None else None,
                        row.get('freedata'),
                        row.get('item_name')
                    ))
                conn.commit()
                self.logger.info(f"FREE_MASTERデータを保存しました: {len(data)}件")
                return len(data)
        except Exception as e:
            self.logger.error("FREE_MASTERデータの保存に失敗", exception=e)
            raise

    def save_parts_master(self, data: List[Dict[str, Any]]):
        """PARTS_MASTERデータを保存"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM parts_master")
                
                for row in data:
                    cursor.execute("""
                        INSERT INTO parts_master 
                        (sta_no1, sta_no2, sta_no3, main_parts_name, sub_parts, sub_parts_name)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        row.get('sta_no1'),
                        row.get('sta_no2'),
                        row.get('sta_no3'),
                        row.get('main_parts_name'),
                        row.get('sub_parts'),
                        row.get('sub_parts_name')
                    ))
                conn.commit()
                self.logger.info(f"PARTS_MASTERデータを保存しました: {len(data)}件")
                return len(data)
        except Exception as e:
            self.logger.error("PARTS_MASTERデータの保存に失敗", exception=e)
            raise

    def save_trouble_master(self, data: List[Dict[str, Any]]):
        """TROUBLE_MASTERデータを保存"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM trouble_master")
                
                for row in data:
                    cursor.execute("""
                        INSERT INTO trouble_master 
                        (sta_no1, sta_no2, sta_no3, code_no, trouble_ng_info)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        row.get('sta_no1'),
                        row.get('sta_no2'),
                        row.get('sta_no3'),
                        int(row.get('code_no')) if row.get('code_no') is not None else None,
                        row.get('trouble_ng_info')
                    ))
                conn.commit()
                self.logger.info(f"TROUBLE_MASTERデータを保存しました: {len(data)}件")
                return len(data)
        except Exception as e:
            self.logger.error("TROUBLE_MASTERデータの保存に失敗", exception=e)
            raise

    # マスターデータ取得メソッド
    
    def get_station_master_stations(self) -> List[Dict[str, Any]]:
        """重複を排除したSTA_NO1,PLACE_NAMEの表を取得"""
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT DISTINCT sta_no1, place_name 
                    FROM station_master 
                    WHERE sta_no1 IS NOT NULL AND place_name IS NOT NULL
                    ORDER BY sta_no1
                """)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error("STATION_MASTER駅一覧の取得に失敗", exception=e)
            return []

    def get_station_master_by_filter(self, **filters) -> List[Dict[str, Any]]:
        """条件を指定してSTATION_MASTERデータを取得"""
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                where_conditions = []
                params = []
                
                if filters.get('sta_no1'):
                    where_conditions.append("sta_no1 = ?")
                    params.append(filters['sta_no1'])
                if filters.get('place_name'):
                    where_conditions.append("place_name = ?")
                    params.append(filters['place_name'])
                if filters.get('sta_no2_first_digit'):
                    where_conditions.append("sta_no2_first_digit = ?")
                    params.append(filters['sta_no2_first_digit'])
                if filters.get('sta_no2'):
                    where_conditions.append("sta_no2 = ?")
                    params.append(filters['sta_no2'])
                if filters.get('line_name'):
                    where_conditions.append("line_name = ?")
                    params.append(filters['line_name'])
                if filters.get('sta_no3'):
                    where_conditions.append("sta_no3 = ?")
                    params.append(filters['sta_no3'])
                if filters.get('st_name'):
                    where_conditions.append("st_name = ?")
                    params.append(filters['st_name'])
                
                where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
                
                sql = f"""
                    SELECT DISTINCT sta_no1, place_name, sta_no2_first_digit, sta_no2, line_name, sta_no3, st_name
                    FROM station_master 
                    WHERE {where_clause}
                    ORDER BY sta_no1, sta_no2, sta_no3
                """
                
                cursor.execute(sql, params)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error("STATION_MASTERフィルタ取得に失敗", exception=e)
            return []

    def get_master_data_by_station(self, master_type: str, sta_no1: str, sta_no2: str, sta_no3: str) -> List[Dict[str, Any]]:
        """指定されたSTA_NO1,STA_NO2,STA_NO3でマスターデータを取得"""
        try:
            table_name = f"{master_type.lower()}_master"
            
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                if master_type.upper() == 'MEASURE':
                    cursor.execute(f"""
                        SELECT step, measure, item_name, division_figure, measure_info
                        FROM {table_name}
                        WHERE sta_no1 = ? AND sta_no2 = ? AND sta_no3 = ?
                        ORDER BY step, measure
                    """, (sta_no1, sta_no2, sta_no3))
                elif master_type.upper() == 'SET':
                    cursor.execute(f"""
                        SELECT step, setdata, item_name
                        FROM {table_name}
                        WHERE sta_no1 = ? AND sta_no2 = ? AND sta_no3 = ?
                        ORDER BY step, setdata
                    """, (sta_no1, sta_no2, sta_no3))
                elif master_type.upper() == 'FREE':
                    cursor.execute(f"""
                        SELECT step, freedata, item_name
                        FROM {table_name}
                        WHERE sta_no1 = ? AND sta_no2 = ? AND sta_no3 = ?
                        ORDER BY step, freedata
                    """, (sta_no1, sta_no2, sta_no3))
                elif master_type.upper() == 'PARTS':
                    cursor.execute(f"""
                        SELECT main_parts_name, sub_parts, sub_parts_name
                        FROM {table_name}
                        WHERE sta_no1 = ? AND sta_no2 = ? AND sta_no3 = ?
                        ORDER BY sub_parts
                    """, (sta_no1, sta_no2, sta_no3))
                elif master_type.upper() == 'TROUBLE':
                    cursor.execute(f"""
                        SELECT code_no, trouble_ng_info
                        FROM {table_name}
                        WHERE sta_no1 = ? AND sta_no2 = ? AND sta_no3 = ?
                        ORDER BY code_no
                    """, (sta_no1, sta_no2, sta_no3))
                else:
                    self.logger.error(f"不正なマスタータイプ: {master_type}")
                    return []
                
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error(f"{master_type}マスターデータの取得に失敗", exception=e)
            return []

    # 個別マスターデータ取得メソッド
    def get_station_master(self) -> List[Dict[str, Any]]:
        """STATION_MASTERの全データを取得"""
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT sta_no1, place_name, sta_no2, line_name, sta_no3, st_name
                    FROM station_master
                    ORDER BY sta_no1, sta_no2, sta_no3
                """)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error("STATION_MASTERデータの取得に失敗", exception=e)
            return []
            
    def get_measure_master(self) -> List[Dict[str, Any]]:
        """MEASURE_MASTERの全データを取得"""
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT sta_no1, sta_no2, sta_no3, step, item_name, measure_info, measure, division_figure
                    FROM measure_master
                    ORDER BY sta_no1, sta_no2, sta_no3, step, item_name
                """)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error("MEASURE_MASTERデータの取得に失敗", exception=e)
            return []
            
    def get_set_master(self) -> List[Dict[str, Any]]:
        """SET_MASTERの全データを取得"""
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT sta_no1, sta_no2, sta_no3, step, item_name, setdata
                    FROM set_master
                    ORDER BY sta_no1, sta_no2, sta_no3, step, item_name
                """)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error("SET_MASTERデータの取得に失敗", exception=e)
            return []
            
    def get_free_master(self) -> List[Dict[str, Any]]:
        """FREE_MASTERの全データを取得"""
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT sta_no1, sta_no2, sta_no3, step, item_name, freedata
                    FROM free_master
                    ORDER BY sta_no1, sta_no2, sta_no3, step, item_name
                """)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error("FREE_MASTERデータの取得に失敗", exception=e)
            return []
            
    def get_parts_master(self) -> List[Dict[str, Any]]:
        """PARTS_MASTERの全データを取得"""
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT sta_no1, sta_no2, sta_no3, main_parts_name, sub_parts, sub_parts_name
                    FROM parts_master
                    ORDER BY sta_no1, sta_no2, sta_no3, sub_parts
                """)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error("PARTS_MASTERデータの取得に失敗", exception=e)
            return []
            
    def get_trouble_master(self) -> List[Dict[str, Any]]:
        """TROUBLE_MASTERの全データを取得"""
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT sta_no1, sta_no2, sta_no3, code_no, trouble_ng_info
                    FROM trouble_master
                    ORDER BY sta_no1, sta_no2, sta_no3, code_no
                """)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error("TROUBLE_MASTERデータの取得に失敗", exception=e)
            return [] 