#!/usr/bin/env python3
"""
テストファイルの依存関係インポートを修正するスクリプト
"""
import os
import re

# 修正マッピング
REPLACEMENTS = {
    # インポート文の修正
    r'from app\.dependencies import.*get_sql_service(?!_di)': 'from app.dependencies import get_sql_service_di',
    r'from app\.dependencies import.*get_metadata_service(?!_di)': 'from app.dependencies import get_metadata_service_di',
    r'from app\.dependencies import.*get_performance_service(?!_di)': 'from app.dependencies import get_performance_service_di',
    r'from app\.dependencies import.*get_export_service(?!_di)': 'from app.dependencies import get_export_service_di',
    r'from app\.dependencies import.*get_sql_validator(?!_di)': 'from app.dependencies import get_sql_validator_di',
    r'from app\.dependencies import.*get_connection_manager(?!_di)': 'from app.dependencies import get_connection_manager_di',
    r'from app\.dependencies import.*get_completion_service(?!_di)': 'from app.dependencies import get_completion_service_di',
    r'from app\.dependencies import.*get_sql_log_service(?!_di)': 'from app.dependencies import get_sql_log_service_di',
    r'from app\.dependencies import.*get_user_service(?!_di)': 'from app.dependencies import get_user_service_di',
    r'from app\.dependencies import.*get_template_service(?!_di)': 'from app.dependencies import get_template_service_di',
    r'from app\.dependencies import.*get_part_service(?!_di)': 'from app.dependencies import get_part_service_di',
    r'from app\.dependencies import.*get_admin_service(?!_di)': 'from app.dependencies import get_admin_service_di',
    r'from app\.dependencies import.*get_visibility_control_service(?!_di)': 'from app.dependencies import get_visibility_control_service_di',
    r'from app\.dependencies import.*get_user_preference_service(?!_di)': 'from app.dependencies import get_user_preference_service_di',
    r'from app\.dependencies import.*get_hybrid_sql_service(?!_di)': 'from app.dependencies import get_hybrid_sql_service_di',
    r'from app\.dependencies import.*get_session_service(?!_di)': 'from app.dependencies import get_session_service_di',
    r'from app\.dependencies import.*get_streaming_state_service(?!_di)': 'from app.dependencies import get_streaming_state_service_di',
    
    # 使用箇所の修正
    r'get_sql_service(?!_di)': 'get_sql_service_di',
    r'get_metadata_service(?!_di)': 'get_metadata_service_di',
    r'get_performance_service(?!_di)': 'get_performance_service_di',
    r'get_export_service(?!_di)': 'get_export_service_di',
    r'get_sql_validator(?!_di)': 'get_sql_validator_di',
    r'get_connection_manager(?!_di)': 'get_connection_manager_di',
    r'get_completion_service(?!_di)': 'get_completion_service_di',
    r'get_sql_log_service(?!_di)': 'get_sql_log_service_di',
    r'get_user_service(?!_di)': 'get_user_service_di',
    r'get_template_service(?!_di)': 'get_template_service_di',
    r'get_part_service(?!_di)': 'get_part_service_di',
    r'get_admin_service(?!_di)': 'get_admin_service_di',
    r'get_visibility_control_service(?!_di)': 'get_visibility_control_service_di',
    r'get_user_preference_service(?!_di)': 'get_user_preference_service_di',
    r'get_hybrid_sql_service(?!_di)': 'get_hybrid_sql_service_di',
    r'get_session_service(?!_di)': 'get_session_service_di',
    r'get_streaming_state_service(?!_di)': 'get_streaming_state_service_di',
}

def fix_file(filepath):
    """ファイルの依存関係を修正"""
    print(f"修正中: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 各置換パターンを適用
    for pattern, replacement in REPLACEMENTS.items():
        content = re.sub(pattern, replacement, content)
    
    # 変更があった場合のみファイルを更新
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ 修正完了: {filepath}")
        return True
    else:
        print(f"  - 変更なし: {filepath}")
        return False

def main():
    """メイン処理"""
    test_dir = os.path.dirname(__file__)
    
    # テストファイルを検索
    test_files = []
    for file in os.listdir(test_dir):
        if file.startswith('test_') and file.endswith('.py'):
            test_files.append(os.path.join(test_dir, file))
    
    print(f"修正対象ファイル数: {len(test_files)}")
    
    fixed_count = 0
    for filepath in test_files:
        if fix_file(filepath):
            fixed_count += 1
    
    print(f"\n修正完了: {fixed_count}/{len(test_files)} ファイル")

if __name__ == "__main__":
    main()
