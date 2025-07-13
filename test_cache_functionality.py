#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
キャッシュ機能のテスト
"""
import pytest
import tempfile
import os
import sqlite3
from unittest.mock import Mock, patch
from datetime import datetime

from app.services.cache_service import CacheService
from app.services.hybrid_sql_service import HybridSQLService
from app.services.session_service import SessionService
from app.services.streaming_state_service import StreamingStateService
from app.services.connection_manager_odbc import ConnectionManagerODBC
from app.exceptions import DatabaseError


class TestCacheService:
    """キャッシュサービスのテスト"""
    
    def setup_method(self):
        """テスト前のセットアップ"""
        self.temp_dir = tempfile.mkdtemp()
        self.cache_db_path = os.path.join(self.temp_dir, "test_cache.db")
        self.cache_service = CacheService(self.cache_db_path)
    
    def teardown_method(self):
        """テスト後のクリーンアップ"""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_cache_service_initialization(self):
        """キャッシュサービスの初期化テスト"""
        assert self.cache_service.cache_db_path == self.cache_db_path
        assert self.cache_service._max_concurrent_sessions == 5
    
    def test_generate_session_id(self):
        """セッションID生成テスト"""
        user_id = "testuser"
        session_id = self.cache_service.generate_session_id(user_id)
        
        assert session_id.startswith(user_id)
        assert "_" in session_id
        # ユーザーIDにアンダースコアが含まれない場合のテスト
        parts = session_id.split("_")
        assert len(parts) >= 3  # ユーザーID、タイムスタンプ、ハッシュ
    
    def test_create_cache_table(self):
        """キャッシュテーブル作成テスト"""
        session_id = "test_user_1234567890_abcd1234"  # 正しいセッションID形式
        columns = ["col1", "col2", "col3"]

        table_name = self.cache_service.create_cache_table(session_id, columns)

        assert table_name.startswith("cache_test_user_")
        assert len(table_name) > 0

    def test_insert_chunk(self):
        """データチャンク挿入テスト"""
        session_id = "test_user_1234567890_abcd1234"  # 正しいセッションID形式
        columns = ["col1", "col2"]
        table_name = self.cache_service.create_cache_table(session_id, columns)

        # テストデータ
        data = [["value1", "value2"], ["value3", "value4"]]

        inserted_count = self.cache_service.insert_chunk(table_name, data)

        assert inserted_count == 2
        
        # データが正しく挿入されているか確認
        with sqlite3.connect(self.cache_db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(f"SELECT * FROM {table_name}")
            rows = cursor.fetchall()
            assert len(rows) == 2
    
    def test_register_session(self):
        """セッション登録テスト"""
        session_id = "test_user_12345678_abcd1234"
        user_id = "test_user"
        
        success = self.cache_service.register_session(session_id, user_id, 100)
        
        assert success is True
        
        # セッション情報が正しく登録されているか確認
        session_info = self.cache_service.get_session_info(session_id)
        assert session_info is not None
        assert session_info['user_id'] == user_id
        assert session_info['total_rows'] == 100
    
    def test_validate_data_types(self):
        """データ型検証テスト"""
        # 正常なデータ
        data = [["value1", 123, 45.67], ["value2", 456, 78.90]]
        is_valid, error_msg = self.cache_service.validate_data_types(data)
        assert is_valid is True
        assert error_msg is None
        
        # VARIANT/OBJECT型のデータ（エラー）
        data_with_variant = [["value1", '{"key": "value"}', "value3"]]
        is_valid, error_msg = self.cache_service.validate_data_types(data_with_variant)
        assert is_valid is False
        assert "VARIANT/OBJECT型はサポートされていません" in error_msg
        
        # ARRAY型のデータ（エラー）
        data_with_array = [["value1", '[1, 2, 3]', "value3"]]
        is_valid, error_msg = self.cache_service.validate_data_types(data_with_array)
        assert is_valid is False
        assert "ARRAY型はサポートされていません" in error_msg


class TestSessionService:
    """セッションサービスのテスト"""
    
    def setup_method(self):
        """テスト前のセットアップ"""
        self.session_service = SessionService()
    
    def test_session_service_initialization(self):
        """セッションサービスの初期化テスト"""
        assert self.session_service._session_timeout == 3600
    
    def test_create_editor_session(self):
        """エディタセッション作成テスト"""
        user_id = "test_user"
        editor_id = "editor1"
        
        session_id = self.session_service.create_editor_session(user_id, editor_id)
        
        assert session_id.startswith(user_id)
        assert editor_id in session_id
        
        # セッション情報が正しく登録されているか確認
        session_info = self.session_service.get_session_info(session_id)
        assert session_info is not None
        assert session_info['user_id'] == user_id
        assert session_info['editor_id'] == editor_id
    
    def test_update_cache_session(self):
        """キャッシュセッション更新テスト"""
        user_id = "test_user"
        session_id = self.session_service.create_editor_session(user_id)
        cache_session_id = "cache_session_123"
        
        self.session_service.update_cache_session(session_id, cache_session_id)
        
        session_info = self.session_service.get_session_info(session_id)
        assert session_info['cache_session_id'] == cache_session_id


class TestStreamingStateService:
    """ストリーミング状態管理サービスのテスト"""
    
    def setup_method(self):
        """テスト前のセットアップ"""
        self.streaming_state_service = StreamingStateService()
    
    def test_streaming_state_service_initialization(self):
        """ストリーミング状態管理サービスの初期化テスト"""
        assert len(self.streaming_state_service._states) == 0
    
    def test_create_streaming_state(self):
        """ストリーミング状態作成テスト"""
        session_id = "test_session"
        total_count = 1000
        
        state_info = self.streaming_state_service.create_streaming_state(session_id, total_count)
        
        assert state_info['session_id'] == session_id
        assert state_info['total_count'] == total_count
        assert state_info['status'] == 'running'
        assert state_info['processed_count'] == 0
    
    def test_update_progress(self):
        """進捗更新テスト"""
        session_id = "test_session"
        self.streaming_state_service.create_streaming_state(session_id, 1000)
        
        self.streaming_state_service.update_progress(session_id, 500)
        
        state = self.streaming_state_service.get_state(session_id)
        assert state['processed_count'] == 500
        assert state['status'] == 'running'
    
    def test_complete_streaming(self):
        """ストリーミング完了テスト"""
        session_id = "test_session"
        self.streaming_state_service.create_streaming_state(session_id, 1000)
        
        self.streaming_state_service.complete_streaming(session_id, 1000)
        
        state = self.streaming_state_service.get_state(session_id)
        assert state['status'] == 'completed'
        assert state['processed_count'] == 1000
    
    def test_cancel_streaming(self):
        """ストリーミングキャンセルテスト"""
        session_id = "test_session"
        self.streaming_state_service.create_streaming_state(session_id, 1000)
        
        success = self.streaming_state_service.cancel_streaming(session_id)
        
        assert success is True
        
        state = self.streaming_state_service.get_state(session_id)
        assert state['status'] == 'cancelled'
        assert state['is_cancelled'] is True


class TestHybridSQLService:
    """ハイブリッドSQLサービスのテスト"""
    
    def setup_method(self):
        """テスト前のセットアップ"""
        self.temp_dir = tempfile.mkdtemp()
        self.cache_db_path = os.path.join(self.temp_dir, "test_cache.db")
        self.cache_service = CacheService(self.cache_db_path)
        self.streaming_state_service = StreamingStateService()
        
        # モックの接続マネージャー
        self.mock_connection_manager = Mock(spec=ConnectionManagerODBC)
        
        self.hybrid_sql_service = HybridSQLService(
            self.cache_service, 
            self.mock_connection_manager,
            self.streaming_state_service
        )
    
    def teardown_method(self):
        """テスト後のクリーンアップ"""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_hybrid_sql_service_initialization(self):
        """ハイブリッドSQLサービスの初期化テスト"""
        assert self.hybrid_sql_service.cache_service == self.cache_service
        assert self.hybrid_sql_service.connection_manager == self.mock_connection_manager
        assert self.hybrid_sql_service.streaming_state_service == self.streaming_state_service
        assert self.hybrid_sql_service.chunk_size == 2000  # 設定ファイルの値に合わせて修正
    
    @pytest.mark.asyncio
    @patch('app.services.hybrid_sql_service.HybridSQLService._get_total_count')
    @patch('app.services.hybrid_sql_service.HybridSQLService._fetch_and_cache_data')
    async def test_execute_sql_with_cache(self, mock_fetch, mock_get_count):
        """キャッシュ付きSQL実行テスト"""
        # モックの設定
        mock_get_count.return_value = 100
        mock_fetch.return_value = 100
        
        # 同時実行制限を回避するため、既存セッションをクリア
        self.cache_service._active_sessions.clear()
        
        result = await self.hybrid_sql_service.execute_sql_with_cache(
            "SELECT * FROM test_table", 
            "test_user", 
            100
        )
        
        assert result['success'] is True
        assert result['total_count'] == 100
        assert result['processed_rows'] == 100
        assert 'session_id' in result
    
    def test_get_cached_data(self):
        """キャッシュデータ取得テスト"""
        # テストデータを準備（正しいセッションID形式）
        session_id = "test_user_1234567890_abcd1234"
        columns = ["col1", "col2"]
        table_name = self.cache_service.create_cache_table(session_id, columns)
        
        # テストデータを挿入
        data = [["value1", "value2"], ["value3", "value4"]]
        self.cache_service.insert_chunk(table_name, data)
        
        # セッションを登録
        self.cache_service.register_session(session_id, "test_user", 2)
        
        result = self.hybrid_sql_service.get_cached_data(
            session_id, 
            page=1, 
            page_size=10
        )
        
        assert result['success'] is True
        assert len(result['data']) == 2
        assert result['columns'] == columns
        assert result['total_count'] == 2 