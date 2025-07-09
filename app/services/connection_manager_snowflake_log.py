# app/services/connection_manager_snowflake_log.py

import os
import snowflake.connector
from typing import Optional, Dict, Any, Tuple
from app.logger import get_logger
from app.config_simplified import get_settings

class ConnectionManagerSnowflakeLog:
    """Snowflakeログ用接続管理クラス"""
    
    def __init__(self):
        self.settings = get_settings()
        self.logger = get_logger(__name__)
        self.connection = None

    def connect(self) -> bool:
        """Snowflakeに接続（ログ専用）"""
        try:
            self.logger.info("Snowflakeログ用接続を開始します")
            self.logger.info(f"接続設定:")
            self.logger.info(f"  - Account: {self.settings.snowflake_account}")
            self.logger.info(f"  - User: {self.settings.snowflake_user}")
            self.logger.info(f"  - Private Key Path: {self.settings.snowflake_private_key_path}")
            self.logger.info(f"  - Warehouse: {self.settings.snowflake_warehouse}")
            self.logger.info(f"  - Database: {self.settings.snowflake_database}")
            self.logger.info(f"  - Schema: Log")
            self.logger.info(f"  - Role: {self.settings.snowflake_role}")
            
            # 秘密鍵ファイルの存在確認
            if not os.path.exists(self.settings.snowflake_private_key_path):
                self.logger.error(f"秘密鍵ファイルが存在しません: {self.settings.snowflake_private_key_path}")
                return False
            
            # ログ専用の接続設定
            self.connection = snowflake.connector.connect(
                account=self.settings.snowflake_account,
                user=self.settings.snowflake_user,
                private_key_path=self.settings.snowflake_private_key_path,
                private_key_passphrase=self.settings.snowflake_private_key_passphrase,
                warehouse=self.settings.snowflake_warehouse,
                database=self.settings.snowflake_database,
                schema='Log',  # ログ専用スキーマ
                role=self.settings.snowflake_role if self.settings.snowflake_role else None,
                session_parameters={
                    'TIMEZONE': 'Asia/Tokyo',
                    'AUTOCOMMIT': True
                }
            )
            self.logger.info("Snowflakeログ用接続を確立しました")
            return True
        except Exception as e:
            self.logger.error(f"Snowflakeログ用接続に失敗しました: {e}", exc_info=True)
            return False

    def get_connection(self) -> Tuple[str, snowflake.connector.SnowflakeConnection]:
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
            self.logger.error(f"Snowflakeログ用接続の切断中にエラーが発生しました: {e}", exc_info=True)

    def execute_query(self, sql: str, params: Optional[tuple] = None) -> Dict[str, Any]:
        """SQLクエリを実行"""
        try:
            self.logger.info(f"Snowflakeログ用クエリ実行開始: {sql[:100]}...")
            self.logger.info(f"パラメータ: {params}")
            
            if not self.connection:
                self.logger.info("接続が存在しないため、新規接続を試行します")
                if not self.connect():
                    self.logger.error("データベース接続に失敗しました")
                    return {"success": False, "error_message": "データベース接続に失敗しました"}

            self.logger.info("カーソルを作成します")
            cursor = self.connection.cursor()
            
            self.logger.info("クエリを実行します")
            if params:
                self.logger.info(f"パラメータ付きで実行: {params}")
                self.logger.info(f"パラメータの型: {type(params)}")
                self.logger.info(f"パラメータの内容: {[type(p) for p in params]}")
                # Snowflakeでは%sプレースホルダーを使用
                cursor.execute(sql, params)
            else:
                self.logger.info("パラメータなしで実行")
                cursor.execute(sql)

            self.logger.info("クエリ実行完了")

            # SELECT文の場合は結果を取得
            if sql.strip().upper().startswith('SELECT'):
                self.logger.info("SELECT文のため結果を取得します")
                columns = [desc[0] for desc in cursor.description]
                rows = cursor.fetchall()
                data = [dict(zip(columns, row)) for row in rows]
                self.logger.info(f"結果取得完了: {len(data)}件")
                return {"success": True, "data": data}
            else:
                # INSERT, UPDATE, DELETE文の場合はコミット
                self.logger.info("INSERT/UPDATE/DELETE文のためコミットします")
                self.connection.commit()
                self.logger.info("コミット完了")
                return {"success": True, "data": None}

        except Exception as e:
            self.logger.error(f"Snowflakeログ用クエリ実行中にエラーが発生しました: {e}")
            self.logger.error(f"エラーの詳細: {type(e).__name__}: {str(e)}")
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