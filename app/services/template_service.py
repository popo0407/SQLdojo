# -*- coding: utf-8 -*-
"""
テンプレートサービス
テンプレートの管理を行う
"""
import sqlite3
import uuid
from datetime import datetime
from typing import List, Dict, Any
from app.metadata_cache import MetadataCache
from app.logger import get_logger


class TemplateService:
    """テンプレート管理サービス"""
    
    def __init__(self, metadata_cache: MetadataCache):
        self.cache = metadata_cache
        self.logger = get_logger(__name__)

    def _get_conn(self):
        """MetadataCacheのDB接続を再利用"""
        return sqlite3.connect(self.cache.db_path)

    def get_admin_templates(self) -> List[Dict[str, Any]]:
        """管理者テンプレート一覧を取得"""
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM admin_templates ORDER BY name")
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error("管理者テンプレート取得エラー", exception=e)
            return []

    def create_admin_template(self, name: str, sql: str) -> Dict[str, Any]:
        """管理者テンプレートを作成"""
        try:
            new_template = {
                "id": str(uuid.uuid4()),
                "name": name,
                "sql": sql,
                "created_at": datetime.now().isoformat()
            }
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO admin_templates (id, name, sql, created_at) VALUES (?, ?, ?, ?)",
                    (new_template["id"], new_template["name"], new_template["sql"], new_template["created_at"])
                )
                conn.commit()
            self.logger.info("管理者テンプレートを作成しました", template_id=new_template["id"])
            return new_template
        except Exception as e:
            self.logger.error("管理者テンプレート作成エラー", exception=e)
            raise

    def delete_admin_template(self, template_id: str):
        """管理者テンプレートを削除"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM admin_templates WHERE id = ?", (template_id,))
                conn.commit()
            self.logger.info("管理者テンプレートを削除しました", template_id=template_id)
        except Exception as e:
            self.logger.error("管理者テンプレート削除エラー", exception=e)
            raise

    def get_user_templates(self, user_id: str) -> List[Dict[str, Any]]:
        """ユーザーテンプレート一覧を取得"""
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM user_templates WHERE user_id = ? ORDER BY name", (user_id,))
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error("ユーザーテンプレート取得エラー", exception=e, user_id=user_id)
            return []

    def create_user_template(self, user_id: str, name: str, sql: str) -> Dict[str, Any]:
        """ユーザーテンプレートを作成"""
        try:
            new_template = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "name": name,
                "sql": sql,
                "created_at": datetime.now().isoformat()
            }
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO user_templates (id, user_id, name, sql, created_at) VALUES (?, ?, ?, ?, ?)",
                    (new_template["id"], new_template["user_id"], new_template["name"], new_template["sql"], new_template["created_at"])
                )
                conn.commit()
            self.logger.info("ユーザーテンプレートを作成しました", template_id=new_template["id"], user_id=user_id)
            return new_template
        except Exception as e:
            self.logger.error("ユーザーテンプレート作成エラー", exception=e)
            raise

    def delete_user_template(self, template_id: str, user_id: str):
        """ユーザーテンプレートを削除"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                # 念のためユーザーIDも条件に加える
                cursor.execute("DELETE FROM user_templates WHERE id = ? AND user_id = ?", (template_id, user_id))
                conn.commit()
            self.logger.info("ユーザーテンプレートを削除しました", template_id=template_id, user_id=user_id)
        except Exception as e:
            self.logger.error("ユーザーテンプレート削除エラー", exception=e)
            raise 