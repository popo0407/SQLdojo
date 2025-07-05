# -*- coding: utf-8 -*-
"""
ユーザーサービス
ユーザー情報の管理を行う
"""
import sqlite3
from typing import Optional, Dict, Any, List
from app.services.connection_manager_odbc import ConnectionManagerODBC
from app.logger import get_logger
from app.metadata_cache import MetadataCache

logger = get_logger("UserService")

class UserService:
    def __init__(self, metadata_cache: MetadataCache):
        self.cache = metadata_cache

    def _get_conn(self):
        """MetadataCacheのDB接続を再利用"""
        return sqlite3.connect(self.cache.db_path)

    def refresh_users_from_db(self, connection_manager: Optional[ConnectionManagerODBC] = None):
        """
        HF3IGM01テーブルからユーザー情報を取得し、SQLiteに保存
        """
        if connection_manager is None:
            connection_manager = ConnectionManagerODBC()
        sql = "SELECT USER_ID, USER_NAME FROM HF3IGM01"
        try:
            result = connection_manager.execute_query(sql)
            users = [{"user_id": row["USER_ID"], "user_name": row["USER_NAME"]} for row in result]
            
            # DBに保存
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM users")  # 一旦全削除
                cursor.executemany("INSERT INTO users (user_id, user_name) VALUES (?, ?)",
                                   [(user["user_id"], user["user_name"]) for user in users])
                conn.commit()
                
            logger.info(f"ユーザー情報をDBから更新し、キャッシュDBに保存しました。件数: {len(users)}")
            return users
        except Exception as e:
            logger.error(f"ユーザー情報のDB取得・保存に失敗: {e}")
            raise

    def authenticate_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        SQLiteからユーザー情報を取得して認証
        """
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
                user = cursor.fetchone()
                return dict(user) if user else None
        except Exception as e:
            logger.error(f"ユーザー認証エラー: {e}")
            return None

    def get_all_users(self) -> List[Dict[str, Any]]:
        """
        SQLiteから全ユーザー情報を取得
        """
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM users ORDER BY user_id")
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"全ユーザー取得エラー: {e}")
            return [] 