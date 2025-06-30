#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
コメント情報を含むSQL補完機能のテストスクリプト
"""
import asyncio
import sys
import os

# プロジェクトルートをパスに追加
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.metadata_service import MetadataService
from app.services.completion_service import CompletionService
from app.services.query_executor import QueryExecutor
from app.metadata_cache import MetadataCache
from app.config_simplified import get_settings
from app.logger import get_logger

async def test_completion_with_comments():
    """コメント情報を含む補完機能をテスト"""
    print("=== コメント情報を含むSQL補完機能テスト ===")
    
    # ログ設定
    logger = get_logger("test_completion")
    
    try:
        # 設定を取得
        settings = get_settings()
        
        # 依存関係を初期化
        query_executor = QueryExecutor(settings)
        metadata_cache = MetadataCache()
        metadata_service = MetadataService(query_executor, metadata_cache)
        completion_service = CompletionService(metadata_service)
        
        print("1. メタデータキャッシュをクリア...")
        metadata_service.clear_cache()
        
        print("2. メタデータを再取得（コメント情報を含む）...")
        metadata_service.refresh_full_metadata_cache()
        
        print("3. 補完機能をテスト...")
        
        # テストケース1: テーブル補完
        print("\n--- テーブル補完テスト ---")
        sql1 = "SELECT * FROM "
        position1 = len(sql1)
        result1 = completion_service.get_completions(sql1, position1)
        
        print(f"テーブル補完候補数: {len(result1.suggestions)}")
        for i, suggestion in enumerate(result1.suggestions[:5]):  # 最初の5件を表示
            print(f"  {i+1}. {suggestion.label} ({suggestion.kind})")
            if suggestion.documentation:
                print(f"     ドキュメント: {suggestion.documentation[:100]}...")
        
        # テストケース2: カラム補完（テーブル指定あり）
        print("\n--- カラム補完テスト（テーブル指定あり）---")
        sql2 = "SELECT FROM SALES_DATA WHERE "
        position2 = len(sql2)
        result2 = completion_service.get_completions(sql2, position2)
        
        print(f"カラム補完候補数: {len(result2.suggestions)}")
        for i, suggestion in enumerate(result2.suggestions[:5]):  # 最初の5件を表示
            print(f"  {i+1}. {suggestion.label} ({suggestion.kind})")
            if suggestion.documentation:
                print(f"     ドキュメント: {suggestion.documentation[:100]}...")
        
        # テストケース3: 全カラム補完
        print("\n--- 全カラム補完テスト ---")
        sql3 = "SELECT "
        position3 = len(sql3)
        result3 = completion_service.get_completions(sql3, position3)
        
        print(f"全カラム補完候補数: {len(result3.suggestions)}")
        for i, suggestion in enumerate(result3.suggestions[:5]):  # 最初の5件を表示
            print(f"  {i+1}. {suggestion.label} ({suggestion.kind})")
            if suggestion.documentation:
                print(f"     ドキュメント: {suggestion.documentation[:100]}...")
        
        print("\n=== テスト完了 ===")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_completion_with_comments()) 