# -*- coding: utf-8 -*-
"""
メタデータ更新機能テストスクリプト（本番環境と同じ条件）
"""
import sys
import os
import time
import requests
import json
from pathlib import Path

# プロジェクトルートをパスに追加
sys.path.insert(0, str(Path(__file__).parent))

from app.config_simplified import get_settings
from app.services.connection_manager import ConnectionManager
from app.services.query_executor import QueryExecutor
from app.services.metadata_service import MetadataService
from app.metadata_cache import MetadataCache
from app.logger import get_logger

def test_metadata_update_direct():
    """メタデータ更新機能を直接テスト（本番環境と同じ条件）"""
    logger = get_logger(__name__)
    
    try:
        logger.info("メタデータ更新直接テスト開始")
        
        # 設定を取得
        settings = get_settings()
        
        # サービスを直接インスタンス化（本番環境と同じ）
        connection_manager = ConnectionManager()
        query_executor = QueryExecutor(connection_manager)
        metadata_cache = MetadataCache()
        metadata_service = MetadataService(query_executor, metadata_cache)
        
        # メタデータ更新を実行
        logger.info("メタデータキャッシュの強制更新を実行")
        start_time = time.time()
        
        metadata_service.refresh_full_metadata_cache()
        
        elapsed_time = time.time() - start_time
        logger.info(f"メタデータ更新完了（実行時間: {elapsed_time:.3f}秒）")
        
        # 更新されたメタデータを取得
        all_metadata = metadata_service.get_all_metadata()
        
        if all_metadata:
            schema_count = len(all_metadata)
            table_count = sum(len(schema.get("tables", [])) for schema in all_metadata)
            column_count = sum(len(table.get("columns", [])) for schema in all_metadata for table in schema.get("tables", []))
            
            logger.info(f"✅ メタデータ更新成功！")
            logger.info(f"  スキーマ数: {schema_count}")
            logger.info(f"  テーブル数: {table_count}")
            logger.info(f"  カラム数: {column_count}")
            
            # 最初のスキーマの詳細を表示
            if all_metadata:
                first_schema = all_metadata[0]
                logger.info(f"  最初のスキーマ: {first_schema.get('name')} (テーブル数: {len(first_schema.get('tables', []))})")
            
            return True
        else:
            logger.error("❌ メタデータの取得に失敗しました")
            return False
            
    except Exception as e:
        logger.error(f"❌ メタデータ更新テストでエラーが発生: {e}")
        return False

def test_metadata_update_api():
    """メタデータ更新APIをテスト"""
    logger = get_logger(__name__)
    
    try:
        logger.info("メタデータ更新APIテスト開始")
        
        # APIエンドポイントをテスト
        api_url = "http://localhost:8000/api/v1/metadata/refresh"
        
        logger.info(f"APIエンドポイント: {api_url}")
        
        # POSTリクエストを送信
        start_time = time.time()
        response = requests.post(api_url, timeout=30)
        elapsed_time = time.time() - start_time
        
        logger.info(f"API応答時間: {elapsed_time:.3f}秒")
        logger.info(f"HTTPステータス: {response.status_code}")
        
        if response.status_code == 200:
            # レスポンスを解析
            metadata = response.json()
            
            if isinstance(metadata, list) and len(metadata) > 0:
                schema_count = len(metadata)
                table_count = sum(len(schema.get("tables", [])) for schema in metadata)
                column_count = sum(len(table.get("columns", [])) for schema in metadata for table in schema.get("tables", []))
                
                logger.info(f"✅ APIテスト成功！")
                logger.info(f"  スキーマ数: {schema_count}")
                logger.info(f"  テーブル数: {table_count}")
                logger.info(f"  カラム数: {column_count}")
                
                # 最初のスキーマの詳細を表示
                if metadata:
                    first_schema = metadata[0]
                    logger.info(f"  最初のスキーマ: {first_schema.get('name')} (テーブル数: {len(first_schema.get('tables', []))})")
                
                return True
            else:
                logger.error("❌ APIレスポンスが空または無効です")
                return False
        else:
            logger.error(f"❌ APIエラー: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        logger.error("❌ アプリケーションに接続できません。アプリケーションが起動しているか確認してください。")
        return False
    except Exception as e:
        logger.error(f"❌ APIテストでエラーが発生: {e}")
        return False

def test_metadata_initial_api():
    """メタデータ初期取得APIをテスト"""
    logger = get_logger(__name__)
    
    try:
        logger.info("メタデータ初期取得APIテスト開始")
        
        # APIエンドポイントをテスト
        api_url = "http://localhost:8000/api/v1/metadata/initial"
        
        logger.info(f"APIエンドポイント: {api_url}")
        
        # GETリクエストを送信
        start_time = time.time()
        response = requests.get(api_url, timeout=30)
        elapsed_time = time.time() - start_time
        
        logger.info(f"API応答時間: {elapsed_time:.3f}秒")
        logger.info(f"HTTPステータス: {response.status_code}")
        
        if response.status_code == 200:
            # レスポンスを解析
            metadata = response.json()
            
            if isinstance(metadata, list):
                schema_count = len(metadata)
                table_count = sum(len(schema.get("tables", [])) for schema in metadata)
                column_count = sum(len(table.get("columns", [])) for schema in metadata for table in schema.get("tables", []))
                
                logger.info(f"✅ 初期取得APIテスト成功！")
                logger.info(f"  スキーマ数: {schema_count}")
                logger.info(f"  テーブル数: {table_count}")
                logger.info(f"  カラム数: {column_count}")
                
                return True
            else:
                logger.error("❌ 初期取得APIレスポンスが無効です")
                return False
        else:
            logger.error(f"❌ 初期取得APIエラー: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        logger.error("❌ アプリケーションに接続できません。アプリケーションが起動しているか確認してください。")
        return False
    except Exception as e:
        logger.error(f"❌ 初期取得APIテストでエラーが発生: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("メタデータ更新機能テスト（本番環境と同じ条件）")
    print("=" * 60)
    
    # 1. 直接テスト（本番環境と同じ依存性注入コンテナ）
    print("\n1. 直接テスト（依存性注入コンテナ使用）")
    print("-" * 40)
    direct_success = test_metadata_update_direct()
    
    # 2. APIテスト（メタデータ更新）
    print("\n2. APIテスト（メタデータ更新）")
    print("-" * 40)
    api_success = test_metadata_update_api()
    
    # 3. APIテスト（メタデータ初期取得）
    print("\n3. APIテスト（メタデータ初期取得）")
    print("-" * 40)
    initial_success = test_metadata_initial_api()
    
    # 結果サマリー
    print("\n" + "=" * 60)
    print("テスト結果サマリー")
    print("=" * 60)
    print(f"直接テスト: {'✅ 成功' if direct_success else '❌ 失敗'}")
    print(f"更新APIテスト: {'✅ 成功' if api_success else '❌ 失敗'}")
    print(f"初期取得APIテスト: {'✅ 成功' if initial_success else '❌ 失敗'}")
    
    if direct_success and api_success and initial_success:
        print("\n🎉 全てのテストが成功しました！")
    else:
        print("\n❌ 一部のテストが失敗しました")
    
    print("\nテスト完了") 