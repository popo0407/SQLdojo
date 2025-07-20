import pytest
import logging
from app.sql_validator import SQLValidator, ValidationResult


class TestWhereClauseValidation:
    """WHERE句のバリデーションテスト"""
    
    def setup_method(self):
        """テスト前のセットアップ"""
        # ログレベルをDEBUGに設定
        logging.getLogger('sql_validator').setLevel(logging.DEBUG)
        self.validator = SQLValidator()
    
    def test_where_clause_20_chars_or_less_error(self):
        """WHERE句の内容が20文字以下の場合にエラーになることをテスト"""
        # 20文字以下のWHERE句（より短いケース）
        sql = "SELECT * FROM users WHERE x = 1"
        result = self.validator.validate_sql(sql)
        
        assert not result.is_valid
        assert any("WHERE句の内容が短すぎます" in error for error in result.errors)
    
    def test_where_clause_more_than_20_chars_valid(self):
        """WHERE句の内容が20文字を超える場合は有効であることをテスト"""
        # 20文字を超えるWHERE句
        sql = "SELECT * FROM users WHERE user_id = 12345 AND status = 'active' AND created_date >= '2024-01-01'"
        result = self.validator.validate_sql(sql)
        
        assert result.is_valid
        assert not any("WHERE句の内容が短すぎます" in error for error in result.errors)
    
    def test_where_clause_with_complex_condition_valid(self):
        """複雑なWHERE句が有効であることをテスト"""
        sql = "SELECT * FROM products WHERE category = 'electronics_and_computers' AND price > 100 AND stock_quantity > 0"
        result = self.validator.validate_sql(sql)
        
        assert result.is_valid
        assert not any("WHERE句の内容が短すぎます" in error for error in result.errors)
    
    def test_where_clause_with_parentheses_valid(self):
        """括弧を含むWHERE句が有効であることをテスト"""
        sql = "SELECT * FROM products WHERE (category = 'electronics' AND price > 100) OR (category = 'books' AND price < 50)"
        result = self.validator.validate_sql(sql)
        
        assert result.is_valid
        assert not any("WHERE句の内容が短すぎます" in error for error in result.errors)
    
    def test_where_clause_with_quotes_valid(self):
        """クォートを含むWHERE句が有効であることをテスト"""
        sql = "SELECT * FROM users WHERE name = 'John Doe Smith Johnson' AND email = 'john.doe@example.com'"
        result = self.validator.validate_sql(sql)
        
        assert result.is_valid
        assert not any("WHERE句の内容が短すぎます" in error for error in result.errors)
    
    def test_no_where_clause_regular_table_error(self):
        """WHERE句がない場合にエラーになることをテスト"""
        sql = "SELECT * FROM users"
        result = self.validator.validate_sql(sql)
        
        assert not result.is_valid
        assert any("WHERE句が必要です" in error for error in result.errors)
    
    def test_multiple_where_clauses_one_valid(self):
        """複数のWHERE句があり、1つでも20文字を超えていれば有効であることをテスト"""
        # 1つ目は短いが、2つ目は長いWHERE句
        sql = "SELECT * FROM users WHERE x = 1 AND name = 'John Doe Smith Johnson'"
        result = self.validator.validate_sql(sql)
        
        assert result.is_valid
        assert not any("WHERE句の内容が短すぎます" in error for error in result.errors)
    
    def test_multiple_where_clauses_all_short(self):
        """複数のWHERE句が全て20文字以下の場合にエラーになることをテスト"""
        # 全て短いWHERE句
        sql = "SELECT * FROM users WHERE x = 1 AND y = 2 AND z = 3"
        result = self.validator.validate_sql(sql)
        
        assert not result.is_valid
        assert any("WHERE句の内容が短すぎます" in error for error in result.errors)
    
    def test_where_clause_with_subquery(self):
        """サブクエリを含むWHERE句が有効であることをテスト"""
        sql = "SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE order_date >= '2024-01-01')"
        result = self.validator.validate_sql(sql)
        
        assert result.is_valid
        assert not any("WHERE句の内容が短すぎます" in error for error in result.errors) 