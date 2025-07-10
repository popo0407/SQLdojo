# -*- coding: utf-8 -*-
"""
ユーザー表示設定管理のためのデータベースマイグレーション
"""
import sqlite3
from pathlib import Path
from typing import List, Dict, Any
from app.logger import get_logger

class UserPreferenceMigration:
    """ユーザー表示設定テーブルのマイグレーション管理"""
    
    def __init__(self, db_path: str = "metadata_cache.db"):
        self.db_path = Path(db_path)
        self.logger = get_logger(__name__)
    
    def _get_conn(self):
        """DB接続を取得"""
        return sqlite3.connect(self.db_path)
    
    def create_preference_tables(self):
        """ユーザー表示設定テーブルを作成"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                
                # ユーザーテンプレート表示設定テーブル
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_template_preferences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    template_id TEXT NOT NULL,
                    template_type TEXT NOT NULL CHECK (template_type IN ('user', 'admin')),
                    display_order INTEGER NOT NULL,
                    is_visible INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, template_id, template_type),
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
                """)
                
                # ユーザーパーツ表示設定テーブル
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_part_preferences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    part_id TEXT NOT NULL,
                    part_type TEXT NOT NULL CHECK (part_type IN ('user', 'admin')),
                    display_order INTEGER NOT NULL,
                    is_visible INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, part_id, part_type),
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
                """)
                
                # インデックス作成（パフォーマンス最適化）
                cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_template_prefs_user_order 
                ON user_template_preferences (user_id, display_order)
                """)
                
                cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_part_prefs_user_order 
                ON user_part_preferences (user_id, display_order)
                """)
                
                cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_template_prefs_visibility 
                ON user_template_preferences (user_id, is_visible)
                """)
                
                cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_part_prefs_visibility 
                ON user_part_preferences (user_id, is_visible)
                """)
                
                conn.commit()
                self.logger.info("ユーザー表示設定テーブルの作成が完了しました")
                
        except Exception as e:
            self.logger.error("ユーザー表示設定テーブル作成エラー", exception=e)
            raise
    
    def migrate_existing_data(self):
        """既存データの移行（初回設定の自動生成）"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                
                # 既存ユーザーの取得
                cursor.execute("SELECT DISTINCT user_id FROM users")
                users = [row[0] for row in cursor.fetchall()]
                
                for user_id in users:
                    self._create_default_preferences_for_user(cursor, user_id)
                
                conn.commit()
                self.logger.info(f"{len(users)}人のユーザーに対してデフォルト表示設定を作成しました")
                
        except Exception as e:
            self.logger.error("既存データ移行エラー", exception=e)
            raise
    
    def _create_default_preferences_for_user(self, cursor, user_id: str):
        """特定ユーザーのデフォルト表示設定を作成"""
        # ユーザーテンプレートのデフォルト設定
        cursor.execute("""
        SELECT id FROM user_templates WHERE user_id = ? ORDER BY name
        """, (user_id,))
        user_templates = cursor.fetchall()
        
        display_order = 1
        for template in user_templates:
            cursor.execute("""
            INSERT OR IGNORE INTO user_template_preferences 
            (user_id, template_id, template_type, display_order, is_visible)
            VALUES (?, ?, 'user', ?, 1)
            """, (user_id, template[0], display_order))
            display_order += 1
        
        # 共通テンプレートのデフォルト設定
        cursor.execute("SELECT id FROM admin_templates ORDER BY name")
        admin_templates = cursor.fetchall()
        
        for template in admin_templates:
            cursor.execute("""
            INSERT OR IGNORE INTO user_template_preferences 
            (user_id, template_id, template_type, display_order, is_visible)
            VALUES (?, ?, 'admin', ?, 1)
            """, (user_id, template[0], display_order))
            display_order += 1
        
        # ユーザーパーツのデフォルト設定
        cursor.execute("""
        SELECT id FROM user_parts WHERE user_id = ? ORDER BY name
        """, (user_id,))
        user_parts = cursor.fetchall()
        
        display_order = 1
        for part in user_parts:
            cursor.execute("""
            INSERT OR IGNORE INTO user_part_preferences 
            (user_id, part_id, part_type, display_order, is_visible)
            VALUES (?, ?, 'user', ?, 1)
            """, (user_id, part[0], display_order))
            display_order += 1
        
        # 共通パーツのデフォルト設定
        cursor.execute("SELECT id FROM admin_parts ORDER BY name")
        admin_parts = cursor.fetchall()
        
        for part in admin_parts:
            cursor.execute("""
            INSERT OR IGNORE INTO user_part_preferences 
            (user_id, part_id, part_type, display_order, is_visible)
            VALUES (?, ?, 'admin', ?, 1)
            """, (user_id, part[0], display_order))
            display_order += 1
    
    def create_default_preferences_for_new_user(self, user_id: str):
        """新規ユーザーのデフォルト表示設定を作成"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                self._create_default_preferences_for_user(cursor, user_id)
                conn.commit()
                self.logger.info(f"新規ユーザー {user_id} のデフォルト表示設定を作成しました")
        except Exception as e:
            self.logger.error("新規ユーザーのデフォルト設定作成エラー", exception=e)
            raise
    
    def cleanup_orphaned_preferences(self):
        """孤立した表示設定をクリーンアップ"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                
                # 存在しないテンプレートの設定を削除
                cursor.execute("""
                DELETE FROM user_template_preferences 
                WHERE (template_type = 'user' AND template_id NOT IN (SELECT id FROM user_templates))
                   OR (template_type = 'admin' AND template_id NOT IN (SELECT id FROM admin_templates))
                """)
                
                # 存在しないパーツの設定を削除
                cursor.execute("""
                DELETE FROM user_part_preferences 
                WHERE (part_type = 'user' AND part_id NOT IN (SELECT id FROM user_parts))
                   OR (part_type = 'admin' AND part_id NOT IN (SELECT id FROM admin_parts))
                """)
                
                # 存在しないユーザーの設定を削除
                cursor.execute("""
                DELETE FROM user_template_preferences 
                WHERE user_id NOT IN (SELECT user_id FROM users)
                """)
                
                cursor.execute("""
                DELETE FROM user_part_preferences 
                WHERE user_id NOT IN (SELECT user_id FROM users)
                """)
                
                conn.commit()
                self.logger.info("孤立した表示設定のクリーンアップが完了しました")
                
        except Exception as e:
            self.logger.error("表示設定クリーンアップエラー", exception=e)
            raise
