# -*- coding: utf-8 -*-
"""
設定クラスのテスト
"""
import os
import tempfile
import pytest
from unittest.mock import patch, MagicMock
from pydantic import ValidationError
from pydantic_settings import BaseSettings

from app.config_simplified import Settings, get_settings, validate_settings, get_database_config, get_app_config, get_log_config
from app.exceptions import ConfigurationError


class TestSettingsNoEnv(Settings):
    model_config = {
        'env_file': None,
        'case_sensitive': False,
        'extra': 'ignore'
    }


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
            os.environ['SNOWFLAKE_WAREHOUSE'] = 'ZHH001'
            os.environ['SNOWFLAKE_SCHEMA'] = 'PUBLIC'
            os.environ['SNOWFLAKE_ROLE'] = 'ACCOUNTADMIN'
            os.environ['APP_HOST'] = '0.0.0.0'
            os.environ['APP_PORT'] = '8001'
            os.environ['APP_DEBUG'] = 'false'
            os.environ['LOG_LEVEL'] = 'INFO'
            
            settings = Settings()
            assert settings.snowflake_account == 'test-account'
            assert settings.snowflake_user == 'test-user'
            assert settings.snowflake_private_key_path == '/path/to/key.p8'
            assert settings.snowflake_private_key_passphrase == 'test-passphrase'
            assert settings.snowflake_database == 'test-db'
            assert settings.snowflake_warehouse == 'ZHH001'
            assert settings.snowflake_schema == 'PUBLIC'
            assert settings.snowflake_role == 'ACCOUNTADMIN'
            assert settings.app_host == '0.0.0.0'
            assert settings.app_port == 8001
            assert settings.app_debug is False
            assert settings.log_level == 'INFO'
        finally:
            # 元の環境変数を復元
            for var, value in original_env.items():
                os.environ[var] = value
    
    @patch('app.config_simplified.load_dotenv')
    def test_missing_required_fields(self, mock_load_dotenv):
        """必須フィールド（snowflake_account等）が未設定の場合は例外が発生する"""
        # 環境変数を完全にクリア
        with patch.dict(os.environ, {}, clear=True):
            # 必須フィールドが未設定の場合、ValidationErrorが発生するはず
            with pytest.raises(ValidationError):
                TestSettingsNoEnv()
    
    @patch('app.config_simplified.load_dotenv')
    def test_partial_required_fields(self, mock_load_dotenv):
        """一部の必須フィールドのみ設定されている場合のテスト"""
        # 環境変数を完全にクリア
        with patch.dict(os.environ, {}, clear=True):
            # snowflake_accountのみ設定
            os.environ['SNOWFLAKE_ACCOUNT'] = 'test-account'
            with pytest.raises(ValidationError):
                TestSettingsNoEnv()
            
            # snowflake_userも設定
            os.environ['SNOWFLAKE_USER'] = 'test-user'
            with pytest.raises(ValidationError):
                TestSettingsNoEnv()
            
            # snowflake_private_key_pathも設定
            os.environ['SNOWFLAKE_PRIVATE_KEY_PATH'] = '/path/to/key.p8'
            with pytest.raises(ValidationError):
                TestSettingsNoEnv()
            
            # snowflake_private_key_passphraseも設定
            os.environ['SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'] = 'test-passphrase'
            with pytest.raises(ValidationError):
                TestSettingsNoEnv()
            
            # snowflake_databaseも設定
            os.environ['SNOWFLAKE_DATABASE'] = 'test-db'
            # これで全ての必須フィールドが設定されたので、ValidationErrorは発生しない
            settings = TestSettingsNoEnv()
            assert settings.snowflake_account == 'test-account'
            assert settings.snowflake_user == 'test-user'
            assert settings.snowflake_private_key_path == '/path/to/key.p8'
            assert settings.snowflake_private_key_passphrase == 'test-passphrase'
            assert settings.snowflake_database == 'test-db'
    
    @patch('app.config_simplified.load_dotenv')
    def test_default_values(self, mock_load_dotenv):
        """デフォルト値のテスト"""
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
            # 必須フィールドのみ設定
            os.environ['SNOWFLAKE_ACCOUNT'] = 'test-account'
            os.environ['SNOWFLAKE_USER'] = 'test-user'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PATH'] = '/path/to/key.p8'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'] = 'test-passphrase'
            os.environ['SNOWFLAKE_DATABASE'] = 'test-db'
            
            settings = Settings()
            # デフォルト値の確認
            assert settings.snowflake_warehouse == 'COMPUTE_WH'
            assert settings.snowflake_schema == 'PUBLIC'
            assert settings.snowflake_role == ''
            assert settings.app_host == '0.0.0.0'
            assert settings.app_port == 8000
            assert settings.app_debug is False
            assert settings.log_level == 'INFO'
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
            os.environ['SNOWFLAKE_WAREHOUSE'] = 'ZHH001'
            os.environ['SNOWFLAKE_SCHEMA'] = 'PUBLIC'
            os.environ['SNOWFLAKE_ROLE'] = 'ACCOUNTADMIN'
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
            os.environ['SNOWFLAKE_WAREHOUSE'] = 'ZHH001'
            os.environ['SNOWFLAKE_SCHEMA'] = 'PUBLIC'
            os.environ['SNOWFLAKE_ROLE'] = 'ACCOUNTADMIN'
            os.environ['APP_HOST'] = '0.0.0.0'
            os.environ['APP_PORT'] = '8001'
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
            # テスト用の環境変数を設定（空文字列）
            os.environ['SNOWFLAKE_ACCOUNT'] = ''
            os.environ['SNOWFLAKE_USER'] = 'test-user'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PATH'] = '/path/to/key.p8'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'] = 'test-passphrase'
            os.environ['SNOWFLAKE_DATABASE'] = 'test-db'
            
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
            # 小文字の環境変数名で設定
            os.environ['snowflake_account'] = 'test-account'
            os.environ['snowflake_user'] = 'test-user'
            os.environ['snowflake_private_key_path'] = '/path/to/key.p8'
            os.environ['snowflake_private_key_passphrase'] = 'test-passphrase'
            os.environ['snowflake_database'] = 'test-db'
            os.environ['snowflake_warehouse'] = 'ZHH001'
            os.environ['snowflake_schema'] = 'PUBLIC'
            os.environ['snowflake_role'] = 'ACCOUNTADMIN'
            os.environ['app_host'] = '0.0.0.0'
            os.environ['app_port'] = '8001'
            os.environ['app_debug'] = 'false'
            os.environ['log_level'] = 'INFO'
            
            settings = Settings()
            assert settings.snowflake_account == 'test-account'
            assert settings.snowflake_user == 'test-user'
            assert settings.snowflake_private_key_path == '/path/to/key.p8'
            assert settings.snowflake_private_key_passphrase == 'test-passphrase'
            assert settings.snowflake_database == 'test-db'
            assert settings.snowflake_warehouse == 'ZHH001'
            assert settings.snowflake_schema == 'PUBLIC'
            assert settings.snowflake_role == 'ACCOUNTADMIN'
            assert settings.app_host == '0.0.0.0'
            assert settings.app_port == 8001
            assert settings.app_debug is False
            assert settings.log_level == 'INFO'
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
            os.environ['SNOWFLAKE_WAREHOUSE'] = 'ZHH001'
            os.environ['SNOWFLAKE_SCHEMA'] = 'PUBLIC'
            os.environ['SNOWFLAKE_ROLE'] = 'ACCOUNTADMIN'
            os.environ['APP_HOST'] = '0.0.0.0'
            os.environ['APP_PORT'] = '8001'
            os.environ['APP_DEBUG'] = 'false'
            os.environ['LOG_LEVEL'] = 'INFO'
            
            # 初回呼び出し
            settings1 = get_settings()
            assert settings1 is not None
            assert settings1.snowflake_account == 'test-account'
            
            # 2回目の呼び出し（同じインスタンスが返される）
            settings2 = get_settings()
            assert settings2 is settings1
        finally:
            # 元の環境変数を復元
            for var, value in original_env.items():
                os.environ[var] = value
    
    @patch('app.config_simplified._settings', None)
    @patch('app.config_simplified.load_dotenv')
    def test_get_settings_error(self, mock_load_dotenv):
        """設定エラー時のテスト"""
        # 環境変数を完全にクリア
        with patch.dict(os.environ, {}, clear=True):
            # .envファイルが存在しない場合のテスト
            # 実際の環境では.envファイルが存在するため、このテストは実際の動作を反映していない
            # 代わりに、無効な設定値でのエラーテストを行う
            os.environ['SNOWFLAKE_ACCOUNT'] = 'test-account'
            os.environ['SNOWFLAKE_USER'] = 'test-user'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PATH'] = '/path/to/key.p8'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'] = 'test-passphrase'
            os.environ['SNOWFLAKE_DATABASE'] = 'test-db'
            os.environ['APP_PORT'] = '99999'  # 無効なポート
            
            with pytest.raises(ConfigurationError):
                get_settings()


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
            os.environ['SNOWFLAKE_WAREHOUSE'] = 'ZHH001'
            os.environ['SNOWFLAKE_SCHEMA'] = 'PUBLIC'
            os.environ['SNOWFLAKE_ROLE'] = 'ACCOUNTADMIN'
            os.environ['APP_HOST'] = '0.0.0.0'
            os.environ['APP_PORT'] = '8001'
            os.environ['APP_DEBUG'] = 'false'
            os.environ['LOG_LEVEL'] = 'INFO'
            
            # 設定検証
            result = validate_settings()
            assert result is True
        finally:
            # 元の環境変数を復元
            for var, value in original_env.items():
                os.environ[var] = value
    
    @patch('app.config_simplified.load_dotenv')
    def test_validate_settings_error(self, mock_load_dotenv):
        """設定検証エラーのテスト"""
        # 環境変数を完全にクリア
        with patch.dict(os.environ, {}, clear=True):
            # .envファイルが存在しない場合のテスト
            # 実際の環境では.envファイルが存在するため、このテストは実際の動作を反映していない
            # 代わりに、無効な設定値でのエラーテストを行う
            os.environ['SNOWFLAKE_ACCOUNT'] = 'test-account'
            os.environ['SNOWFLAKE_USER'] = 'test-user'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PATH'] = '/path/to/key.p8'
            os.environ['SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'] = 'test-passphrase'
            os.environ['SNOWFLAKE_DATABASE'] = 'test-db'
            os.environ['APP_PORT'] = '99999'  # 無効なポート
            
            # グローバル設定インスタンスをリセット
            from app.config_simplified import _settings
            import app.config_simplified
            app.config_simplified._settings = None
            
            with pytest.raises((ConfigurationError, ValidationError)):
                validate_settings()


class TestBackwardCompatibility:
    """後方互換性のテスト"""
    
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
            os.environ['SNOWFLAKE_WAREHOUSE'] = 'ZHH001'
            os.environ['SNOWFLAKE_SCHEMA'] = 'PUBLIC'
            os.environ['SNOWFLAKE_ROLE'] = 'ACCOUNTADMIN'
            
            config = get_database_config()
            assert config.host == 'test-account'
            assert config.username == 'test-user'
            assert config.private_key_path == '/path/to/key.p8'
            assert config.private_key_passphrase == 'test-passphrase'
            assert config.warehouse == 'ZHH001'
            assert config.database == 'test-db'
            assert config.db_schema == 'PUBLIC'
            assert config.role == 'ACCOUNTADMIN'
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
            os.environ['APP_HOST'] = '0.0.0.0'
            os.environ['APP_PORT'] = '8001'
            os.environ['APP_DEBUG'] = 'false'
            
            config = get_app_config()
            assert config.host == '0.0.0.0'
            assert config.port == 8001
            assert config.debug is False
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
            os.environ['LOG_LEVEL'] = 'INFO'
            
            config = get_log_config()
            assert config.level == 'INFO'
        finally:
            # 元の環境変数を復元
            for var, value in original_env.items():
                os.environ[var] = value


if __name__ == '__main__':
    pytest.main([__file__]) 