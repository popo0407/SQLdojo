# -*- coding: utf-8 -*-
"""
大容量データCSVダウンロード機能のテスト
"""
import pytest
import os
from unittest.mock import patch, MagicMock
from app.config_simplified import Settings, get_settings
from app.services.hybrid_sql_service import HybridSQLService
from app.api.routes import download_csv_endpoint
from fastapi import HTTPException


class TestLargeDataSettings:
    """大容量データ設定のテスト"""
    
    @patch('app.config_simplified.load_dotenv')
    def test_max_records_for_display_default(self, mock_load_dotenv):
        """MAX_RECORDS_FOR_DISPLAYのデフォルト値テスト"""
        with patch.dict(os.environ, {}, clear=True):
            # 必須フィールドを設定
            os.environ.update({
                'SNOWFLAKE_ACCOUNT': 'test-account',
                'SNOWFLAKE_USER': 'test-user',
                'SNOWFLAKE_PRIVATE_KEY_PATH': '/path/to/key.p8',
                'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE': 'test-passphrase',
                'SNOWFLAKE_DATABASE': 'test-db',
                'ADMIN_PASSWORD': 'test-password'
            })
            
            settings = Settings()
            assert settings.max_records_for_display == 1000000
    
    @patch('app.config_simplified.load_dotenv')
    def test_max_records_for_csv_download_default(self, mock_load_dotenv):
        """MAX_RECORDS_FOR_CSV_DOWNLOADのデフォルト値テスト"""
        with patch.dict(os.environ, {}, clear=True):
            # 必須フィールドを設定
            os.environ.update({
                'SNOWFLAKE_ACCOUNT': 'test-account',
                'SNOWFLAKE_USER': 'test-user',
                'SNOWFLAKE_PRIVATE_KEY_PATH': '/path/to/key.p8',
                'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE': 'test-passphrase',
                'SNOWFLAKE_DATABASE': 'test-db',
                'ADMIN_PASSWORD': 'test-password'
            })
            
            settings = Settings()
            assert settings.max_records_for_csv_download == 10000000
    
    @patch('app.config_simplified.load_dotenv')
    def test_custom_max_records_settings(self, mock_load_dotenv):
        """カスタム設定値のテスト"""
        with patch.dict(os.environ, {}, clear=True):
            # 必須フィールドを設定
            os.environ.update({
                'SNOWFLAKE_ACCOUNT': 'test-account',
                'SNOWFLAKE_USER': 'test-user',
                'SNOWFLAKE_PRIVATE_KEY_PATH': '/path/to/key.p8',
                'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE': 'test-passphrase',
                'SNOWFLAKE_DATABASE': 'test-db',
                'ADMIN_PASSWORD': 'test-password',
                'MAX_RECORDS_FOR_DISPLAY': '500000',
                'MAX_RECORDS_FOR_CSV_DOWNLOAD': '5000000'
            })
            
            settings = Settings()
            assert settings.max_records_for_display == 500000
            assert settings.max_records_for_csv_download == 5000000


class TestHybridSQLServiceLargeData:
    """HybridSQLServiceの大容量データ処理テスト"""
    
    def setup_method(self):
        """テスト前のセットアップ"""
        self.mock_cache_service = MagicMock()
        self.mock_connection_manager = MagicMock()
        self.mock_streaming_state_service = MagicMock()
        
        self.service = HybridSQLService(
            self.mock_cache_service,
            self.mock_connection_manager,
            self.mock_streaming_state_service
        )
    
    @patch('app.config_simplified.get_settings')
    async def test_execute_sql_with_cache_large_data_confirmation(self, mock_get_settings):
        """大容量データで確認要求が返されるテスト"""
        # 設定をモック
        mock_settings = MagicMock()
        mock_settings.max_records_for_display = 1000000
        mock_settings.max_records_for_csv_download = 10000000
        mock_get_settings.return_value = mock_settings
        
        # セッション登録をモック
        self.mock_cache_service.register_session.return_value = True
        self.mock_cache_service.generate_session_id.return_value = "test-session-id"
        
        # 総件数取得をモック（大容量データ）
        async def mock_get_total_count(sql):
            return 1500000  # 表示限界を超える
        
        self.service._get_total_count = mock_get_total_count
        
        # SQL実行
        result = await self.service.execute_sql_with_cache("SELECT * FROM large_table", "test-user")
        
        # 確認要求が返されることを確認
        assert result['status'] == 'requires_confirmation'
        assert result['total_count'] == 1500000
        assert 'ダウンロードしますか？' in result['message']
    
    @patch('app.config_simplified.get_settings')
    async def test_execute_sql_with_cache_too_large_data(self, mock_get_settings):
        """CSVダウンロードも不可な大容量データでエラーが発生するテスト"""
        # 設定をモック
        mock_settings = MagicMock()
        mock_settings.max_records_for_display = 1000000
        mock_settings.max_records_for_csv_download = 10000000
        mock_get_settings.return_value = mock_settings
        
        # セッション登録をモック
        self.mock_cache_service.register_session.return_value = True
        self.mock_cache_service.generate_session_id.return_value = "test-session-id"
        
        # 総件数取得をモック（CSVダウンロードも不可な大容量データ）
        async def mock_get_total_count(sql):
            return 15000000  # CSVダウンロード制限も超える
        
        self.service._get_total_count = mock_get_total_count
        
        # SQL実行でエラーが発生することを確認
        with pytest.raises(Exception) as exc_info:
            await self.service.execute_sql_with_cache("SELECT * FROM huge_table", "test-user")
        
        assert "データが大きすぎます" in str(exc_info.value)
    
    @patch('app.config_simplified.get_settings')
    async def test_execute_sql_with_cache_normal_data(self, mock_get_settings):
        """通常のデータで既存の処理が継続されるテスト"""
        # 設定をモック
        mock_settings = MagicMock()
        mock_settings.max_records_for_display = 1000000
        mock_settings.max_records_for_csv_download = 10000000
        mock_get_settings.return_value = mock_settings
        
        # セッション登録をモック
        self.mock_cache_service.register_session.return_value = True
        self.mock_cache_service.generate_session_id.return_value = "test-session-id"
        
        # 総件数取得をモック（通常のデータ）
        async def mock_get_total_count(sql):
            return 100000  # 表示限界以下
        
        self.service._get_total_count = mock_get_total_count
        
        # データ取得・キャッシュ処理をモック
        async def mock_fetch_and_cache_data(sql, session_id, limit=None):
            return 100000
        
        self.service._fetch_and_cache_data = mock_fetch_and_cache_data
        
        # セッション完了処理をモック
        self.mock_cache_service.update_session_progress.return_value = None
        self.mock_cache_service.complete_active_session.return_value = None
        
        # SQL実行
        result = await self.service.execute_sql_with_cache("SELECT * FROM normal_table", "test-user")
        
        # 通常の成功レスポンスが返されることを確認
        assert result['success'] is True
        assert result['session_id'] == "test-session-id"
        assert result['total_count'] == 100000
        assert result['processed_rows'] == 100000


class TestCSVDownloadAPI:
    """CSVダウンロードAPIのテスト"""
    
    def setup_method(self):
        """テスト前のセットアップ"""
        self.mock_connection_manager = MagicMock()
        self.mock_current_user = {"user_id": "test-user"}
    
    @patch('app.config_simplified.get_settings')
    async def test_download_csv_success(self, mock_get_settings):
        """CSVダウンロード成功のテスト"""
        # 設定をモック
        mock_settings = MagicMock()
        mock_settings.max_records_for_csv_download = 10000000
        mock_get_settings.return_value = mock_settings
        
        # 接続とカーソルをモック
        mock_connection = MagicMock()
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value = mock_cursor
        
        # COUNT(*)クエリの結果をモック
        mock_cursor.fetchone.return_value = (1000,)  # 1000件
        
        # メインクエリの結果をモック
        mock_cursor.description = [('col1',), ('col2',)]
        mock_cursor.fetchmany.side_effect = [
            [('value1', 'value2'), ('value3', 'value4')],  # 最初のチャンク
            []  # 終了
        ]
        
        self.mock_connection_manager.get_connection.return_value = ("conn-id", mock_connection)
        
        # リクエストをモック
        mock_request = MagicMock()
        mock_request.sql = "SELECT col1, col2 FROM test_table"
        
        # API呼び出し
        response = await download_csv_endpoint(
            mock_request,
            self.mock_connection_manager,
            self.mock_current_user
        )
        
        # StreamingResponseが返されることを確認
        assert response is not None
        assert hasattr(response, 'body_iterator')
    
    @patch('app.config_simplified.get_settings')
    async def test_download_csv_too_large_data(self, mock_get_settings):
        """大容量データでエラーが発生するテスト"""
        # 設定をモック
        mock_settings = MagicMock()
        mock_settings.max_records_for_csv_download = 10000000
        mock_get_settings.return_value = mock_settings
        
        # 接続とカーソルをモック
        mock_connection = MagicMock()
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value = mock_cursor
        
        # COUNT(*)クエリの結果をモック（大容量データ）
        mock_cursor.fetchone.return_value = (15000000,)  # CSVダウンロード制限を超える
        
        self.mock_connection_manager.get_connection.return_value = ("conn-id", mock_connection)
        
        # リクエストをモック
        mock_request = MagicMock()
        mock_request.sql = "SELECT * FROM huge_table"
        
        # API呼び出しでエラーが発生することを確認
        with pytest.raises(HTTPException) as exc_info:
            await download_csv_endpoint(
                mock_request,
                self.mock_connection_manager,
                self.mock_current_user
            )
        
        assert exc_info.value.status_code == 400
        assert "データが大きすぎます" in str(exc_info.value.detail)
    
    async def test_download_csv_invalid_sql(self):
        """無効なSQLでエラーが発生するテスト"""
        # リクエストをモック（空のSQL）
        mock_request = MagicMock()
        mock_request.sql = ""
        
        # API呼び出しでエラーが発生することを確認
        with pytest.raises(HTTPException) as exc_info:
            await download_csv_endpoint(
                mock_request,
                self.mock_connection_manager,
                self.mock_current_user
            )
        
        assert exc_info.value.status_code == 400
        assert "SQLクエリが無効です" in str(exc_info.value.detail)


if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 