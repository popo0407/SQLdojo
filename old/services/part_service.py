# -*- coding: utf-8 -*-
"""
パーツサービス
パーツの管理を行う
"""
import sqlite3
import uuid
from datetime import datetime
from typing import List, Dict, Any
from app.metadata_cache import MetadataCache
from app.logger import get_logger


class PartService:
    """パーツ管理サービス"""
    
    def __init__(self, metadata_cache: MetadataCache):
        self.cache = metadata_cache
        self.logger = get_logger(__name__)

    def _get_conn(self):
        """MetadataCacheのDB接続を再利用"""
        return sqlite3.connect(self.cache.db_path)

    def get_admin_parts(self) -> List[Dict[str, Any]]:
        """管理者パーツ一覧を取得"""
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM admin_parts ORDER BY name")
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error("管理者パーツ取得エラー", exception=e)
            return []

    def create_admin_part(self, name: str, sql: str) -> Dict[str, Any]:
        """管理者パーツを作成"""
        try:
            new_part = {
                "id": str(uuid.uuid4()),
                "name": name,
                "sql": sql,
                "created_at": datetime.now().isoformat()
            }
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO admin_parts (id, name, sql, created_at) VALUES (?, ?, ?, ?)",
                    (new_part["id"], new_part["name"], new_part["sql"], new_part["created_at"])
                )
                conn.commit()
            self.logger.info("管理者パーツを作成しました", part_id=new_part["id"])
            return new_part
        except Exception as e:
            self.logger.error("管理者パーツ作成エラー", exception=e)
            raise

    def delete_admin_part(self, part_id: str):
        """管理者パーツを削除"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM admin_parts WHERE id = ?", (part_id,))
                conn.commit()
            self.logger.info("管理者パーツを削除しました", part_id=part_id)
        except Exception as e:
            self.logger.error("管理者パーツ削除エラー", exception=e)
            raise

    def get_user_parts(self, user_id: str) -> List[Dict[str, Any]]:
        """ユーザーパーツ一覧を取得"""
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM user_parts WHERE user_id = ? ORDER BY name", (user_id,))
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error("ユーザーパーツ取得エラー", exception=e, user_id=user_id)
            return []

    def create_user_part(self, user_id: str, name: str, sql: str) -> Dict[str, Any]:
        """ユーザーパーツを作成"""
        try:
            new_part = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "name": name,
                "sql": sql,
                "created_at": datetime.now().isoformat()
            }
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO user_parts (id, user_id, name, sql, created_at) VALUES (?, ?, ?, ?, ?)",
                    (new_part["id"], new_part["user_id"], new_part["name"], new_part["sql"], new_part["created_at"])
                )
                conn.commit()
            self.logger.info("ユーザーパーツを作成しました", part_id=new_part["id"], user_id=user_id)
            
            # ユーザー表示設定に新しいパーツを追加
            self._add_part_to_user_preferences(new_part["id"], "user", user_id)
            
            return new_part
        except Exception as e:
            self.logger.error("ユーザーパーツ作成エラー", exception=e)
            raise

    def delete_user_part(self, user_id: str, part_id: str):
        """ユーザーパーツを削除"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM user_parts WHERE id = ? AND user_id = ?", (part_id, user_id))
                conn.commit()
            self.logger.info("ユーザーパーツを削除しました", part_id=part_id, user_id=user_id)
            
            # ユーザー表示設定からパーツを削除
            self._remove_part_from_all_user_preferences(part_id, "user")
            
        except Exception as e:
            self.logger.error("ユーザーパーツ削除エラー", exception=e)
            raise
    
    def _add_part_to_user_preferences(self, part_id: str, part_type: str, user_id: str = None):
        """パーツをユーザー表示設定に追加"""
        try:
            if part_type == "admin":
                # 管理者パーツの場合、全ユーザーに追加
                with self._get_conn() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT user_id FROM users")
                    users = cursor.fetchall()
                    
                    for user in users:
                        cursor.execute("""
                        SELECT COALESCE(MAX(display_order), 0) + 1 as next_order
                        FROM user_part_preferences WHERE user_id = ?
                        """, (user[0],))
                        next_order = cursor.fetchone()[0]
                        
                        cursor.execute("""
                        INSERT OR IGNORE INTO user_part_preferences 
                        (user_id, part_id, part_type, display_order, is_visible)
                        VALUES (?, ?, ?, ?, 1)
                        """, (user[0], part_id, part_type, next_order))
                    
                    conn.commit()
            else:
                # ユーザーパーツの場合、該当ユーザーのみに追加
                if user_id:
                    with self._get_conn() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                        SELECT COALESCE(MAX(display_order), 0) + 1 as next_order
                        FROM user_part_preferences WHERE user_id = ?
                        """, (user_id,))
                        next_order = cursor.fetchone()[0]
                        
                        cursor.execute("""
                        INSERT OR IGNORE INTO user_part_preferences 
                        (user_id, part_id, part_type, display_order, is_visible)
                        VALUES (?, ?, ?, ?, 1)
                        """, (user_id, part_id, part_type, next_order))
                        
                        conn.commit()
        except Exception as e:
            self.logger.error("パーツ表示設定追加エラー", exception=e)
    
    def _remove_part_from_all_user_preferences(self, part_id: str, part_type: str):
        """パーツを全ユーザーの表示設定から削除"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                DELETE FROM user_part_preferences 
                WHERE part_id = ? AND part_type = ?
                """, (part_id, part_type))
                conn.commit()
        except Exception as e:
            self.logger.error("パーツ表示設定削除エラー", exception=e)