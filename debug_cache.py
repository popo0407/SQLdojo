#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
メタデータキャッシュ保存エラーのデバッグスクリプト
"""
import asyncio
import sys
import os
import traceback
import sqlite3

# プロジェクトルートをパスに追加
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.metadata_service import MetadataService
from app.services.query_executor import QueryExecutor
from app.services.connection_manager_odbc import ConnectionManagerODBC
from app.metadata_cache import MetadataCache
from app.config_simplified import get_settings
from app.logger import get_logger

async def debug_cache_error():
    """キャッシュ保存エラーをデバッグ"""
    print("=== メタデータキャッシュ保存エラーデバッグ ===")
    
    # ログ設定
    logger = get_logger("debug_cache")
    
    try:
        # 設定を取得
        print("1. 設定を取得...")
        settings = get_settings()
        print(f"設定取得完了")
        
        # 接続テスト
        print("\n2. 接続テスト...")
        try:
            connection_manager = ConnectionManagerODBC()
            is_connected = connection_manager.test_connection()
            print(f"接続テスト結果: {is_connected}")
            
            if not is_connected:
                print("❌ データベースに接続できません")
                return
            else:
                print("✅ データベース接続成功")
        except Exception as e:
            print(f"❌ 接続テストでエラー: {e}")
            traceback.print_exc()
            return
        
        # 依存関係を初期化
        print("\n3. サービスを初期化...")
        query_executor = QueryExecutor(connection_manager)
        metadata_cache = MetadataCache()
        metadata_service = MetadataService(query_executor, metadata_cache)
        print("✅ サービス初期化完了")
        
        print("\n4. Snowflakeからメタデータを取得...")
        try:
            all_metadata = metadata_service._fetch_all_from_snowflake_direct()
            
            if not all_metadata:
                print("❌ メタデータの取得に失敗しました")
                return
            
            print(f"✅ 取得したメタデータ: {len(all_metadata)} スキーマ")
            
            # 最初のスキーマの詳細を表示
            if all_metadata:
                first_schema = all_metadata[0]
                print(f"最初のスキーマ: {first_schema.get('name')}")
                print(f"テーブル数: {len(first_schema.get('tables', []))}")
                
                if first_schema.get('tables'):
                    first_table = first_schema['tables'][0]
                    print(f"最初のテーブル: {first_table.get('name')}")
                    print(f"カラム数: {len(first_table.get('columns', []))}")
                    
                    if first_table.get('columns'):
                        first_column = first_table['columns'][0]
                        print(f"最初のカラム: {first_column.get('name')}")
        except Exception as e:
            print(f"❌ メタデータ取得でエラー: {e}")
            traceback.print_exc()
            return
        
        print("\n5. キャッシュに保存を試行...")
        try:
            # 保存前のデータ構造を確認
            print("保存前のデータ構造確認:")
            for i, schema_data in enumerate(all_metadata[:2]):  # 最初の2スキーマのみ
                print(f"\nスキーマ {i+1}: {schema_data.get('name')}")
                print(f"  キー: {list(schema_data.keys())}")
                
                for j, table_data in enumerate(schema_data.get('tables', [])[:1]):  # 最初の1テーブルのみ
                    print(f"  テーブル {j+1}: {table_data.get('name')}")
                    print(f"    キー: {list(table_data.keys())}")
                    
                    for k, column_data in enumerate(table_data.get('columns', [])[:1]):  # 最初の1カラムのみ
                        print(f"    カラム {k+1}: {column_data.get('name')}")
                        print(f"      キー: {list(column_data.keys())}")
                        print(f"      データ: {column_data}")
            
            metadata_cache.save_all_metadata_normalized(all_metadata)
            print("✅ キャッシュ保存成功")
            
            # 保存されたデータを確認
            print("\n6. 保存されたデータを確認...")
            cached_data = metadata_cache.get_all_metadata_normalized()
            if cached_data:
                print(f"✅ キャッシュから取得: {len(cached_data)} スキーマ")
                schema_count = len(cached_data)
                table_count = sum(len(schema.get("tables", [])) for schema in cached_data)
                column_count = sum(len(table.get("columns", [])) for schema in cached_data for table in schema.get("tables", []))
                print(f"  スキーマ数: {schema_count}")
                print(f"  テーブル数: {table_count}")
                print(f"  カラム数: {column_count}")
            else:
                print("❌ キャッシュからデータを取得できません")
                
        except Exception as e:
            print(f"❌ キャッシュ保存エラー: {e}")
            print("詳細なエラー情報:")
            traceback.print_exc()
            
            # SQLiteの詳細エラーを確認
            print("\n7. SQLiteデータベースの状態確認...")
            try:
                db_path = "metadata_cache.db"
                if os.path.exists(db_path):
                    print(f"データベースファイル存在: {db_path}")
                    print(f"ファイルサイズ: {os.path.getsize(db_path)} bytes")
                    
                    # SQLiteに直接接続してテーブル構造を確認
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    
                    # テーブル一覧を取得
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                    tables = cursor.fetchall()
                    print(f"テーブル一覧: {[table[0] for table in tables]}")
                    
                    # 各テーブルのレコード数を確認
                    for table in tables:
                        table_name = table[0]
                        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                        count = cursor.fetchone()[0]
                        print(f"  {table_name}: {count} レコード")
                    
                    conn.close()
                else:
                    print("データベースファイルが存在しません")
            except Exception as db_error:
                print(f"データベース確認エラー: {db_error}")
        
        print("\n=== デバッグ完了 ===")
        
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_cache_error()) 