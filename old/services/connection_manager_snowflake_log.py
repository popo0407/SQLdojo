# app/services/connection_manager_snowflake_log.py

import os
import pyodbc
import logging
from typing import Optional, Dict, Any, Tuple
from datetime import datetime
from app.logger import get_logger
from app.config_simplified import get_settings
from app.exceptions import DatabaseError as AppDatabaseError

# Snowflakeコネクタのログレベルを設定
logging.getLogger('snowflake.connector').setLevel(logging.ERROR)
logging.getLogger('snowflake.connector.connection').setLevel(logging.ERROR)
logging.getLogger('snowflake.connector.cursor').setLevel(logging.ERROR)

class ConnectionManagerSnowflakeLog:
    """Snowflakeログ用接続管理クラス"""
    
    def __init__(self):
        self.settings = get_settings()
        self.logger = get_logger(__name__)
        self.connection = None
        
        # ログ専用設定の確認とフォールバック
        self._log_account = self.settings.snowflake_log_account or self.settings.snowflake_account
        self._log_user = self.settings.snowflake_log_user or self.settings.snowflake_user
        self._log_private_key_path = self.settings.snowflake_log_private_key_path or self.settings.snowflake_private_key_path
        self._log_private_key_passphrase = self.settings.snowflake_log_private_key_passphrase or self.settings.snowflake_private_key_passphrase
        self._log_warehouse = self.settings.snowflake_log_warehouse or self.settings.snowflake_warehouse
        self._log_database = self.settings.snowflake_log_database or self.settings.snowflake_database
        self._log_schema = self.settings.snowflake_log_schema
        self._log_role = self.settings.snowflake_log_role or self.settings.snowflake_role

    def connect(self) -> bool:
        """SnowflakeにODBC接続（ログ専用、キーペア認証）"""
        try:
            self.logger.info("Snowflakeログ用ODBC接続を開始します")
            
            # 秘密鍵ファイルの存在確認
            if not os.path.exists(self._log_private_key_path):
                self.logger.error(f"秘密鍵ファイルが存在しません: {self._log_private_key_path}")
                return False
            
            # アカウント識別子の形式を修正
            account = self._log_account
            if not account.endswith('.snowflakecomputing.com'):
                account = f"{account}.snowflakecomputing.com"
            
            # Snowflake ODBC接続文字列（キーペア認証）
            conn_str = (
                f"DRIVER={{SnowflakeDSIIDriver}};"
                f"SERVER={account};"
                f"UID={self._log_user};"
                f"AUTHENTICATOR=SNOWFLAKE_JWT;"
                f"PRIV_KEY_FILE={self._log_private_key_path};"
                f"PRIV_KEY_FILE_PWD={self._log_private_key_passphrase};"
                f"WAREHOUSE={self._log_warehouse};"
                f"DATABASE={self._log_database};"
                f"SCHEMA={self._log_schema};"
            )
            
            # ロールが設定されている場合は追加
            if self._log_role:
                conn_str += f"ROLE={self._log_role};"
            
            # デバッグ用：接続文字列をログに出力（パスワードは隠す）
            debug_conn_str = conn_str.replace(f"PRIV_KEY_FILE_PWD={self._log_private_key_passphrase};", "PRIV_KEY_FILE_PWD=***;")
            self.logger.info(f"ログ用ODBC接続文字列: {debug_conn_str}")
            
            # ODBC接続を作成
            self.connection = pyodbc.connect(conn_str, timeout=30, autocommit=True)
            
            self.logger.info("Snowflakeログ用ODBC接続を確立しました")
            return True
        except Exception as e:
            self.logger.error(f"Snowflakeログ用ODBC接続に失敗しました: {e}")
            return False

    def get_connection(self) -> Tuple[str, pyodbc.Connection]:
        """接続を取得（QueryExecutorとの互換性のため）"""
        if not self.connection:
            if not self.connect():
                raise Exception("Snowflakeログ用接続に失敗しました")
        return "snowflake_log", self.connection

    def release_connection(self, connection_id: str):
        """接続を解放（QueryExecutorとの互換性のため）"""
        # Snowflakeログ用は単一接続なので何もしない
        pass

    def disconnect(self):
        """Snowflakeから切断"""
        try:
            if self.connection:
                self.connection.close()
                self.connection = None
                self.logger.info("Snowflakeログ用接続を切断しました")
        except Exception as e:
            self.logger.error(f"Snowflakeログ用接続の切断中にエラーが発生しました: {e}")

    def execute_query(self, sql: str, params: Optional[tuple] = None) -> Dict[str, Any]:
        """SQLクエリを実行"""
        try:
            self.logger.info(f"Snowflakeログ用クエリ実行開始")
            
            if not self.connection:
                self.logger.info("接続が存在しないため、新規接続を試行します")
                if not self.connect():
                    self.logger.error("データベース接続に失敗しました")
                    return {"success": False, "error_message": "データベース接続に失敗しました"}

            cursor = self.connection.cursor()
            self.logger.info("カーソルを作成しました")
            
            # クエリを実行
            self.logger.info("SQLを実行します")
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            self.logger.info("SQL実行完了")

            # SELECT文の場合は結果を取得
            if sql.strip().upper().startswith('SELECT'):
                self.logger.info("SELECT文のため結果を取得します")
                columns = [column[0] for column in cursor.description]
                rows = cursor.fetchall()
                data = [dict(zip(columns, row)) for row in rows]
                self.logger.info(f"結果取得完了: {len(data)}件")
                cursor.close()
                return {"success": True, "data": data}
            else:
                # INSERT, UPDATE, DELETE文の場合（ODBCはautocommit=Trueで設定済み）
                self.logger.info("INSERT/UPDATE/DELETE文が実行されました")
                cursor.close()
                return {"success": True, "data": None}

        except Exception as e:
            self.logger.error(f"Snowflakeログ用クエリ実行中にエラーが発生しました: {e}")
            return {"success": False, "error_message": str(e)}

    def test_connection(self) -> bool:
        """接続テスト"""
        try:
            return self.connect()
        finally:
            self.disconnect()

    def get_pool_status(self) -> Dict[str, Any]:
        """プール状態を取得（QueryExecutorとの互換性のため）"""
        return {
            "connection_type": "snowflake_log",
            "connected": self.connection is not None,
            "pool_size": 1
        }

    def __enter__(self):
        """コンテキストマネージャーの開始"""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """コンテキストマネージャーの終了"""
        self.disconnect() 