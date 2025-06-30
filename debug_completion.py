#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SQL Completion Debug Script
SQL補完機能のデバッグ用テストスクリプト
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from unittest.mock import Mock
from app.services.completion_service import CompletionService
import sqlparse

def create_mock_metadata_service():
    """テスト用のメタデータサービスを作成"""
    mock_service = Mock()
    
    # テスト用メタデータ
    mock_service.get_all_metadata.return_value = [
        {
            "name": "PUBLIC",
            "tables": [
                {
                    "name": "SALES_DATA",
                    "table_type": "TABLE",
                    "columns": [
                        {"name": "customer_id", "data_type": "VARCHAR"},
                        {"name": "product_id", "data_type": "VARCHAR"},
                        {"name": "amount", "data_type": "DECIMAL"},
                        {"name": "sale_date", "data_type": "DATE"}
                    ]
                },
                {
                    "name": "CUSTOMER_MASTER",
                    "table_type": "TABLE",
                    "columns": [
                        {"name": "id", "data_type": "VARCHAR"},
                        {"name": "name", "data_type": "VARCHAR"},
                        {"name": "email", "data_type": "VARCHAR"},
                        {"name": "created_at", "data_type": "TIMESTAMP"}
                    ]
                },
                {
                    "name": "PRODUCT_MASTER",
                    "table_type": "TABLE",
                    "columns": [
                        {"name": "id", "data_type": "VARCHAR"},
                        {"name": "name", "data_type": "VARCHAR"},
                        {"name": "price", "data_type": "DECIMAL"},
                        {"name": "category", "data_type": "VARCHAR"}
                    ]
                }
            ]
        }
    ]
    
    return mock_service

def test_sql_parsing():
    """SQL解析のテスト"""
    print("=== SQL解析テスト ===")
    
    test_sqls = [
        "SELECT FROM SALES_DATA AS s",
        "SELECT FROM SALES_DATA s JOIN CUSTOMER_MASTER c ON s.customer_id = c.id",
        "SELECT FROM PUBLIC.SALES_DATA AS s",
        "SELECT FROM table1, table2",
        "SELECT FROM (SELECT * FROM subtable) AS sub",
    ]
    
    for sql in test_sqls:
        print(f"\nSQL: {sql}")
        parsed = sqlparse.parse(sql)
        if parsed:
            statement = parsed[0]
            print(f"Parsed successfully: {statement}")
        else:
            print("Failed to parse")

def test_table_extraction():
    """テーブル抽出のテスト"""
    print("\n=== テーブル抽出テスト ===")
    
    completion_service = CompletionService(create_mock_metadata_service())
    
    test_cases = [
        ("SELECT FROM SALES_DATA AS s", ["SALES_DATA"]),
        ("SELECT FROM SALES_DATA s JOIN CUSTOMER_MASTER c ON s.customer_id = c.id", ["SALES_DATA", "CUSTOMER_MASTER"]),
        ("SELECT FROM PUBLIC.SALES_DATA AS s", ["PUBLIC.SALES_DATA"]),
        ("SELECT FROM table1, table2", ["table1", "table2"]),
    ]
    
    for sql, expected_tables in test_cases:
        print(f"\nSQL: {sql}")
        tables = completion_service._extract_table_names_from_sql(sql)
        print(f"Extracted tables: {tables}")
        
        for table in expected_tables:
            if table in tables:
                print(f"✅ Found table '{table}'")
            else:
                print(f"❌ Expected table '{table}' not found")

def test_select_clause_detection():
    """SELECT句判定のテスト（削除されたメソッドのため、このテストは削除）"""
    print("\n=== SELECT句判定テスト（削除済み） ===")
    print("SELECT句判定は削除され、常にテーブル抽出ベースで動作します")

def test_column_suggestions():
    """カラム補完のテスト"""
    print("\n=== カラム補完テスト ===")
    
    completion_service = CompletionService(create_mock_metadata_service())
    
    test_cases = [
        ("SELECT FROM SALES_DATA AS s", 7, ["customer_id", "product_id", "amount", "sale_date"]),
        ("SELECT FROM SALES_DATA s JOIN CUSTOMER_MASTER c ON s.customer_id = c.id", 7, 
         ["customer_id", "product_id", "amount", "sale_date", "id", "name", "email", "created_at"]),
        ("SELECT FROM SALES_DATA WHERE", 25, ["customer_id", "product_id", "amount", "sale_date"]),
    ]
    
    for sql, position, expected_columns in test_cases:
        print(f"\nSQL: {sql}")
        print(f"Position: {position}")
        
        result = completion_service.get_completions(sql, position)
        column_suggestions = [s.label for s in result.suggestions if s.kind == "column"]
        
        print(f"Expected columns: {expected_columns}")
        print(f"Actual columns: {column_suggestions}")
        
        # 期待されるカラムが含まれているかチェック
        missing_columns = [col for col in expected_columns if col not in column_suggestions]
        unexpected_columns = [col for col in column_suggestions if col not in expected_columns]
        
        if not missing_columns and not unexpected_columns:
            print("✅ PASS - All expected columns found")
        else:
            if missing_columns:
                print(f"❌ Missing columns: {missing_columns}")
            if unexpected_columns:
                print(f"❌ Unexpected columns: {unexpected_columns}")

def main():
    print("SQL補完機能デバッグテスト")
    print("=" * 50)
    
    # SQL解析テスト
    test_sql_parsing()
    
    # テーブル抽出テスト
    test_table_extraction()
    
    # カラム補完テスト
    test_column_suggestions()
    
    print("\n" + "=" * 50)
    print("テスト完了")

if __name__ == "__main__":
    main() 