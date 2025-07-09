# app/services/connection_manager_sqlite.py

import sqlite3
from typing import Optional, Dict, Any
from app.logger import get_logger
from app.config_simplified import get_settings

class ConnectionManagerSQLite:
    """SQLite接続管理クラス"""
    
    def __init__(self):
        self.settings = get_settings()
        self.logger = get_logger(__name__)
        self.connection = None

    def connect(self) -> bool:
        """SQLiteデータベースに接続"""
        try:
            # データベースディレクトリを作成
            import os
            db_dir = os.path.dirname(self.settings.sqlite_db_path)
            if db_dir:
                os.makedirs(db_dir, exist_ok=True)
            
            self.connection = sqlite3.connect(self.settings.sqlite_db_path)
            self.logger.info(f"SQLiteデータベースに接続しました: {self.settings.sqlite_db_path}")
            return True
        except Exception as e:
            self.logger.error(f"SQLiteデータベースへの接続に失敗しました: {e}", exc_info=True)
            return False

    def disconnect(self):
        """SQLiteデータベースから切断"""
        try:
            if self.connection:
                self.connection.close()
                self.connection = None
                self.logger.info("SQLiteデータベースから切断しました")
        except Exception as e:
            self.logger.error(f"SQLiteデータベースからの切断中にエラーが発生しました: {e}", exc_info=True)

    def execute_query(self, sql: str, params: Optional[tuple] = None) -> Dict[str, Any]:
        """SQLクエリを実行"""
        try:
            if not self.connection:
                if not self.connect():
                    return {"success": False, "error_message": "データベース接続に失敗しました"}

            cursor = self.connection.cursor()
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)

            # SELECT文の場合は結果を取得
            if sql.strip().upper().startswith('SELECT'):
                columns = [description[0] for description in cursor.description]
                rows = cursor.fetchall()
                data = [dict(zip(columns, row)) for row in rows]
                return {"success": True, "data": data}
            else:
                # INSERT, UPDATE, DELETE文の場合はコミット
                self.connection.commit()
                return {"success": True, "data": None}

        except Exception as e:
            self.logger.error(f"SQLiteクエリ実行中にエラーが発生しました: {e}", exc_info=True)
            return {"success": False, "error_message": str(e)}

    def __enter__(self):
        """コンテキストマネージャーの開始"""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """コンテキストマネージャーの終了"""
        self.disconnect() 