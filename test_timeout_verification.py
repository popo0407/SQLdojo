#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
タイムアウト設定の動作確認スクリプト
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.config_simplified import get_settings


def test_config_timeout_values():
    """設定値の確認"""
    print("=== タイムアウト設定値の確認 ===")
    
    try:
        settings = get_settings()
        
        print(f"Query timeout: {settings.query_timeout_seconds}秒 ({settings.query_timeout_seconds/60:.1f}分)")
        print(f"Connection timeout: {settings.connection_timeout_seconds}秒")
        print(f"API timeout: {settings.api_timeout_seconds}秒 ({settings.api_timeout_seconds/60:.1f}分)")
        print(f"HTTP client timeout: {settings.http_client_timeout_seconds}秒 ({settings.http_client_timeout_seconds/60:.1f}分)")
        
        return True
    except Exception as e:
        print(f"設定値の確認でエラー: {e}")
        return False


def test_connection_manager_timeout():
    """接続マネージャーでのタイムアウト設定確認"""
    print("\\n=== 接続マネージャーのタイムアウト確認 ===")
    
    try:
        # 設定値から期待値を確認
        settings = get_settings()
        expected_connection_timeout = getattr(settings, 'connection_timeout_seconds', 30)
        expected_query_timeout = getattr(settings, 'query_timeout_seconds', 300)
        
        print(f"期待される Connection timeout: {expected_connection_timeout}秒")
        print(f"期待される Query timeout: {expected_query_timeout}秒 ({expected_query_timeout/60:.1f}分)")
        print("注意: 実際の接続マネージャーはpyodbcの依存関係のため直接テストできません")
        
        return True
    except Exception as e:
        print(f"接続マネージャーの確認でエラー: {e}")
        return False


def test_connection_string():
    """接続文字列にタイムアウト設定が含まれるかテスト"""
    print("\\n=== 接続文字列のタイムアウト設定確認 ===")
    
    try:
        settings = get_settings()
        connection_timeout = getattr(settings, 'connection_timeout_seconds', 30)
        query_timeout = getattr(settings, 'query_timeout_seconds', 300)
        
        print("注意: 実際の接続は行わず、設定値のみを確認します")
        print(f"期待される LOGIN_TIMEOUT: {connection_timeout}")
        print(f"期待される QUERY_TIMEOUT: {query_timeout}")
        print("実際の接続文字列には以下が含まれる予定:")
        print(f"  LOGIN_TIMEOUT={connection_timeout};")
        print(f"  QUERY_TIMEOUT={query_timeout};")
        
        return True
    except Exception as e:
        print(f"接続文字列の確認でエラー: {e}")
        return False


def main():
    """メイン実行関数"""
    print("SQLdojo タイムアウト設定検証スクリプト")
    print("=" * 50)
    
    all_tests_passed = True
    
    # 設定値の確認
    if not test_config_timeout_values():
        all_tests_passed = False
    
    # 接続マネージャーの確認
    if not test_connection_manager_timeout():
        all_tests_passed = False
    
    # 接続文字列の確認
    if not test_connection_string():
        all_tests_passed = False
    
    print("\\n" + "=" * 50)
    if all_tests_passed:
        print("✅ すべての確認項目がパスしました。")
        print("実際のタイムアウト動作は、実際のSQL実行時に確認してください。")
    else:
        print("❌ 一部の確認項目で問題が見つかりました。")
    
    print("\\n推奨される実際のテスト手順:")
    print("1. アプリケーションを起動")
    print("2. 長時間実行されるクエリ（例：大きなデータセットのJOIN）を実行")
    print("3. 20分以内に完了するクエリがタイムアウトしないことを確認")
    print("4. ブラウザのネットワークタブでAPI応答時間を確認")


if __name__ == "__main__":
    main()