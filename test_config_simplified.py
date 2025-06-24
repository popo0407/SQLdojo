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
    
    def test_valid_settings(self):
        """有効な設定のテスト"""
        with patch.dict(os.environ, {
            'SNOWFLAKE_ACCOUNT': 'test-account',
            'SNOWFLAKE_USER': 'test-user',
            'SNOWFLAKE_PRIVATE_KEY_PATH': '/path/to/key.p8',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE': 'test-passphrase',
            'SNOWFLAKE_DATABASE': 'test-db'
        }):
            settings = Settings()
            assert settings.snowflake_account == 'test-account'
            assert settings.snowflake_user == 'test-user'
            assert settings.snowflake_private_key_path == '/path/to/key.p8'
            assert settings.snowflake_private_key_passphrase == 'test-passphrase'
            assert settings.snowflake_database == 'test-db'
            assert settings.snowflake_warehouse == 'COMPUTE_WH'  # デフォルト値
            assert settings.snowflake_schema == 'PUBLIC'  # デフォルト値
            assert settings.app_host == '0.0.0.0'  # デフォルト値
            assert settings.app_port == 8000  # デフォルト値
            assert settings.app_debug is False  # デフォルト値
            assert settings.log_level == 'INFO'  # デフォルト値
    
    def test_missing_required_fields(self):
        """必須フィールドが不足している場合のテスト"""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValidationError):
                Settings()
    
    def test_invalid_port(self):
        """無効なポート番号のテスト"""
        with patch.dict(os.environ, {
            'SNOWFLAKE_ACCOUNT': 'test-account',
            'SNOWFLAKE_USER': 'test-user',
            'SNOWFLAKE_PRIVATE_KEY_PATH': '/path/to/key.p8',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE': 'test-passphrase',
            'SNOWFLAKE_DATABASE': 'test-db',
            'APP_PORT': '99999'  # 無効なポート
        }):
            with pytest.raises(ValidationError):
                Settings()
    
    def test_invalid_log_level(self):
        """無効なログレベルのテスト"""
        with patch.dict(os.environ, {
            'SNOWFLAKE_ACCOUNT': 'test-account',
            'SNOWFLAKE_USER': 'test-user',
            'SNOWFLAKE_PRIVATE_KEY_PATH': '/path/to/key.p8',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE': 'test-passphrase',
            'SNOWFLAKE_DATABASE': 'test-db',
            'LOG_LEVEL': 'INVALID_LEVEL'
        }):
            with pytest.raises(ValidationError):
                Settings()
    
    def test_empty_required_fields(self):
        """必須フィールドが空の場合のテスト"""
        with patch.dict(os.environ, {
            'SNOWFLAKE_ACCOUNT': '',
            'SNOWFLAKE_USER': 'test-user',
            'SNOWFLAKE_PRIVATE_KEY_PATH': '/path/to/key.p8',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE': 'test-passphrase',
            'SNOWFLAKE_DATABASE': 'test-db'
        }):
            with pytest.raises(ValidationError):
                Settings()
    
    def test_case_insensitive(self):
        """大文字小文字を区別しないテスト"""
        with patch.dict(os.environ, {
            'snowflake_account': 'test-account',
            'SNOWFLAKE_USER': 'test-user',
            'snowflake_private_key_path': '/path/to/key.p8',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE': 'test-passphrase',
            'snowflake_database': 'test-db'
        }):
            settings = Settings()
            assert settings.snowflake_account == 'test-account'
            assert settings.snowflake_user == 'test-user'
            assert settings.snowflake_private_key_path == '/path/to/key.p8'
            assert settings.snowflake_private_key_passphrase == 'test-passphrase'
            assert settings.snowflake_database == 'test-db'


class TestGetSettings:
    """get_settings関数のテスト"""
    
    @patch('app.config_simplified._settings', None)
    def test_get_settings_singleton(self):
        """シングルトンパターンのテスト"""
        with patch.dict(os.environ, {
            'SNOWFLAKE_ACCOUNT': 'test-account',
            'SNOWFLAKE_USER': 'test-user',
            'SNOWFLAKE_PRIVATE_KEY_PATH': '/path/to/key.p8',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE': 'test-passphrase',
            'SNOWFLAKE_DATABASE': 'test-db'
        }):
            settings1 = get_settings()
            settings2 = get_settings()
            assert settings1 is settings2  # 同じインスタンス
    
    @patch('app.config_simplified._settings', None)
    def test_get_settings_error(self):
        """設定取得エラーのテスト"""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ConfigurationError):
                get_settings()


class TestValidateSettings:
    """validate_settings関数のテスト"""
    
    def test_validate_settings_success(self):
        """設定検証成功のテスト"""
        with patch.dict(os.environ, {
            'SNOWFLAKE_ACCOUNT': 'test-account',
            'SNOWFLAKE_USER': 'test-user',
            'SNOWFLAKE_PRIVATE_KEY_PATH': '/path/to/key.p8',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE': 'test-passphrase',
            'SNOWFLAKE_DATABASE': 'test-db'
        }):
            result = validate_settings()
            assert result is True
    
    def test_validate_settings_error(self):
        """設定検証エラーのテスト"""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ConfigurationError):
                validate_settings()


class TestBackwardCompatibility:
    """後方互換性関数のテスト"""
    
    def test_get_database_config(self):
        """get_database_config関数のテスト"""
        with patch.dict(os.environ, {
            'SNOWFLAKE_ACCOUNT': 'test-account',
            'SNOWFLAKE_USER': 'test-user',
            'SNOWFLAKE_PRIVATE_KEY_PATH': '/path/to/key.p8',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE': 'test-passphrase',
            'SNOWFLAKE_DATABASE': 'test-db',
            'SNOWFLAKE_WAREHOUSE': 'test-warehouse',
            'SNOWFLAKE_SCHEMA': 'test-schema',
            'SNOWFLAKE_ROLE': 'test-role'
        }):
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
    
    def test_get_app_config(self):
        """get_app_config関数のテスト"""
        with patch.dict(os.environ, {
            'SNOWFLAKE_ACCOUNT': 'test-account',
            'SNOWFLAKE_USER': 'test-user',
            'SNOWFLAKE_PRIVATE_KEY_PATH': '/path/to/key.p8',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE': 'test-passphrase',
            'SNOWFLAKE_DATABASE': 'test-db',
            'APP_HOST': '127.0.0.1',
            'APP_PORT': '9000',
            'APP_DEBUG': 'true'
        }):
            config = get_app_config()
            assert config.host == '127.0.0.1'
            assert config.port == 9000
            assert config.debug is True
    
    def test_get_log_config(self):
        """get_log_config関数のテスト"""
        with patch.dict(os.environ, {
            'SNOWFLAKE_ACCOUNT': 'test-account',
            'SNOWFLAKE_USER': 'test-user',
            'SNOWFLAKE_PRIVATE_KEY_PATH': '/path/to/key.p8',
            'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE': 'test-passphrase',
            'SNOWFLAKE_DATABASE': 'test-db',
            'LOG_LEVEL': 'DEBUG'
        }):
            config = get_log_config()
            assert config.level == 'DEBUG'


if __name__ == '__main__':
    pytest.main([__file__]) 