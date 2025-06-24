# -*- coding: utf-8 -*-
"""
設定クラスのテスト
"""
import os
import tempfile
import pytest
from unittest.mock import patch, MagicMock
from pydantic import ValidationError

from app.config_simplified import Settings, get_settings, validate_settings, get_database_config, get_app_config, get_log_config
from app.exceptions import ConfigurationError


class TestSettings:
    """Settingsクラスのテスト"""
    
    @patch('app.config_simplified.load_dotenv')
    def test_valid_settings(self, mock_load_dotenv):
        """有効な設定のテスト"""
        # 既存の環境変数をクリア
        env_vars_to_clear = [
            'SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PRIVATE_KEY_PATH',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE', 'SNOWFLAKE_DATABASE',
            'SNOWFLAKE_WAREHOUSE', 'SNOWFLAKE_SCHEMA', 'SNOWFLAKE_ROLE',
            'APP_HOST', 'APP_PORT', 'APP_DEBUG', 'LOG_LEVEL'
        ]
        original_env = {}
        for var in env_vars_to_clear:
            if var in os.environ:
                original_env[var] = os.environ[var]
                del os.environ[var]
        
        try:
            # テスト用の環境変数を設定
            os.environ['SNOWFLAKE_ACCOUNT'] = 'test-account'
            os.environ['SNOWFLAKE_USER'] = 'test-user'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PATH'] = '/path/to/key.p8'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'] = 'test-passphrase'
            os.environ['SNOWFLAKE_DATABASE'] = 'test-db'
            os.environ['SNOWFLAKE_WAREHOUSE'] = 'COMPUTE_WH'
            os.environ['SNOWFLAKE_SCHEMA'] = 'PUBLIC'
            os.environ['SNOWFLAKE_ROLE'] = ''
            os.environ['APP_HOST'] = '0.0.0.0'
            os.environ['APP_PORT'] = '8000'
            os.environ['APP_DEBUG'] = 'false'
            os.environ['LOG_LEVEL'] = 'INFO'
            
            settings = Settings()
            assert settings.snowflake_account == 'test-account'
            assert settings.snowflake_user == 'test-user'
            assert settings.snowflake_private_key_path == '/path/to/key.p8'
            assert settings.snowflake_private_key_passphrase == 'test-passphrase'
            assert settings.snowflake_database == 'test-db'
            assert settings.snowflake_warehouse == 'COMPUTE_WH'
            assert settings.snowflake_schema == 'PUBLIC'
            assert settings.app_host == '0.0.0.0'
            assert settings.app_port == 8000
            assert settings.app_debug is False
            assert settings.log_level == 'INFO'
        finally:
            # 元の環境変数を復元
            for var, value in original_env.items():
                os.environ[var] = value
    
    @patch('app.config_simplified.load_dotenv')
    def test_missing_required_fields(self, mock_load_dotenv):
        """必須フィールドが不足している場合のテスト"""
        # 既存の環境変数をクリア
        env_vars_to_clear = [
            'SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PRIVATE_KEY_PATH',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE', 'SNOWFLAKE_DATABASE',
            'SNOWFLAKE_WAREHOUSE', 'SNOWFLAKE_SCHEMA', 'SNOWFLAKE_ROLE',
            'APP_HOST', 'APP_PORT', 'APP_DEBUG', 'LOG_LEVEL'
        ]
        original_env = {}
        for var in env_vars_to_clear:
            if var in os.environ:
                original_env[var] = os.environ[var]
                del os.environ[var]
        
        try:
            # 必須フィールドを設定しない
            with pytest.raises(ValidationError):
                Settings()
        finally:
            # 元の環境変数を復元
            for var, value in original_env.items():
                os.environ[var] = value
    
    @patch('app.config_simplified.load_dotenv')
    def test_invalid_port(self, mock_load_dotenv):
        """無効なポート番号のテスト"""
        # 既存の環境変数をクリア
        env_vars_to_clear = [
            'SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PRIVATE_KEY_PATH',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE', 'SNOWFLAKE_DATABASE',
            'SNOWFLAKE_WAREHOUSE', 'SNOWFLAKE_SCHEMA', 'SNOWFLAKE_ROLE',
            'APP_HOST', 'APP_PORT', 'APP_DEBUG', 'LOG_LEVEL'
        ]
        original_env = {}
        for var in env_vars_to_clear:
            if var in os.environ:
                original_env[var] = os.environ[var]
                del os.environ[var]
        
        try:
            # テスト用の環境変数を設定
            os.environ['SNOWFLAKE_ACCOUNT'] = 'test-account'
            os.environ['SNOWFLAKE_USER'] = 'test-user'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PATH'] = '/path/to/key.p8'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'] = 'test-passphrase'
            os.environ['SNOWFLAKE_DATABASE'] = 'test-db'
            os.environ['SNOWFLAKE_WAREHOUSE'] = 'COMPUTE_WH'
            os.environ['SNOWFLAKE_SCHEMA'] = 'PUBLIC'
            os.environ['SNOWFLAKE_ROLE'] = ''
            os.environ['APP_HOST'] = '0.0.0.0'
            os.environ['APP_PORT'] = '99999'  # 無効なポート
            os.environ['APP_DEBUG'] = 'false'
            os.environ['LOG_LEVEL'] = 'INFO'
            
            with pytest.raises(ValidationError):
                Settings()
        finally:
            # 元の環境変数を復元
            for var, value in original_env.items():
                os.environ[var] = value
    
    @patch('app.config_simplified.load_dotenv')
    def test_invalid_log_level(self, mock_load_dotenv):
        """無効なログレベルのテスト"""
        # 既存の環境変数をクリア
        env_vars_to_clear = [
            'SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PRIVATE_KEY_PATH',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE', 'SNOWFLAKE_DATABASE',
            'SNOWFLAKE_WAREHOUSE', 'SNOWFLAKE_SCHEMA', 'SNOWFLAKE_ROLE',
            'APP_HOST', 'APP_PORT', 'APP_DEBUG', 'LOG_LEVEL'
        ]
        original_env = {}
        for var in env_vars_to_clear:
            if var in os.environ:
                original_env[var] = os.environ[var]
                del os.environ[var]
        
        try:
            # テスト用の環境変数を設定
            os.environ['SNOWFLAKE_ACCOUNT'] = 'test-account'
            os.environ['SNOWFLAKE_USER'] = 'test-user'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PATH'] = '/path/to/key.p8'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'] = 'test-passphrase'
            os.environ['SNOWFLAKE_DATABASE'] = 'test-db'
            os.environ['SNOWFLAKE_WAREHOUSE'] = 'COMPUTE_WH'
            os.environ['SNOWFLAKE_SCHEMA'] = 'PUBLIC'
            os.environ['SNOWFLAKE_ROLE'] = ''
            os.environ['APP_HOST'] = '0.0.0.0'
            os.environ['APP_PORT'] = '8000'
            os.environ['APP_DEBUG'] = 'false'
            os.environ['LOG_LEVEL'] = 'INVALID_LEVEL'
            
            with pytest.raises(ValidationError):
                Settings()
        finally:
            # 元の環境変数を復元
            for var, value in original_env.items():
                os.environ[var] = value
    
    @patch('app.config_simplified.load_dotenv')
    def test_empty_required_fields(self, mock_load_dotenv):
        """必須フィールドが空の場合のテスト"""
        # 既存の環境変数をクリア
        env_vars_to_clear = [
            'SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PRIVATE_KEY_PATH',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE', 'SNOWFLAKE_DATABASE',
            'SNOWFLAKE_WAREHOUSE', 'SNOWFLAKE_SCHEMA', 'SNOWFLAKE_ROLE',
            'APP_HOST', 'APP_PORT', 'APP_DEBUG', 'LOG_LEVEL'
        ]
        original_env = {}
        for var in env_vars_to_clear:
            if var in os.environ:
                original_env[var] = os.environ[var]
                del os.environ[var]
        
        try:
            # テスト用の環境変数を設定
            os.environ['SNOWFLAKE_ACCOUNT'] = ''
            os.environ['SNOWFLAKE_USER'] = 'test-user'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PATH'] = '/path/to/key.p8'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'] = 'test-passphrase'
            os.environ['SNOWFLAKE_DATABASE'] = 'test-db'
            os.environ['SNOWFLAKE_WAREHOUSE'] = 'COMPUTE_WH'
            os.environ['SNOWFLAKE_SCHEMA'] = 'PUBLIC'
            os.environ['SNOWFLAKE_ROLE'] = ''
            os.environ['APP_HOST'] = '0.0.0.0'
            os.environ['APP_PORT'] = '8000'
            os.environ['APP_DEBUG'] = 'false'
            os.environ['LOG_LEVEL'] = 'INFO'
            
            with pytest.raises(ValidationError):
                Settings()
        finally:
            # 元の環境変数を復元
            for var, value in original_env.items():
                os.environ[var] = value
    
    @patch('app.config_simplified.load_dotenv')
    def test_case_insensitive(self, mock_load_dotenv):
        """大文字小文字を区別しないテスト"""
        # 既存の環境変数をクリア
        env_vars_to_clear = [
            'SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PRIVATE_KEY_PATH',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE', 'SNOWFLAKE_DATABASE',
            'SNOWFLAKE_WAREHOUSE', 'SNOWFLAKE_SCHEMA', 'SNOWFLAKE_ROLE',
            'APP_HOST', 'APP_PORT', 'APP_DEBUG', 'LOG_LEVEL'
        ]
        original_env = {}
        for var in env_vars_to_clear:
            if var in os.environ:
                original_env[var] = os.environ[var]
                del os.environ[var]
        
        try:
            # テスト用の環境変数を設定
            os.environ['snowflake_account'] = 'test-account'
            os.environ['SNOWFLAKE_USER'] = 'test-user'
            os.environ['snowflake_private_key_path'] = '/path/to/key.p8'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'] = 'test-passphrase'
            os.environ['snowflake_database'] = 'test-db'
            os.environ['SNOWFLAKE_WAREHOUSE'] = 'COMPUTE_WH'
            os.environ['SNOWFLAKE_SCHEMA'] = 'PUBLIC'
            os.environ['SNOWFLAKE_ROLE'] = ''
            os.environ['APP_HOST'] = '0.0.0.0'
            os.environ['APP_PORT'] = '8000'
            os.environ['APP_DEBUG'] = 'false'
            os.environ['LOG_LEVEL'] = 'INFO'
            
            settings = Settings()
            assert settings.snowflake_account == 'test-account'
            assert settings.snowflake_user == 'test-user'
            assert settings.snowflake_private_key_path == '/path/to/key.p8'
            assert settings.snowflake_private_key_passphrase == 'test-passphrase'
            assert settings.snowflake_database == 'test-db'
        finally:
            # 元の環境変数を復元
            for var, value in original_env.items():
                os.environ[var] = value


class TestGetSettings:
    """get_settings関数のテスト"""
    
    @patch('app.config_simplified._settings', None)
    @patch('app.config_simplified.load_dotenv')
    def test_get_settings_singleton(self, mock_load_dotenv):
        """シングルトンパターンのテスト"""
        # 既存の環境変数をクリア
        env_vars_to_clear = [
            'SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PRIVATE_KEY_PATH',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE', 'SNOWFLAKE_DATABASE',
            'SNOWFLAKE_WAREHOUSE', 'SNOWFLAKE_SCHEMA', 'SNOWFLAKE_ROLE',
            'APP_HOST', 'APP_PORT', 'APP_DEBUG', 'LOG_LEVEL'
        ]
        original_env = {}
        for var in env_vars_to_clear:
            if var in os.environ:
                original_env[var] = os.environ[var]
                del os.environ[var]
        
        try:
            # テスト用の環境変数を設定
            os.environ['SNOWFLAKE_ACCOUNT'] = 'test-account'
            os.environ['SNOWFLAKE_USER'] = 'test-user'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PATH'] = '/path/to/key.p8'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'] = 'test-passphrase'
            os.environ['SNOWFLAKE_DATABASE'] = 'test-db'
            os.environ['SNOWFLAKE_WAREHOUSE'] = 'COMPUTE_WH'
            os.environ['SNOWFLAKE_SCHEMA'] = 'PUBLIC'
            os.environ['SNOWFLAKE_ROLE'] = ''
            os.environ['APP_HOST'] = '0.0.0.0'
            os.environ['APP_PORT'] = '8000'
            os.environ['APP_DEBUG'] = 'false'
            os.environ['LOG_LEVEL'] = 'INFO'
            
            settings1 = get_settings()
            settings2 = get_settings()
            assert settings1 is settings2  # 同じインスタンス
        finally:
            # 元の環境変数を復元
            for var, value in original_env.items():
                os.environ[var] = value
    
    @patch('app.config_simplified._settings', None)
    @patch('app.config_simplified.load_dotenv')
    def test_get_settings_error(self, mock_load_dotenv):
        """設定取得エラーのテスト"""
        # 既存の環境変数をクリア
        env_vars_to_clear = [
            'SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PRIVATE_KEY_PATH',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE', 'SNOWFLAKE_DATABASE',
            'SNOWFLAKE_WAREHOUSE', 'SNOWFLAKE_SCHEMA', 'SNOWFLAKE_ROLE',
            'APP_HOST', 'APP_PORT', 'APP_DEBUG', 'LOG_LEVEL'
        ]
        original_env = {}
        for var in env_vars_to_clear:
            if var in os.environ:
                original_env[var] = os.environ[var]
                del os.environ[var]
        
        try:
            with pytest.raises(ConfigurationError):
                get_settings()
        finally:
            # 元の環境変数を復元
            for var, value in original_env.items():
                os.environ[var] = value


class TestValidateSettings:
    """validate_settings関数のテスト"""
    
    @patch('app.config_simplified.load_dotenv')
    def test_validate_settings_success(self, mock_load_dotenv):
        """設定検証成功のテスト"""
        # 既存の環境変数をクリア
        env_vars_to_clear = [
            'SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PRIVATE_KEY_PATH',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE', 'SNOWFLAKE_DATABASE',
            'SNOWFLAKE_WAREHOUSE', 'SNOWFLAKE_SCHEMA', 'SNOWFLAKE_ROLE',
            'APP_HOST', 'APP_PORT', 'APP_DEBUG', 'LOG_LEVEL'
        ]
        original_env = {}
        for var in env_vars_to_clear:
            if var in os.environ:
                original_env[var] = os.environ[var]
                del os.environ[var]
        
        try:
            # テスト用の環境変数を設定
            os.environ['SNOWFLAKE_ACCOUNT'] = 'test-account'
            os.environ['SNOWFLAKE_USER'] = 'test-user'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PATH'] = '/path/to/key.p8'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'] = 'test-passphrase'
            os.environ['SNOWFLAKE_DATABASE'] = 'test-db'
            os.environ['SNOWFLAKE_WAREHOUSE'] = 'COMPUTE_WH'
            os.environ['SNOWFLAKE_SCHEMA'] = 'PUBLIC'
            os.environ['SNOWFLAKE_ROLE'] = ''
            os.environ['APP_HOST'] = '0.0.0.0'
            os.environ['APP_PORT'] = '8000'
            os.environ['APP_DEBUG'] = 'false'
            os.environ['LOG_LEVEL'] = 'INFO'
            
            result = validate_settings()
            assert result is True
        finally:
            # 元の環境変数を復元
            for var, value in original_env.items():
                os.environ[var] = value
    
    @patch('app.config_simplified.load_dotenv')
    def test_validate_settings_error(self, mock_load_dotenv):
        """設定検証エラーのテスト"""
        # 既存の環境変数をクリア
        env_vars_to_clear = [
            'SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PRIVATE_KEY_PATH',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE', 'SNOWFLAKE_DATABASE',
            'SNOWFLAKE_WAREHOUSE', 'SNOWFLAKE_SCHEMA', 'SNOWFLAKE_ROLE',
            'APP_HOST', 'APP_PORT', 'APP_DEBUG', 'LOG_LEVEL'
        ]
        original_env = {}
        for var in env_vars_to_clear:
            if var in os.environ:
                original_env[var] = os.environ[var]
                del os.environ[var]
        
        try:
            with pytest.raises(ConfigurationError):
                validate_settings()
        finally:
            # 元の環境変数を復元
            for var, value in original_env.items():
                os.environ[var] = value


class TestBackwardCompatibility:
    """後方互換性関数のテスト"""
    
    @patch('app.config_simplified.load_dotenv')
    def test_get_database_config(self, mock_load_dotenv):
        """get_database_config関数のテスト"""
        # 既存の環境変数をクリア
        env_vars_to_clear = [
            'SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PRIVATE_KEY_PATH',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE', 'SNOWFLAKE_DATABASE',
            'SNOWFLAKE_WAREHOUSE', 'SNOWFLAKE_SCHEMA', 'SNOWFLAKE_ROLE',
            'APP_HOST', 'APP_PORT', 'APP_DEBUG', 'LOG_LEVEL'
        ]
        original_env = {}
        for var in env_vars_to_clear:
            if var in os.environ:
                original_env[var] = os.environ[var]
                del os.environ[var]
        
        try:
            # テスト用の環境変数を設定
            os.environ['SNOWFLAKE_ACCOUNT'] = 'test-account'
            os.environ['SNOWFLAKE_USER'] = 'test-user'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PATH'] = '/path/to/key.p8'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'] = 'test-passphrase'
            os.environ['SNOWFLAKE_DATABASE'] = 'test-db'
            os.environ['SNOWFLAKE_WAREHOUSE'] = 'test-warehouse'
            os.environ['SNOWFLAKE_SCHEMA'] = 'test-schema'
            os.environ['SNOWFLAKE_ROLE'] = 'test-role'
            os.environ['APP_HOST'] = '0.0.0.0'
            os.environ['APP_PORT'] = '8000'
            os.environ['APP_DEBUG'] = 'false'
            os.environ['LOG_LEVEL'] = 'INFO'
            
            config = get_database_config()
            assert config.host == 'test-account'
            assert config.username == 'test-user'
            assert config.private_key_path == '/path/to/key.p8'
            assert config.private_key_passphrase == 'test-passphrase'
            assert config.warehouse == 'test-warehouse'
            assert config.database == 'test-db'
            assert config.db_schema == 'test-schema'
            assert config.role == 'test-role'
            assert config.timeout == 30
            assert config.max_connections == 10
        finally:
            # 元の環境変数を復元
            for var, value in original_env.items():
                os.environ[var] = value
    
    @patch('app.config_simplified.load_dotenv')
    def test_get_app_config(self, mock_load_dotenv):
        """get_app_config関数のテスト"""
        # 既存の環境変数をクリア
        env_vars_to_clear = [
            'SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PRIVATE_KEY_PATH',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE', 'SNOWFLAKE_DATABASE',
            'SNOWFLAKE_WAREHOUSE', 'SNOWFLAKE_SCHEMA', 'SNOWFLAKE_ROLE',
            'APP_HOST', 'APP_PORT', 'APP_DEBUG', 'LOG_LEVEL'
        ]
        original_env = {}
        for var in env_vars_to_clear:
            if var in os.environ:
                original_env[var] = os.environ[var]
                del os.environ[var]
        
        try:
            # テスト用の環境変数を設定
            os.environ['SNOWFLAKE_ACCOUNT'] = 'test-account'
            os.environ['SNOWFLAKE_USER'] = 'test-user'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PATH'] = '/path/to/key.p8'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'] = 'test-passphrase'
            os.environ['SNOWFLAKE_DATABASE'] = 'test-db'
            os.environ['SNOWFLAKE_WAREHOUSE'] = 'COMPUTE_WH'
            os.environ['SNOWFLAKE_SCHEMA'] = 'PUBLIC'
            os.environ['SNOWFLAKE_ROLE'] = ''
            os.environ['APP_HOST'] = '127.0.0.1'
            os.environ['APP_PORT'] = '9000'
            os.environ['APP_DEBUG'] = 'true'
            os.environ['LOG_LEVEL'] = 'INFO'
            
            config = get_app_config()
            assert config.host == '127.0.0.1'
            assert config.port == 9000
            assert config.debug is True
        finally:
            # 元の環境変数を復元
            for var, value in original_env.items():
                os.environ[var] = value
    
    @patch('app.config_simplified.load_dotenv')
    def test_get_log_config(self, mock_load_dotenv):
        """get_log_config関数のテスト"""
        # 既存の環境変数をクリア
        env_vars_to_clear = [
            'SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USER', 'SNOWFLAKE_PRIVATE_KEY_PATH',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE', 'SNOWFLAKE_DATABASE',
            'SNOWFLAKE_WAREHOUSE', 'SNOWFLAKE_SCHEMA', 'SNOWFLAKE_ROLE',
            'APP_HOST', 'APP_PORT', 'APP_DEBUG', 'LOG_LEVEL'
        ]
        original_env = {}
        for var in env_vars_to_clear:
            if var in os.environ:
                original_env[var] = os.environ[var]
                del os.environ[var]
        
        try:
            # テスト用の環境変数を設定
            os.environ['SNOWFLAKE_ACCOUNT'] = 'test-account'
            os.environ['SNOWFLAKE_USER'] = 'test-user'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PATH'] = '/path/to/key.p8'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'] = 'test-passphrase'
            os.environ['SNOWFLAKE_DATABASE'] = 'test-db'
            os.environ['SNOWFLAKE_WAREHOUSE'] = 'COMPUTE_WH'
            os.environ['SNOWFLAKE_SCHEMA'] = 'PUBLIC'
            os.environ['SNOWFLAKE_ROLE'] = ''
            os.environ['APP_HOST'] = '0.0.0.0'
            os.environ['APP_PORT'] = '8000'
            os.environ['APP_DEBUG'] = 'false'
            os.environ['LOG_LEVEL'] = 'DEBUG'
            
            config = get_log_config()
            assert config.level == 'DEBUG'
        finally:
            # 元の環境変数を復元
            for var, value in original_env.items():
                os.environ[var] = value


if __name__ == '__main__':
    pytest.main([__file__]) 