# -*- coding: utf-8 -*-
"""
マスターデータ検索履歴管理サービス
"""
import sqlite3
from typing import Optional, Dict, Any
from datetime import datetime

from app.metadata_cache import MetadataCache
from app.logger import get_logger

class MasterSearchPreferenceService:
    """マスターデータ検索履歴管理サービス"""
    
    def __init__(self, metadata_cache: MetadataCache):
        self.metadata_cache = metadata_cache
        self.logger = get_logger(__name__)
        self._init_tables()
    
    def _get_conn(self):
        """MetadataCacheのDB接続を再利用"""
        return self.metadata_cache._get_conn()
    
    def _init_tables(self):
        """マスター検索履歴テーブルを作成"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_master_search_preferences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL UNIQUE,
                    sta_no1 TEXT,
                    sta_no2_first TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
                """)
                
                # インデックス作成
                cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_master_search_prefs_user 
                ON user_master_search_preferences (user_id)
                """)
                
                conn.commit()
                self.logger.info("マスター検索履歴テーブルの初期化が完了しました")
                
        except Exception as e:
            self.logger.error("マスター検索履歴テーブル初期化エラー", exception=e)
            raise
    
    def save_search_preference(self, user_id: str, sta_no1: str, sta_no2_first: str):
        """ユーザーの検索履歴を保存"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                INSERT OR REPLACE INTO user_master_search_preferences 
                (user_id, sta_no1, sta_no2_first, updated_at)
                VALUES (?, ?, ?, ?)
                """, (user_id, sta_no1, sta_no2_first, datetime.now().isoformat()))
                
                conn.commit()
                self.logger.info(f"マスター検索履歴を保存しました: user_id={user_id}, sta_no1={sta_no1}, sta_no2_first={sta_no2_first}")
                
        except Exception as e:
            self.logger.error("マスター検索履歴保存エラー", exception=e, user_id=user_id)
            raise
    
    def get_search_preference(self, user_id: str) -> Optional[Dict[str, Any]]:
        """ユーザーの検索履歴を取得"""
        try:
            with self._get_conn() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute("""
                SELECT sta_no1, sta_no2_first, updated_at
                FROM user_master_search_preferences
                WHERE user_id = ?
                """, (user_id,))
                
                row = cursor.fetchone()
                if row:
                    return {
                        'sta_no1': row['sta_no1'],
                        'sta_no2_first': row['sta_no2_first'],
                        'updated_at': row['updated_at']
                    }
                return None
                
        except Exception as e:
            self.logger.error("マスター検索履歴取得エラー", exception=e, user_id=user_id)
            return None
    
    def clear_search_preference(self, user_id: str):
        """ユーザーの検索履歴をクリア"""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                DELETE FROM user_master_search_preferences WHERE user_id = ?
                """, (user_id,))
                
                conn.commit()
                self.logger.info(f"マスター検索履歴をクリアしました: user_id={user_id}")
                
        except Exception as e:
            self.logger.error("マスター検索履歴クリアエラー", exception=e, user_id=user_id)
            raise