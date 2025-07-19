# -*- coding: utf-8 -*-
"""
ユーザー表示設定管理サービス
"""
import sqlite3
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

from app.metadata_cache import MetadataCache
from app.logger import get_logger

class UserPreferenceService:
    """ユーザーの表示設定管理サービス"""
    
    def __init__(self, metadata_cache: MetadataCache):
        self.metadata_cache = metadata_cache
        self.logger = get_logger(__name__)
    
    def _get_conn(self):
        """MetadataCacheのDB接続を再利用"""
        return self.metadata_cache._get_conn()
    
    def get_user_template_preferences(self, user_id: str) -> List[Dict[str, Any]]:
        """ユーザーのテンプレート表示設定を取得（統合リスト）"""
        try:
            # 共通テンプレートを同期
            self.sync_admin_templates_for_user(user_id)
            
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                # テンプレート実体と表示設定を結合したクエリ
                cursor.execute("""
                SELECT 
                    CASE 
                        WHEN utp.template_type = 'user' THEN ut.id
                        ELSE at.id
                    END as template_id,
                    CASE 
                        WHEN utp.template_type = 'user' THEN ut.name
                        ELSE at.name
                    END as name,
                    CASE 
                        WHEN utp.template_type = 'user' THEN ut.sql
                        ELSE at.sql
                    END as sql,
                    CASE 
                        WHEN utp.template_type = 'user' THEN ut.created_at
                        ELSE at.created_at
                    END as created_at,
                    utp.template_type as type,
                    utp.display_order,
                    utp.is_visible
                FROM user_template_preferences utp
                LEFT JOIN user_templates ut ON (utp.template_id = ut.id AND utp.template_type = 'user')
                LEFT JOIN admin_templates at ON (utp.template_id = at.id AND utp.template_type = 'admin')
                WHERE utp.user_id = ?
                ORDER BY utp.display_order
                """, (user_id,))
                
                results = []
                for row in cursor.fetchall():
                    # nullの場合は削除されたテンプレートなのでスキップ
                    if row['name'] is not None:
                        results.append({
                            'template_id': row['template_id'],
                            'name': row['name'],
                            'sql': row['sql'],
                            'created_at': row['created_at'],
                            'type': row['type'],
                            'is_common': row['type'] == 'admin',
                            'display_order': row['display_order'],
                            'is_visible': bool(row['is_visible'])
                        })
                
                return results
                
        except Exception as e:
            self.logger.error("ユーザーテンプレート表示設定取得エラー", exception=e, user_id=user_id)
            return []
    
    def get_user_part_preferences(self, user_id: str) -> List[Dict[str, Any]]:
        """ユーザーのパーツ表示設定を取得（統合リスト）"""
        try:
            # 共通パーツを同期
            self.sync_admin_parts_for_user(user_id)
            
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                # パーツ実体と表示設定を結合したクエリ
                cursor.execute("""
                SELECT 
                    CASE 
                        WHEN upp.part_type = 'user' THEN up.id
                        ELSE ap.id
                    END as part_id,
                    CASE 
                        WHEN upp.part_type = 'user' THEN up.name
                        ELSE ap.name
                    END as name,
                    CASE 
                        WHEN upp.part_type = 'user' THEN up.sql
                        ELSE ap.sql
                    END as sql,
                    CASE 
                        WHEN upp.part_type = 'user' THEN up.created_at
                        ELSE ap.created_at
                    END as created_at,
                    upp.part_type as type,
                    upp.display_order,
                    upp.is_visible
                FROM user_part_preferences upp
                LEFT JOIN user_parts up ON (upp.part_id = up.id AND upp.part_type = 'user')
                LEFT JOIN admin_parts ap ON (upp.part_id = ap.id AND upp.part_type = 'admin')
                WHERE upp.user_id = ?
                ORDER BY upp.display_order
                """, (user_id,))
                
                results = []
                for row in cursor.fetchall():
                    # nullの場合は削除されたパーツなのでスキップ
                    if row['name'] is not None:
                        results.append({
                            'part_id': row['part_id'],
                            'name': row['name'],
                            'sql': row['sql'],
                            'created_at': row['created_at'],
                            'type': row['type'],
                            'is_common': row['type'] == 'admin',
                            'display_order': row['display_order'],
                            'is_visible': bool(row['is_visible'])
                        })
                
                return results
                
        except Exception as e:
            self.logger.error("ユーザーパーツ表示設定取得エラー", exception=e, user_id=user_id)
            return []
    
    def update_template_preferences(self, user_id: str, preferences: List[Dict[str, Any]]):
        """テンプレート表示設定を一括更新"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                
                # 既存の設定を削除
                cursor.execute("""
                DELETE FROM user_template_preferences WHERE user_id = ?
                """, (user_id,))
                
                # 新しい設定を一括挿入
                for pref in preferences:
                    cursor.execute("""
                    INSERT INTO user_template_preferences 
                    (user_id, template_id, template_type, display_order, is_visible, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        user_id,
                        pref['template_id'],
                        pref['template_type'],
                        pref['display_order'],
                        1 if pref['is_visible'] else 0,
                        datetime.now().isoformat()
                    ))
                
                conn.commit()
                self.logger.info("テンプレート表示設定を更新しました", user_id=user_id, count=len(preferences))
                
        except Exception as e:
            self.logger.error("テンプレート表示設定更新エラー", exception=e, user_id=user_id)
            raise
    
    def update_part_preferences(self, user_id: str, preferences: List[Dict[str, Any]]):
        """パーツ表示設定を一括更新"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                
                # 既存の設定を削除
                cursor.execute("""
                DELETE FROM user_part_preferences WHERE user_id = ?
                """, (user_id,))
                
                # 新しい設定を一括挿入
                for pref in preferences:
                    cursor.execute("""
                    INSERT INTO user_part_preferences 
                    (user_id, part_id, part_type, display_order, is_visible, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        user_id,
                        pref['part_id'],
                        pref['part_type'],
                        pref['display_order'],
                        1 if pref['is_visible'] else 0,
                        datetime.now().isoformat()
                    ))
                
                conn.commit()
                self.logger.info("パーツ表示設定を更新しました", user_id=user_id, count=len(preferences))
                
        except Exception as e:
            self.logger.error("パーツ表示設定更新エラー", exception=e, user_id=user_id)
            raise
    
    def add_template_preference(self, user_id: str, template_id: str, template_type: str):
        """新しいテンプレートの表示設定を追加"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                
                # 最大のdisplay_orderを取得
                cursor.execute("""
                SELECT COALESCE(MAX(display_order), 0) + 1 as next_order
                FROM user_template_preferences WHERE user_id = ?
                """, (user_id,))
                next_order = cursor.fetchone()[0]
                
                # 新しい設定を追加
                cursor.execute("""
                INSERT OR IGNORE INTO user_template_preferences 
                (user_id, template_id, template_type, display_order, is_visible)
                VALUES (?, ?, ?, ?, 1)
                """, (user_id, template_id, template_type, next_order))
                
                conn.commit()
                self.logger.info("新しいテンプレート表示設定を追加しました", 
                               user_id=user_id, template_id=template_id, template_type=template_type)
                
        except Exception as e:
            self.logger.error("テンプレート表示設定追加エラー", exception=e, user_id=user_id)
            raise
    
    def add_part_preference(self, user_id: str, part_id: str, part_type: str):
        """新しいパーツの表示設定を追加"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                
                # 最大のdisplay_orderを取得
                cursor.execute("""
                SELECT COALESCE(MAX(display_order), 0) + 1 as next_order
                FROM user_part_preferences WHERE user_id = ?
                """, (user_id,))
                next_order = cursor.fetchone()[0]
                
                # 新しい設定を追加
                cursor.execute("""
                INSERT OR IGNORE INTO user_part_preferences 
                (user_id, part_id, part_type, display_order, is_visible)
                VALUES (?, ?, ?, ?, 1)
                """, (user_id, part_id, part_type, next_order))
                
                conn.commit()
                self.logger.info("新しいパーツ表示設定を追加しました", 
                               user_id=user_id, part_id=part_id, part_type=part_type)
                
        except Exception as e:
            self.logger.error("パーツ表示設定追加エラー", exception=e, user_id=user_id)
            raise
    
    def remove_template_preference(self, template_id: str, template_type: str):
        """削除されたテンプレートの表示設定を全ユーザーから削除"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                DELETE FROM user_template_preferences 
                WHERE template_id = ? AND template_type = ?
                """, (template_id, template_type))
                
                conn.commit()
                self.logger.info("削除されたテンプレートの表示設定を全ユーザーから削除しました", 
                               template_id=template_id, template_type=template_type)
                
        except Exception as e:
            self.logger.error("テンプレート表示設定削除エラー", exception=e, template_id=template_id)
            raise
    
    def remove_part_preference(self, part_id: str, part_type: str):
        """削除されたパーツの表示設定を全ユーザーから削除"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                DELETE FROM user_part_preferences 
                WHERE part_id = ? AND part_type = ?
                """, (part_id, part_type))
                
                conn.commit()
                self.logger.info("削除されたパーツの表示設定を全ユーザーから削除しました", 
                               part_id=part_id, part_type=part_type)
                
        except Exception as e:
            self.logger.error("パーツ表示設定削除エラー", exception=e, part_id=part_id)
            raise
    
    def get_visible_templates_for_dropdown(self, user_id: str) -> List[Dict[str, Any]]:
        """メイン画面のドロップダウン用：表示設定に基づいた表示順のテンプレート一覧"""
        try:
            self.sync_admin_templates_for_user(user_id)
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute("""
                SELECT 
                    CASE 
                        WHEN utp.template_type = 'user' THEN ut.id
                        ELSE at.id
                    END as id,
                    CASE 
                        WHEN utp.template_type = 'user' THEN ut.name
                        ELSE at.name
                    END as name,
                    CASE 
                        WHEN utp.template_type = 'user' THEN ut.sql
                        ELSE at.sql
                    END as sql,
                    utp.template_type as type
                FROM user_template_preferences utp
                LEFT JOIN user_templates ut ON (utp.template_id = ut.id AND utp.template_type = 'user')
                LEFT JOIN admin_templates at ON (utp.template_id = at.id AND utp.template_type = 'admin')
                WHERE utp.user_id = ? AND utp.is_visible = 1
                ORDER BY utp.display_order
                """, (user_id,))
                
                results = []
                for row in cursor.fetchall():
                    if row['name'] is not None:
                        results.append({
                            'id': row['id'],
                            'name': row['name'],
                            'sql': row['sql'],
                            'type': row['type']
                        })
                
                return results
                
        except Exception as e:
            self.logger.error("表示可能テンプレート取得エラー", exception=e, user_id=user_id)
            return []
    
    def get_visible_parts_for_dropdown(self, user_id: str) -> List[Dict[str, Any]]:
        """メイン画面のドロップダウン用：表示設定に基づいた表示順のパーツ一覧"""
        try:
            self.sync_admin_parts_for_user(user_id)
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute("""
                SELECT 
                    CASE 
                        WHEN upp.part_type = 'user' THEN up.id
                        ELSE ap.id
                    END as id,
                    CASE 
                        WHEN upp.part_type = 'user' THEN up.name
                        ELSE ap.name
                    END as name,
                    CASE 
                        WHEN upp.part_type = 'user' THEN up.sql
                        ELSE ap.sql
                    END as sql,
                    upp.part_type as type
                FROM user_part_preferences upp
                LEFT JOIN user_parts up ON (upp.part_id = up.id AND upp.part_type = 'user')
                LEFT JOIN admin_parts ap ON (upp.part_id = ap.id AND upp.part_type = 'admin')
                WHERE upp.user_id = ? AND upp.is_visible = 1
                ORDER BY upp.display_order
                """, (user_id,))
                
                results = []
                for row in cursor.fetchall():
                    if row['name'] is not None:
                        results.append({
                            'id': row['id'],
                            'name': row['name'],
                            'sql': row['sql'],
                            'type': row['type']
                        })
                
                return results
                
        except Exception as e:
            self.logger.error("表示可能パーツ取得エラー", exception=e, user_id=user_id)
            return []
    
    def sync_admin_templates_for_user(self, user_id: str):
        """ユーザーの表示設定に共通テンプレートを同期（デフォルト表示）"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                
                # 現在の最大display_orderを取得
                cursor.execute("""
                SELECT COALESCE(MAX(display_order), 0) as max_order
                FROM user_template_preferences WHERE user_id = ?
                """, (user_id,))
                max_order = cursor.fetchone()[0]
                
                # 設定に存在しない共通テンプレートを取得
                cursor.execute("""
                SELECT at.id
                FROM admin_templates at
                WHERE at.id NOT IN (
                    SELECT template_id 
                    FROM user_template_preferences 
                    WHERE user_id = ? AND template_type = 'admin'
                )
                """, (user_id,))
                
                missing_templates = cursor.fetchall()
                
                # 不足している共通テンプレートを追加（デフォルト表示）
                for i, (template_id,) in enumerate(missing_templates):
                    cursor.execute("""
                    INSERT INTO user_template_preferences 
                    (user_id, template_id, template_type, display_order, is_visible, updated_at)
                    VALUES (?, ?, 'admin', ?, 1, ?)
                    """, (user_id, template_id, max_order + i + 1, datetime.now().isoformat()))
                
                conn.commit()
                
                if missing_templates:
                    self.logger.info(f"共通テンプレート{len(missing_templates)}件をユーザー設定に追加しました", 
                                   user_id=user_id)
                
        except Exception as e:
            self.logger.error("共通テンプレート同期エラー", exception=e, user_id=user_id)
            raise

    def sync_admin_parts_for_user(self, user_id: str):
        """ユーザーの表示設定に共通パーツを同期（デフォルト表示）"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                
                # 現在の最大display_orderを取得
                cursor.execute("""
                SELECT COALESCE(MAX(display_order), 0) as max_order
                FROM user_part_preferences WHERE user_id = ?
                """, (user_id,))
                max_order = cursor.fetchone()[0]
                
                # 設定に存在しない共通パーツを取得
                cursor.execute("""
                SELECT ap.id
                FROM admin_parts ap
                WHERE ap.id NOT IN (
                    SELECT part_id 
                    FROM user_part_preferences 
                    WHERE user_id = ? AND part_type = 'admin'
                )
                """, (user_id,))
                
                missing_parts = cursor.fetchall()
                
                # 不足している共通パーツを追加（デフォルト表示）
                for i, (part_id,) in enumerate(missing_parts):
                    cursor.execute("""
                    INSERT INTO user_part_preferences 
                    (user_id, part_id, part_type, display_order, is_visible, updated_at)
                    VALUES (?, ?, 'admin', ?, 1, ?)
                    """, (user_id, part_id, max_order + i + 1, datetime.now().isoformat()))
                
                conn.commit()
                
                if missing_parts:
                    self.logger.info(f"共通パーツ{len(missing_parts)}件をユーザー設定に追加しました", 
                                   user_id=user_id)
                
        except Exception as e:
            self.logger.error("共通パーツ同期エラー", exception=e, user_id=user_id)
            raise
