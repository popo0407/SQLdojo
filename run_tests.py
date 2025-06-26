# -*- coding: utf-8 -*-
"""
全テスト一括実行スクリプト
"""
import sys
import os
import time
import importlib.util

def setup_test_environment():
    """テスト環境のセットアップ"""
    # テスト用の環境変数を設定
    test_env_vars = {
        'SNOWFLAKE_ACCOUNT': 'test-account',
        'SNOWFLAKE_USER': 'test-user',
        'SNOWFLAKE_PASSWORD': 'test-password',
        'SNOWFLAKE_WAREHOUSE': 'test-warehouse',
        'SNOWFLAKE_DATABASE': 'test-database',
        'SECURITY_READ_ONLY_MODE': 'true',
        'SECURITY_ALLOWED_SCHEMAS': '["PUBLIC", "TEST"]',
        'SECURITY_KEY_COLUMNS': '["ID", "USER_ID"]',
        'LOG_LEVEL': 'INFO'
    }
    
    for key, value in test_env_vars.items():
        if key not in os.environ:
            os.environ[key] = value

def run_test_module(module_name, test_file):
    """テストモジュールを実行"""
    print(f"\n{'='*60}")
    print(f"🧪 {module_name} のテストを実行中...")
    print(f"{'='*60}")
    
    try:
        # テストファイルをモジュールとして読み込み
        spec = importlib.util.spec_from_file_location("test_module", test_file)
        test_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(test_module)
        
        # run_all_tests関数を実行
        if hasattr(test_module, 'run_all_tests'):
            test_module.run_all_tests()
            print(f"✅ {module_name} のテストが完了しました")
            return True
        else:
            print(f"❌ {module_name} にrun_all_tests関数が見つかりません")
            return False
            
    except Exception as e:
        print(f"❌ {module_name} のテストでエラーが発生しました: {e}")
        return False

def main():
    """メイン実行関数"""
    print("🚀 Snowsight風SQL Webアプリ - 全テスト実行")
    print("="*60)
    
    # テスト環境をセットアップ
    setup_test_environment()
    
    # テストモジュールの定義
    test_modules = [
        ("設定管理モジュール", "test_config_simplified.py"),
        ("APIモデルモジュール", "test_api_models.py"),
        ("接続管理モジュール", "test_connection_manager.py"),
        ("サービスモジュール", "test_services.py"),
        ("統合テストモジュール", "test_integration.py"),
        ("メタデータ更新モジュール", "test_metadata_update.py"),
    ]
    
    start_time = time.time()
    success_count = 0
    total_count = len(test_modules)
    
    for module_name, test_file in test_modules:
        if os.path.exists(test_file):
            if run_test_module(module_name, test_file):
                success_count += 1
        else:
            print(f"⚠️ テストファイルが見つかりません: {test_file}")
    
    end_time = time.time()
    total_time = end_time - start_time
    
    print(f"\n{'='*60}")
    print("📊 テスト結果サマリー")
    print(f"{'='*60}")
    print(f"実行時間: {total_time:.2f}秒")
    print(f"成功: {success_count}/{total_count}")
    print(f"成功率: {(success_count/total_count)*100:.1f}%")
    
    if success_count == total_count:
        print("\n🎉 全てのテストが成功しました！")
        return 0
    else:
        print(f"\n❌ {total_count - success_count}個のテストが失敗しました")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 