# -*- coding: utf-8 -*-
"""
ユーザー表示設定機能のテストスクリプト
"""
import sys
from pathlib import Path

# プロジェクトルートをPythonパスに追加
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.services.user_preference_service import UserPreferenceService
from app.metadata_cache import MetadataCache
from app.logger import get_logger

def test_user_preference_service():
    """UserPreferenceServiceの基本動作テスト"""
    logger = get_logger(__name__)
    
    try:
        logger.info("ユーザー表示設定サービステストを開始します")
        
        # サービス初期化
        metadata_cache = MetadataCache()
        preference_service = UserPreferenceService(metadata_cache)
        
        # テスト用ユーザー（実際のユーザーIDを使用）
        test_user_id = "hint0531"
        
        # Step 1: テンプレート表示設定取得
        logger.info("Step 1: テンプレート表示設定取得テスト")
        templates = preference_service.get_user_template_preferences(test_user_id)
        logger.info(f"取得したテンプレート数: {len(templates)}")
        
        for template in templates[:3]:  # 最初の3件だけログ出力
            logger.info(f"テンプレート: {template['name']} ({template['type']}) - 表示順: {template['display_order']}, 表示: {template['is_visible']}")
        
        # Step 2: パーツ表示設定取得
        logger.info("Step 2: パーツ表示設定取得テスト")
        parts = preference_service.get_user_part_preferences(test_user_id)
        logger.info(f"取得したパーツ数: {len(parts)}")
        
        for part in parts[:3]:  # 最初の3件だけログ出力
            logger.info(f"パーツ: {part['name']} ({part['type']}) - 表示順: {part['display_order']}, 表示: {part['is_visible']}")
        
        # Step 3: ドロップダウン用データ取得
        logger.info("Step 3: ドロップダウン用データ取得テスト")
        visible_templates = preference_service.get_visible_templates_for_dropdown(test_user_id)
        visible_parts = preference_service.get_visible_parts_for_dropdown(test_user_id)
        
        logger.info(f"表示可能テンプレート数: {len(visible_templates)}")
        logger.info(f"表示可能パーツ数: {len(visible_parts)}")
        
        logger.info("✅ ユーザー表示設定サービステストが正常に完了しました")
        print("✅ テスト完了: ユーザー表示設定サービスが正常に動作しています")
        
    except Exception as e:
        logger.error("ユーザー表示設定サービステストエラー", exception=e)
        print(f"❌ テスト失敗: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_user_preference_service()
