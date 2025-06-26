# -*- coding: utf-8 -*-
"""
接続管理クラスのテスト
"""
import os
import tempfile
import pytest
from unittest.mock import patch, MagicMock, mock_open
from datetime import datetime, timedelta
import threading
import time

from app.services.connection_manager import ConnectionManager, ConnectionInfo
from app.exceptions import DatabaseError as AppDatabaseError


class TestConnectionInfo:
    """ConnectionInfoクラスのテスト"""
    
    def test_connection_info_creation(self):
        """ConnectionInfo作成のテスト"""
        now = datetime.now()
        info = ConnectionInfo(
            connection_id="test_conn_1",
            created_at=now,
            last_used=now,
            is_active=True,
            query_count=5
        )
        
        assert info.connection_id == "test_conn_1"
        assert info.created_at == now
        assert info.last_used == now
        assert info.is_active is True
        assert info.query_count == 5
    
    def test_connection_info_defaults(self):
        """ConnectionInfoデフォルト値のテスト"""
        now = datetime.now()
        info = ConnectionInfo(
            connection_id="test_conn_2",
            created_at=now,
            last_used=now
        )
        
        assert info.is_active is True
        assert info.query_count == 0


class TestConnectionManager:
    """ConnectionManagerクラスのテスト"""
    
    @patch('app.services.connection_manager.get_settings')
    @patch('app.services.connection_manager.get_logger')
    def test_connection_manager_initialization(self, mock_get_logger, mock_get_settings):
        """ConnectionManager初期化のテスト"""
        mock_settings = MagicMock()
        mock_settings.snowflake_private_key_path = '/path/to/key.p8'
        mock_settings.snowflake_private_key_passphrase = 'test-passphrase'
        mock_settings.snowflake_user = 'test-user'
        mock_settings.snowflake_account = 'test-account'
        mock_settings.snowflake_warehouse = 'test-warehouse'
        mock_settings.snowflake_database = 'test-db'
        mock_settings.snowflake_schema = 'test-schema'
        mock_settings.snowflake_role = 'test-role'
        mock_get_settings.return_value = mock_settings
        
        manager = ConnectionManager()
        
        assert manager.config == mock_settings
        assert manager._max_connections == 10
        assert manager._connection_timeout == 30
        assert len(manager._connections) == 0
        assert len(manager._connection_info) == 0
        assert manager._stop_monitoring is False
    
    @patch('app.services.connection_manager.get_settings')
    @patch('app.services.connection_manager.get_logger')
    def test_connection_manager_with_config(self, mock_get_logger, mock_get_settings):
        """設定付きConnectionManager初期化のテスト"""
        mock_config = MagicMock()
        mock_config.snowflake_private_key_path = '/path/to/key.p8'
        mock_config.snowflake_private_key_passphrase = 'test-passphrase'
        mock_config.snowflake_user = 'test-user'
        mock_config.snowflake_account = 'test-account'
        mock_config.snowflake_warehouse = 'test-warehouse'
        mock_config.snowflake_database = 'test-db'
        mock_config.snowflake_schema = 'test-schema'
        mock_config.snowflake_role = 'test-role'
        
        manager = ConnectionManager(config=mock_config)
        
        assert manager.config == mock_config
    
    @patch('app.services.connection_manager.get_settings')
    @patch('app.services.connection_manager.get_logger')
    @patch('builtins.open', new_callable=mock_open, read_data=b'fake_private_key_data')
    @patch('cryptography.hazmat.primitives.serialization.load_pem_private_key')
    @patch('snowflake.connector.connect')
    @patch('os.path.exists', return_value=True)
    def test_create_connection_success(self, mock_exists, mock_connect, mock_load_key, mock_file_open, mock_get_logger, mock_get_settings):
        """接続作成成功のテスト"""
        # モック設定
        mock_settings = MagicMock()
        mock_settings.snowflake_private_key_path = '/path/to/key.p8'
        mock_settings.snowflake_private_key_passphrase = 'test-passphrase'
        mock_settings.snowflake_user = 'test-user'
        mock_settings.snowflake_account = 'test-account'
        mock_settings.snowflake_warehouse = 'test-warehouse'
        mock_settings.snowflake_database = 'test-db'
        mock_settings.snowflake_schema = 'test-schema'
        mock_settings.snowflake_role = 'test-role'
        mock_get_settings.return_value = mock_settings
        
        mock_private_key = MagicMock()
        mock_load_key.return_value = mock_private_key
        mock_private_key.private_bytes.return_value = b'der_encoded_key'
        
        mock_connection = MagicMock()
        mock_connect.return_value = mock_connection
        
        manager = ConnectionManager()
        
        # 接続作成
        conn_id, connection = manager._create_connection()
        
        assert isinstance(conn_id, str)
        assert conn_id.startswith('conn_')
        assert connection == mock_connection
        
        # 正しいパラメータでconnectが呼ばれたことを確認
        mock_connect.assert_called_once()
        call_args = mock_connect.call_args[1]
        assert call_args['user'] == 'test-user'
        assert call_args['account'] == 'test-account'
        assert call_args['private_key'] == b'der_encoded_key'
        assert call_args['warehouse'] == 'test-warehouse'
        assert call_args['database'] == 'test-db'
        assert call_args['schema'] == 'test-schema'
        assert call_args['role'] == 'test-role'
        assert call_args['timeout'] == 30
        assert call_args['autocommit'] is True
    
    @patch('app.services.connection_manager.get_settings')
    @patch('app.services.connection_manager.get_logger')
    @patch('builtins.open', side_effect=FileNotFoundError("File not found"))
    @patch('os.path.exists', return_value=False)
    def test_create_connection_file_not_found(self, mock_exists, mock_file_open, mock_get_logger, mock_get_settings):
        """秘密鍵ファイルが見つからない場合のテスト"""
        mock_settings = MagicMock()
        mock_settings.snowflake_private_key_path = '/path/to/key.p8'
        mock_settings.snowflake_private_key_passphrase = 'test-passphrase'
        mock_settings.snowflake_user = 'test-user'
        mock_settings.snowflake_account = 'test-account'
        mock_settings.snowflake_warehouse = 'test-warehouse'
        mock_settings.snowflake_database = 'test-db'
        mock_settings.snowflake_schema = 'test-schema'
        mock_settings.snowflake_role = 'test-role'
        mock_get_settings.return_value = mock_settings
        
        manager = ConnectionManager()
        
        with pytest.raises(AppDatabaseError):
            manager._create_connection()
    
    @patch('app.services.connection_manager.get_settings')
    @patch('app.services.connection_manager.get_logger')
    def test_close_connection(self, mock_get_logger, mock_get_settings):
        """接続クローズのテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        manager = ConnectionManager()
        
        # テスト用の接続を追加
        mock_connection = MagicMock()
        manager._connections['test_conn'] = mock_connection
        manager._connection_info['test_conn'] = ConnectionInfo(
            connection_id='test_conn',
            created_at=datetime.now(),
            last_used=datetime.now()
        )
        
        # 接続を閉じる
        manager._close_connection('test_conn')
        
        # 接続が削除されたことを確認
        assert 'test_conn' not in manager._connections
        assert 'test_conn' not in manager._connection_info
        mock_connection.close.assert_called_once()
    
    @patch('app.services.connection_manager.get_settings')
    @patch('app.services.connection_manager.get_logger')
    def test_get_connection_new_connection(self, mock_get_logger, mock_get_settings):
        """新規接続取得のテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        manager = ConnectionManager()
        
        with patch.object(manager, '_create_connection') as mock_create:
            mock_connection = MagicMock()
            mock_create.return_value = ('new_conn', mock_connection)
            
            conn_id, connection = manager.get_connection()
            
            assert conn_id == 'new_conn'
            assert connection == mock_connection
            assert 'new_conn' in manager._connections
            assert 'new_conn' in manager._connection_info
    
    @patch('app.services.connection_manager.get_settings')
    @patch('app.services.connection_manager.get_logger')
    def test_get_connection_existing_connection(self, mock_get_logger, mock_get_settings):
        """既存接続取得のテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        manager = ConnectionManager()
        
        # 既存の接続を追加
        mock_connection = MagicMock()
        manager._connections['existing_conn'] = mock_connection
        manager._connection_info['existing_conn'] = ConnectionInfo(
            connection_id='existing_conn',
            created_at=datetime.now(),
            last_used=datetime.now(),
            is_active=True,
            query_count=5
        )
        
        with patch.object(manager, '_create_connection') as mock_create:
            conn_id, connection = manager.get_connection()
            
            assert conn_id == 'existing_conn'
            assert connection == mock_connection
            # 新しい接続は作成されない
            mock_create.assert_not_called()
            # クエリカウントが増加
            assert manager._connection_info['existing_conn'].query_count == 6
    
    @patch('app.services.connection_manager.get_settings')
    @patch('app.services.connection_manager.get_logger')
    def test_release_connection(self, mock_get_logger, mock_get_settings):
        """接続リリースのテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        manager = ConnectionManager()
        
        # テスト用の接続を追加
        now = datetime.now()
        manager._connection_info['test_conn'] = ConnectionInfo(
            connection_id='test_conn',
            created_at=now,
            last_used=now,
            query_count=5
        )
        
        # 少し時間を進める
        time.sleep(0.1)
        
        # 接続をリリース
        manager.release_connection('test_conn')
        
        # last_usedが更新されたことを確認
        assert manager._connection_info['test_conn'].last_used > now
    
    @patch('app.services.connection_manager.get_settings')
    @patch('app.services.connection_manager.get_logger')
    @patch('snowflake.connector.connect')
    def test_test_connection_success(self, mock_connect, mock_get_logger, mock_get_settings):
        """接続テスト成功のテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        manager = ConnectionManager()
        
        with patch.object(manager, 'get_connection') as mock_get_conn:
            mock_connection = MagicMock()
            mock_cursor = MagicMock()
            mock_connection.cursor.return_value = mock_cursor
            mock_cursor.fetchone.return_value = [1]
            mock_get_conn.return_value = ('test_conn', mock_connection)
            
            result = manager.test_connection()
            
            assert result is True
            mock_cursor.execute.assert_called_once_with("SELECT 1")
            mock_cursor.close.assert_called_once()
    
    @patch('app.services.connection_manager.get_settings')
    @patch('app.services.connection_manager.get_logger')
    def test_test_connection_failure(self, mock_get_logger, mock_get_settings):
        """接続テスト失敗のテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        manager = ConnectionManager()
        
        with patch.object(manager, 'get_connection', side_effect=Exception("Connection failed")):
            result = manager.test_connection()
            
            assert result is False
    
    @patch('app.services.connection_manager.get_settings')
    @patch('app.services.connection_manager.get_logger')
    def test_get_pool_status(self, mock_get_logger, mock_get_settings):
        """接続プール状態取得のテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        manager = ConnectionManager()
        
        # テスト用の接続を追加
        now = datetime.now()
        manager._connections['conn1'] = MagicMock()
        manager._connections['conn2'] = MagicMock()
        manager._connection_info['conn1'] = ConnectionInfo(
            connection_id='conn1',
            created_at=now,
            last_used=now,
            is_active=True,
            query_count=5
        )
        manager._connection_info['conn2'] = ConnectionInfo(
            connection_id='conn2',
            created_at=now,
            last_used=now,
            is_active=False,
            query_count=3
        )
        
        status = manager.get_pool_status()
        
        assert status['total_connections'] == 2
        assert status['max_connections'] == 10
        assert status['active_connections'] == 1
        assert len(status['connection_details']) == 2
    
    @patch('app.services.connection_manager.get_settings')
    @patch('app.services.connection_manager.get_logger')
    def test_close_all_connections(self, mock_get_logger, mock_get_settings):
        """全接続クローズのテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        manager = ConnectionManager()
        
        # テスト用の接続を追加
        mock_connection1 = MagicMock()
        mock_connection2 = MagicMock()
        manager._connections['conn1'] = mock_connection1
        manager._connections['conn2'] = mock_connection2
        manager._connection_info['conn1'] = ConnectionInfo(
            connection_id='conn1',
            created_at=datetime.now(),
            last_used=datetime.now()
        )
        manager._connection_info['conn2'] = ConnectionInfo(
            connection_id='conn2',
            created_at=datetime.now(),
            last_used=datetime.now()
        )
        
        # 全接続を閉じる
        manager.close_all_connections()
        
        # 接続が削除されたことを確認
        assert len(manager._connections) == 0
        assert len(manager._connection_info) == 0
        mock_connection1.close.assert_called_once()
        mock_connection2.close.assert_called_once()
        assert manager._stop_monitoring is True


if __name__ == '__main__':
    pytest.main([__file__]) 