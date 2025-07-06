# -*- coding: utf-8 -*-
"""
SQLバリデーションエラーメッセージのテスト
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.sql_validator import get_validator

def test_sql_validation_errors():
    """SQLバリデーションエラーメッセージをテスト"""
    validator = get_validator()
    
    # テストケース
    test_cases = [
        ("SELECT", "SELECT句のみ"),
        ("FROM table", "FROM句のみ"),
        ("SELECT *", "FROM句なし"),
        ("SELECT * FROM table", "WHERE句なし"),
    ]
    
    print("=== SQLバリデーションエラーメッセージテスト ===")
    
    for sql, description in test_cases:
        print(f"\n--- {description}: '{sql}' ---")
        result = validator.validate_sql(sql)
        
        if result.is_valid:
            print("✅ バリデーション成功")
        else:
            print("❌ バリデーション失敗")
            for error in result.errors:
                print(f"  エラー: {error}")

if __name__ == "__main__":
    test_sql_validation_errors() 