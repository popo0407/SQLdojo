# -*- coding: utf-8 -*-
"""
SQLバリデーションモジュール
SQLの構文チェック、セキュリティチェック、ビジネスルールチェックを行う
"""
import sqlparse
import re
from sqlparse.sql import Statement, Token, TokenList
from sqlparse.tokens import Keyword, DML, Punctuation
from typing import List, Dict, Tuple, Optional, Set
from dataclasses import dataclass

from app.logger import get_logger
from app.exceptions import SQLValidationError
from app.utils import retry_on_exception


@dataclass
class ValidationResult:
    """バリデーション結果"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    suggestions: List[str] = None
    formatted_sql: Optional[str] = None
    tables: List[str] = None
    columns: List[str] = None
    
    def __post_init__(self):
        if self.suggestions is None:
            self.suggestions = []
        if self.tables is None:
            self.tables = []
        if self.columns is None:
            self.columns = []


class SQLValidator:
    """SQLバリデーションクラス"""
    
    def __init__(self):
        self.logger = get_logger("sql_validator")
        self._setup_keywords()
    
    def _setup_keywords(self) -> None:
        """キーワードを設定"""
        self.allowed_keywords: Set[str] = {
            'SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING',
            'LIMIT', 'OFFSET', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
            'OUTER JOIN', 'ON', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN',
            'LIKE', 'ILIKE', 'IS NULL', 'IS NOT NULL', 'DISTINCT', 'AS',
            'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'COUNT', 'SUM', 'AVG',
            'MAX', 'MIN', 'COALESCE', 'NULLIF', 'CAST', 'DATE', 'TIMESTAMP',
            'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND', 'CURRENT_DATE',
            'CURRENT_TIMESTAMP', 'NOW', 'DATEADD', 'DATEDIFF', 'SUBSTRING',
            'UPPER', 'LOWER', 'TRIM', 'LENGTH', 'ROUND', 'FLOOR', 'CEILING'
        }
        
        self.forbidden_keywords: Set[str] = {
            'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE',
            'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK', 'MERGE', 'COPY', 'EXEC',
            'EXECUTE', 'xp_', 'sp_', 'BACKUP', 'RESTORE', 'BULK INSERT'
        }
        
        self.dangerous_patterns: List[str] = [
            ';--', ';/*', ';*/', 'UNION ALL', 'UNION SELECT',
            'EXEC', 'EXECUTE', 'xp_', 'sp_', 'WAITFOR', 'DELAY'
        ]
    
    @retry_on_exception(max_retries=2, delay=0.1)
    def validate_sql(self, sql: str) -> ValidationResult:
        """
        SQLをバリデーション
        戻り値: ValidationResult
        """
        errors: List[str] = []
        warnings: List[str] = []
        suggestions: List[str] = []
        
        try:
            # 基本的な構文チェック
            if not self._check_basic_syntax(sql, errors):
                return ValidationResult(False, errors, warnings, suggestions)
            
            # SELECT文のみ許可
            if not self._check_select_only(sql, errors):
                return ValidationResult(False, errors, warnings, suggestions)
            
            # 禁止キーワードチェック
            if not self._check_forbidden_keywords(sql, errors):
                return ValidationResult(False, errors, warnings, suggestions)
            
            # セキュリティチェック
            if not self._check_security(sql, errors):
                return ValidationResult(False, errors, warnings, suggestions)
            
            # WHERE句必須チェック
            sql_upper = sql.upper()
            if 'SELECT' in sql_upper and 'WHERE' not in sql_upper:
                system_tables = ['INFORMATION_SCHEMA', 'SNOWFLAKE_SAMPLE_DATA', 'SYS']
                if not any(table in sql_upper for table in system_tables):
                    suggestions.append("WHERE句を追加するとパフォーマンスが向上します")
            if not self._check_where_clause_required(sql, errors):
                return ValidationResult(False, errors, warnings, suggestions)
            
            # 構文の詳細チェック
            if not self._check_detailed_syntax(sql, errors):
                return ValidationResult(False, errors, warnings, suggestions)
            
            # パフォーマンス警告
            self._check_performance_warnings(sql, warnings)
            if 'SELECT *' in sql_upper:
                suggestions.append("SELECT * の代わりに必要なカラムのみを指定してください")
            if 'LIMIT' not in sql_upper and 'TOP' not in sql_upper:
                suggestions.append("LIMIT句の追加を検討してください")
            join_count = sql_upper.count('JOIN')
            if join_count > 3:
                suggestions.append(f"JOINが多いSQLです（{join_count}個）。パフォーマンスに注意してください")
            
            # 整形されたSQLを取得
            formatted_sql = self.format_sql(sql) if not errors else None
            
            # テーブルとカラムを抽出
            tables = self.extract_tables(sql)
            columns = self.extract_columns(sql)
            
            is_valid = len(errors) == 0
            result = ValidationResult(
                is_valid=is_valid,
                errors=errors,
                warnings=warnings,
                suggestions=suggestions,
                formatted_sql=formatted_sql,
                tables=tables,
                columns=columns
            )
            
            # ログ出力
            self.logger.log_sql_validation(
                sql, is_valid, 
                '; '.join(errors) if errors else None
            )
            
            return result
            
        except Exception as e:
            error_msg = f"SQLバリデーション中にエラーが発生しました: {str(e)}"
            self.logger.error(error_msg, exception=e)
            return ValidationResult(False, [error_msg], warnings, suggestions)
    
    def _check_basic_syntax(self, sql: str, errors: List[str]) -> bool:
        """基本的な構文チェック"""
        if not sql or not sql.strip():
            errors.append("SQLが空です")
            return False
        
        # SQLParseで構文解析
        try:
            parsed = sqlparse.parse(sql)
            if not parsed:
                errors.append("SQLの構文解析に失敗しました")
                return False
        except Exception as e:
            errors.append(f"SQLの構文解析エラー: {str(e)}")
            return False
        
        return True
    
    def _check_select_only(self, sql: str, errors: List[str]) -> bool:
        """SELECT文のみ許可"""
        try:
            parsed = sqlparse.parse(sql)
            for statement in parsed:
                if statement.get_type() != 'SELECT':
                    errors.append("SELECT文のみ許可されています")
                    return False
            return True
        except Exception as e:
            errors.append(f"SELECT文チェックエラー: {str(e)}")
            return False
    
    def _check_forbidden_keywords(self, sql: str, errors: List[str]) -> bool:
        """禁止キーワードチェック"""
        try:
            # 単語境界を考慮したキーワードチェック
            for keyword in self.forbidden_keywords:
                pattern = r'\b' + re.escape(keyword) + r'\b'
                if re.search(pattern, sql, re.IGNORECASE):
                    errors.append(f"禁止されたキーワード '{keyword}' が使用されています")
                    return False
            return True
        except Exception as e:
            errors.append(f"禁止キーワードチェックエラー: {str(e)}")
            return False
    
    def _check_security(self, sql: str, errors: List[str]) -> bool:
        """セキュリティチェック"""
        try:
            sql_upper = sql.upper()
            for pattern in self.dangerous_patterns:
                if pattern in sql_upper:
                    errors.append(f"危険なパターン '{pattern}' が検出されました")
                    return False
            return True
        except Exception as e:
            errors.append(f"セキュリティチェックエラー: {str(e)}")
            return False
    
    def _check_where_clause_required(self, sql: str, errors: List[str]) -> bool:
        """WHERE句必須チェック"""
        try:
            sql_upper = sql.upper()
            
            # SELECT文でWHERE句がない場合
            if 'SELECT' in sql_upper and 'WHERE' not in sql_upper:
                # システムテーブルやビューの場合は例外
                system_tables = ['INFORMATION_SCHEMA', 'SNOWFLAKE_SAMPLE_DATA', 'SYS']
                if not any(table in sql_upper for table in system_tables):
                    errors.append("WHERE句が必須です（システムテーブルを除く）")
                    return False
            return True
        except Exception as e:
            errors.append(f"WHERE句チェックエラー: {str(e)}")
            return False
    
    def _check_detailed_syntax(self, sql: str, errors: List[str]) -> bool:
        """詳細な構文チェック"""
        try:
            parsed = sqlparse.parse(sql)
            for statement in parsed:
                if not self._validate_statement(statement, errors):
                    return False
            return True
        except Exception as e:
            errors.append(f"詳細構文チェックエラー: {str(e)}")
            return False
    
    def _validate_statement(self, statement: Statement, errors: List[str]) -> bool:
        """個別ステートメントのバリデーション"""
        try:
            tokens = statement.tokens
            
            # SELECT文の基本構造チェック
            has_select = False
            has_from = False
            
            for token in tokens:
                if token.ttype is DML and str(token).upper() == 'SELECT':
                    has_select = True
                elif token.ttype is Keyword and str(token).upper() == 'FROM':
                    has_from = True
            
            if not has_select:
                errors.append("SELECT文が見つかりません")
                return False
            
            if not has_from:
                errors.append("FROM句が見つかりません")
                return False
            
            return True
        except Exception as e:
            errors.append(f"ステートメントバリデーションエラー: {str(e)}")
            return False
    
    def _check_performance_warnings(self, sql: str, warnings: List[str]) -> None:
        """パフォーマンス警告をチェック"""
        try:
            sql_upper = sql.upper()
            
            # SELECT * の警告
            if 'SELECT *' in sql_upper:
                warnings.append("SELECT * の使用は推奨されません。必要なカラムのみを指定してください")
            
            # 大量データ取得の警告
            if 'LIMIT' not in sql_upper and 'TOP' not in sql_upper:
                warnings.append("大量データ取得の可能性があります。LIMIT句の使用を検討してください")
            
            # 複雑なJOINの警告
            join_count = sql_upper.count('JOIN')
            if join_count > 3:
                warnings.append(f"複雑なJOIN（{join_count}個）が使用されています。パフォーマンスに注意してください")
            
        except Exception:
            # 警告チェックの失敗は無視
            pass
    
    @retry_on_exception(max_retries=2, delay=0.1)
    def format_sql(self, sql: str) -> str:
        """SQLを整形"""
        try:
            formatted = sqlparse.format(
                sql,
                reindent=True,
                keyword_case='upper',
                indent_width=4,
                use_space_around_operators=True,
                comma_first=True
            )
            return formatted
        except Exception as e:
            self.logger.error("SQL整形エラー", exception=e)
            return sql
    
    def extract_tables(self, sql: str) -> List[str]:
        """SQLからテーブル名を抽出"""
        tables = []
        try:
            parsed = sqlparse.parse(sql)
            for statement in parsed:
                for token in statement.tokens:
                    if hasattr(token, 'tokens'):
                        tables.extend(self._extract_tables_from_token(token))
            
            # 重複除去
            return list(set(tables))
        except Exception as e:
            self.logger.error("テーブル名抽出エラー", exception=e)
            return []
    
    def _extract_tables_from_token(self, token) -> List[str]:
        """トークンからテーブル名を抽出"""
        tables = []
        if hasattr(token, 'tokens'):
            for subtoken in token.tokens:
                if hasattr(subtoken, 'tokens'):
                    tables.extend(self._extract_tables_from_token(subtoken))
                elif hasattr(subtoken, 'value') and subtoken.ttype is Keyword:
                    # FROM句の後のテーブル名を抽出
                    if str(subtoken).upper() == 'FROM':
                        # 次のトークンがテーブル名の可能性
                        pass
        return tables
    
    def extract_columns(self, sql: str) -> List[str]:
        """SQLからカラム名を抽出"""
        columns = []
        try:
            # 簡単な正規表現ベースの抽出
            # SELECT句のカラムを抽出
            select_match = re.search(r'SELECT\s+(.*?)\s+FROM', sql, re.IGNORECASE | re.DOTALL)
            if select_match:
                select_clause = select_match.group(1)
                # カンマで分割してカラムを抽出
                for col in select_clause.split(','):
                    col = col.strip()
                    # AS句を除去
                    if ' AS ' in col.upper():
                        col = col.split(' AS ')[0].strip()
                    # 関数呼び出しを除去
                    if '(' in col and ')' in col:
                        continue
                    if col and col != '*':
                        columns.append(col)
            
            return list(set(columns))
        except Exception as e:
            self.logger.error("カラム名抽出エラー", exception=e)
            return []


# グローバルバリデーターインスタンス
_validator: Optional[SQLValidator] = None


def get_validator() -> SQLValidator:
    """バリデーターを取得"""
    global _validator
    if _validator is None:
        _validator = SQLValidator()
    return _validator


def validate_sql(sql: str) -> Tuple[bool, List[str]]:
    """SQLバリデーション関数（後方互換性）"""
    validator = get_validator()
    result = validator.validate_sql(sql)
    return result.is_valid, result.errors


def format_sql(sql: str) -> str:
    """SQL整形関数（後方互換性）"""
    validator = get_validator()
    return validator.format_sql(sql)


def validate_sql_detailed(sql: str) -> ValidationResult:
    """詳細なSQLバリデーション関数"""
    validator = get_validator()
    return validator.validate_sql(sql) 