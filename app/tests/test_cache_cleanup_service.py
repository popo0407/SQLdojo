# -*- coding: utf-8 -*-
"""
キャッシュクリーンアップサービスのテスト
"""
import pytest
import sqlite3
import asyncio
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from app.services.cache_cleanup_service import CacheCleanupService
from app.config_simplified import settings


class TestCacheCleanupService:
    """キャッシュクリーンアップサービスのテスト"""

    @pytest.fixture
    def cleanup_service(self, tmp_path):
        """テスト用のクリーンアップサービス"""
        test_db = tmp_path / "test_cache.db"
        return CacheCleanupService(str(test_db))

    @pytest.fixture
    def setup_test_data(self, cleanup_service):
        """テストデータのセットアップ"""
        # テスト用のcache_sessionsテーブルを作成
        with sqlite3.connect(cleanup_service.cache_db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cache_sessions (
                    session_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'active',
                    total_rows INTEGER DEFAULT 0,
                    processed_rows INTEGER DEFAULT 0,
                    is_complete BOOLEAN DEFAULT FALSE,
                    execution_time REAL DEFAULT NULL
                )
            """)
            
            # テストデータを挿入
            now = datetime.now()
            
            # 1. 30分前のアクティブセッション（タイムアウト対象）
            timeout_time = now - timedelta(minutes=35)
            cursor.execute("""
                INSERT INTO cache_sessions 
                (session_id, user_id, created_at, is_complete, status)
                VALUES (?, ?, ?, 0, 'active')
            """, ("test1_1234567890_abc", "test1", timeout_time.isoformat()))
            
            # 2. 12時間前のセッション（削除対象）
            delete_time = now - timedelta(hours=13)
            cursor.execute("""
                INSERT INTO cache_sessions 
                (session_id, user_id, created_at, is_complete, status)
                VALUES (?, ?, ?, 1, 'timeout')
            """, ("test2_1234567890_def", "test2", delete_time.isoformat()))
            
            # 3. 最近のアクティブセッション（対象外）
            recent_time = now - timedelta(minutes=10)
            cursor.execute("""
                INSERT INTO cache_sessions 
                (session_id, user_id, created_at, is_complete, status)
                VALUES (?, ?, ?, 0, 'active')
            """, ("test3_1234567890_ghi", "test3", recent_time.isoformat()))
            
            # 対応するキャッシュテーブルを作成
            cursor.execute("CREATE TABLE cache_test2_19700101070540 (test_column TEXT)")
            
            conn.commit()

    def test_generate_table_name(self, cleanup_service):
        """テーブル名生成のテスト"""
        # 新しい設計ではセッションIDがそのままテーブル名
        table_name = cleanup_service._generate_table_name("cache_user1_20241201120000_123")
        assert table_name == "cache_user1_20241201120000_123"
        
        table_name = cleanup_service._generate_table_name("cache_testuser_20241231235959_999")
        assert table_name == "cache_testuser_20241231235959_999"

    @pytest.mark.asyncio
    async def test_manual_cleanup(self, cleanup_service, setup_test_data):
        """手動クリーンアップのテスト"""
        # クリーンアップ実行
        result = await cleanup_service.manual_cleanup()
        
        assert result["status"] == "completed"
        assert "完了" in result["message"]
        
        # データベースの状態を確認
        with sqlite3.connect(cleanup_service.cache_db_path) as conn:
            cursor = conn.cursor()
            
            # タイムアウトされたセッションを確認
            cursor.execute("""
                SELECT session_id, status, is_complete 
                FROM cache_sessions 
                WHERE session_id = 'test1_1234567890_abc'
            """)
            timeout_session = cursor.fetchone()
            assert timeout_session is not None
            assert timeout_session[1] == 'timeout'  # status
            assert timeout_session[2] == 1  # is_complete
            
            # 削除されたセッションを確認
            cursor.execute("""
                SELECT session_id FROM cache_sessions 
                WHERE session_id = 'test2_1234567890_def'
            """)
            deleted_session = cursor.fetchone()
            assert deleted_session is None
            
            # 最近のセッションが残っていることを確認
            cursor.execute("""
                SELECT session_id FROM cache_sessions 
                WHERE session_id = 'test3_1234567890_ghi'
            """)
            recent_session = cursor.fetchone()
            assert recent_session is not None

    @pytest.mark.asyncio
    async def test_start_stop_cleanup_task(self, cleanup_service):
        """クリーンアップタスクの開始・停止テスト"""
        # 設定を一時的に変更してテスト高速化
        with patch('app.services.cache_cleanup_service.settings') as mock_settings:
            mock_settings.cache_cleanup_enabled = True
            mock_settings.cache_cleanup_interval_minutes = 0.01  # 0.6秒間隔
            
            # タスク開始
            await cleanup_service.start_cleanup_task()
            assert cleanup_service._running is True
            assert cleanup_service._task is not None
            
            # 少し待機
            await asyncio.sleep(0.1)
            
            # タスク停止
            await cleanup_service.stop_cleanup_task()
            assert cleanup_service._running is False

    @pytest.mark.asyncio
    async def test_cleanup_disabled(self, cleanup_service):
        """クリーンアップ無効時のテスト"""
        with patch('app.services.cache_cleanup_service.settings') as mock_settings:
            mock_settings.cache_cleanup_enabled = False
            
            await cleanup_service.start_cleanup_task()
            assert cleanup_service._running is False
            assert cleanup_service._task is None

    @pytest.mark.asyncio
    async def test_cleanup_error_handling(self, cleanup_service):
        """クリーンアップエラーハンドリングのテスト"""
        # 存在しないデータベースパスを設定
        cleanup_service.cache_db_path = "/invalid/path/test.db"
        
        # エラーが発生してもクラッシュしないことを確認
        result = await cleanup_service.manual_cleanup()
        
        # 結果が返されることを確認（エラーでも正常終了）
        assert result["status"] == "completed"
