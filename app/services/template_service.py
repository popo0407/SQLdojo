# -*- coding: utf-8 -*-
"""
テンプレートサービス
テンプレートの管理を行う
"""
import sqlite3
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.metadata_cache import MetadataCache
from app.logger import get_logger


class TemplateService:
    """テンプレート管理サービス"""
    
    def __init__(self, metadata_cache: MetadataCache, user_preference_service = None):
        self.cache = metadata_cache
        self.logger = get_logger(__name__)
        self._user_preference_service = user_preference_service

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
            
            # ユーザー表示設定に新しいテンプレートを追加
            self._add_template_to_user_preferences(new_template["id"], "user", user_id)
            
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
            
            # ユーザー表示設定からテンプレートを削除
            self._remove_template_from_all_user_preferences(template_id, "user")
            
        except Exception as e:
            self.logger.error("ユーザーテンプレート削除エラー", exception=e)
            raise
    
    def _add_template_to_user_preferences(self, template_id: str, template_type: str, user_id: str = None):
        """テンプレートをユーザー表示設定に追加"""
        try:
            if template_type == "admin":
                # 管理者テンプレートの場合、全ユーザーに追加
                with self._get_conn() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT user_id FROM users")
                    users = cursor.fetchall()
                    
                    for user in users:
                        cursor.execute("""
                        SELECT COALESCE(MAX(display_order), 0) + 1 as next_order
                        FROM user_template_preferences WHERE user_id = ?
                        """, (user[0],))
                        next_order = cursor.fetchone()[0]
                        
                        cursor.execute("""
                        INSERT OR IGNORE INTO user_template_preferences 
                        (user_id, template_id, template_type, display_order, is_visible)
                        VALUES (?, ?, ?, ?, 1)
                        """, (user[0], template_id, template_type, next_order))
                    
                    conn.commit()
            else:
                # ユーザーテンプレートの場合、該当ユーザーのみに追加
                if user_id:
                    with self._get_conn() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                        SELECT COALESCE(MAX(display_order), 0) + 1 as next_order
                        FROM user_template_preferences WHERE user_id = ?
                        """, (user_id,))
                        next_order = cursor.fetchone()[0]
                        
                        cursor.execute("""
                        INSERT OR IGNORE INTO user_template_preferences 
                        (user_id, template_id, template_type, display_order, is_visible)
                        VALUES (?, ?, ?, ?, 1)
                        """, (user_id, template_id, template_type, next_order))
                        
                        conn.commit()
        except Exception as e:
            self.logger.error("テンプレート表示設定追加エラー", exception=e)
    
    def _remove_template_from_all_user_preferences(self, template_id: str, template_type: str):
        """テンプレートを全ユーザーの表示設定から削除"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                DELETE FROM user_template_preferences 
                WHERE template_id = ? AND template_type = ?
                """, (template_id, template_type))
                conn.commit()
        except Exception as e:
            self.logger.error("テンプレート表示設定削除エラー", exception=e)