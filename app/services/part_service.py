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
        except Exception as e:
            self.logger.error("ユーザーパーツ削除エラー", exception=e)
            raise 