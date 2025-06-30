# -*- coding: utf-8 -*-
"""
SQL補完サービス
Monaco Editor用のSQLオートコンプリート機能を提供
"""
from typing import List, Dict, Any, Optional
import re
from app.api.models import SQLCompletionItem, SQLCompletionResponse
from app.services.metadata_service import MetadataService
from app.logger import get_logger


class CompletionService:
    """SQL補完サービス"""
    
    def __init__(self, metadata_service: MetadataService):
        self.metadata_service = metadata_service
        self.logger = get_logger(__name__)
        
        # SQLキーワードの定義
        self.sql_keywords = [
            "SELECT", "FROM", "WHERE", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER",
            "TABLE", "VIEW", "INDEX", "SCHEMA", "DATABASE", "USE", "SHOW", "DESCRIBE", "EXPLAIN",
            "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "ON", "AND", "OR", "NOT", "IN", "EXISTS",
            "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "OFFSET", "DISTINCT", "COUNT", "SUM", "AVG",
            "MAX", "MIN", "AS", "CASE", "WHEN", "THEN", "ELSE", "END", "IF", "NULL", "IS NULL",
            "IS NOT NULL", "LIKE", "BETWEEN", "UNION", "ALL", "INTERSECT", "EXCEPT", "WITH",
            "CTE", "RECURSIVE", "WINDOW", "OVER", "PARTITION BY", "ROWS", "RANGE", "PRECEDING",
            "FOLLOWING", "UNBOUNDED", "CURRENT ROW", "LAG", "LEAD", "FIRST_VALUE", "LAST_VALUE",
            "RANK", "DENSE_RANK", "ROW_NUMBER", "NTILE", "PERCENT_RANK", "CUME_DIST"
        ]
        
        # 関数の定義
        self.sql_functions = [
            "COUNT", "SUM", "AVG", "MAX", "MIN", "STDDEV", "VARIANCE", "COVAR_POP", "COVAR_SAMP",
            "CORR", "REGR_SLOPE", "REGR_INTERCEPT", "REGR_R2", "REGR_COUNT", "REGR_AVGX",
            "REGR_AVGY", "REGR_SXX", "REGR_SYY", "REGR_SXY", "CONCAT", "SUBSTRING", "TRIM",
            "UPPER", "LOWER", "LENGTH", "CHAR_LENGTH", "POSITION", "REPLACE", "TRANSLATE",
            "REGEXP_LIKE", "REGEXP_REPLACE", "REGEXP_SUBSTR", "TO_CHAR", "TO_DATE", "TO_NUMBER",
            "CURRENT_DATE", "CURRENT_TIME", "CURRENT_TIMESTAMP", "SYSDATE", "SYSTIMESTAMP",
            "EXTRACT", "YEAR", "MONTH", "DAY", "HOUR", "MINUTE", "SECOND", "QUARTER", "WEEK",
            "DAYOFWEEK", "DAYOFYEAR", "WEEKOFYEAR", "DATEADD", "DATEDIFF", "DATE_TRUNC",
            "ROUND", "CEIL", "FLOOR", "ABS", "MOD", "POWER", "SQRT", "EXP", "LN", "LOG",
            "SIN", "COS", "TAN", "ASIN", "ACOS", "ATAN", "ATAN2", "DEGREES", "RADIANS",
            "PI", "RANDOM", "UUID", "MD5", "SHA1", "SHA2", "ENCODE", "DECODE", "BASE64_ENCODE",
            "BASE64_DECODE", "HEX_ENCODE", "HEX_DECODE", "COMPRESS", "UNCOMPRESS", "GZIP",
            "GUNZIP", "ZIP", "UNZIP", "FLATTEN", "OBJECT_KEYS", "OBJECT_VALUES", "PARSE_JSON",
            "TO_JSON", "ARRAY_CONSTRUCT", "ARRAY_CONTAINS", "ARRAY_INSERT", "ARRAY_POSITION",
            "ARRAY_REMOVE", "ARRAY_REPLACE", "ARRAY_SLICE", "ARRAY_TO_STRING", "STRING_TO_ARRAY"
        ]
    
    def get_completions(self, sql: str, position: int, context: Optional[Dict[str, Any]] = None) -> SQLCompletionResponse:
        """SQL補完候補を取得"""
        self.logger.info("SQL補完要求", position=position, sql_length=len(sql))
        
        try:
            # 現在の単語を取得
            current_word = self._get_current_word(sql, position)
            self.logger.debug("現在の単語", word=current_word)
            
            # 補完候補を生成
            suggestions = []
            
            # キーワードの補完
            keyword_suggestions = self._get_keyword_suggestions(current_word)
            suggestions.extend(keyword_suggestions)
            
            # 関数の補完
            function_suggestions = self._get_function_suggestions(current_word)
            suggestions.extend(function_suggestions)
            
            # データベースオブジェクトの補完
            object_suggestions = self._get_object_suggestions(sql, position, current_word)
            suggestions.extend(object_suggestions)
            
            # 候補をソート
            suggestions.sort(key=lambda x: x.sort_text or x.label)
            
            self.logger.info("補完候補生成完了", count=len(suggestions))
            
            return SQLCompletionResponse(
                suggestions=suggestions,
                is_incomplete=False
            )
            
        except Exception as e:
            self.logger.error("SQL補完エラー", error=str(e))
            return SQLCompletionResponse(suggestions=[], is_incomplete=False)
    
    def _get_current_word(self, sql: str, position: int) -> str:
        """現在のカーソル位置の単語を取得"""
        if position > len(sql):
            position = len(sql)
        
        # カーソル位置から左側の単語を取得
        start = position
        while start > 0 and (sql[start - 1].isalnum() or sql[start - 1] in '_'):
            start -= 1
        
        return sql[start:position].upper()
    
    def _get_keyword_suggestions(self, current_word: str) -> List[SQLCompletionItem]:
        """SQLキーワードの補完候補を取得"""
        suggestions = []
        
        for keyword in self.sql_keywords:
            if keyword.startswith(current_word):
                suggestions.append(SQLCompletionItem(
                    label=keyword,
                    kind="keyword",
                    detail=f"SQLキーワード: {keyword}",
                    documentation=f"SQLの予約語です。{keyword}句で使用されます。",
                    insert_text=keyword,
                    sort_text=f"1_{keyword}"
                ))
        
        return suggestions
    
    def _get_function_suggestions(self, current_word: str) -> List[SQLCompletionItem]:
        """SQL関数の補完候補を取得"""
        suggestions = []
        
        for func in self.sql_functions:
            if func.startswith(current_word):
                suggestions.append(SQLCompletionItem(
                    label=f"{func}()",
                    kind="function",
                    detail=f"SQL関数: {func}",
                    documentation=f"SQLの組み込み関数です。{func}関数を呼び出します。",
                    insert_text=f"{func}($1)",
                    sort_text=f"2_{func}"
                ))
        
        return suggestions
    
    def _get_object_suggestions(self, sql: str, position: int, current_word: str) -> List[SQLCompletionItem]:
        """データベースオブジェクト（スキーマ、テーブル、カラム）の補完候補を取得"""
        suggestions = []
        
        try:
            # メタデータからオブジェクト情報を取得
            all_metadata = self.metadata_service.get_all_metadata()
            
            # スキーマの補完
            schema_suggestions = self._get_schema_suggestions(all_metadata, current_word)
            suggestions.extend(schema_suggestions)
            
            # テーブルの補完
            table_suggestions = self._get_table_suggestions(all_metadata, current_word)
            suggestions.extend(table_suggestions)
            
            # カラムの補完
            column_suggestions = self._get_column_suggestions(all_metadata, sql, position, current_word)
            suggestions.extend(column_suggestions)
            
        except Exception as e:
            self.logger.error("オブジェクト補完候補取得エラー", error=str(e))
        
        return suggestions
    
    def _get_schema_suggestions(self, all_metadata: List[Dict[str, Any]], current_word: str) -> List[SQLCompletionItem]:
        """スキーマの補完候補を取得"""
        suggestions = []
        
        for schema_data in all_metadata:
            schema_name = schema_data.get("name", "")
            if schema_name.upper().startswith(current_word):
                suggestions.append(SQLCompletionItem(
                    label=schema_name,
                    kind="schema",
                    detail=f"スキーマ: {schema_name}",
                    documentation=f"データベーススキーマです。テーブルやビューが含まれています。",
                    insert_text=schema_name,
                    sort_text=f"3_{schema_name}"
                ))
        
        return suggestions
    
    def _get_table_suggestions(self, all_metadata: List[Dict[str, Any]], current_word: str) -> List[SQLCompletionItem]:
        """テーブルの補完候補を取得"""
        suggestions = []
        
        for schema_data in all_metadata:
            schema_name = schema_data.get("name", "")
            tables = schema_data.get("tables", [])
            
            for table_data in tables:
                table_name = table_data.get("name", "")
                table_type = table_data.get("table_type", "TABLE")
                
                if table_name.upper().startswith(current_word):
                    suggestions.append(SQLCompletionItem(
                        label=f"{schema_name}.{table_name}",
                        kind="table" if table_type == "TABLE" else "view",
                        detail=f"{table_type}: {schema_name}.{table_name}",
                        documentation=f"{table_type}です。スキーマ {schema_name} に属しています。",
                        insert_text=f"{schema_name}.{table_name}",
                        sort_text=f"4_{schema_name}.{table_name}"
                    ))
        
        return suggestions
    
    def _get_column_suggestions(self, all_metadata: List[Dict[str, Any]], sql: str, position: int, current_word: str) -> List[SQLCompletionItem]:
        """カラムの補完候補を取得"""
        suggestions = []
        
        # SQLからテーブル情報を解析して、適切なカラムを提案
        tables_in_context = self._extract_tables_from_sql(sql, position)
        
        for schema_data in all_metadata:
            schema_name = schema_data.get("name", "")
            tables = schema_data.get("tables", [])
            
            for table_data in tables:
                table_name = table_data.get("name", "")
                columns = table_data.get("columns", [])
                
                # コンテキストにテーブルが含まれている場合のみカラムを提案
                if not tables_in_context or f"{schema_name}.{table_name}" in tables_in_context or table_name in tables_in_context:
                    for column_data in columns:
                        column_name = column_data.get("name", "")
                        data_type = column_data.get("data_type", "")
                        
                        if column_name.upper().startswith(current_word):
                            suggestions.append(SQLCompletionItem(
                                label=f"{schema_name}.{table_name}.{column_name}",
                                kind="column",
                                detail=f"カラム: {column_name} ({data_type})",
                                documentation=f"テーブル {schema_name}.{table_name} のカラムです。データ型: {data_type}",
                                insert_text=f"{schema_name}.{table_name}.{column_name}",
                                sort_text=f"5_{schema_name}.{table_name}.{column_name}"
                            ))
        
        return suggestions
    
    def _extract_tables_from_sql(self, sql: str, position: int) -> List[str]:
        """SQLからテーブル情報を抽出"""
        tables = []
        
        try:
            # 簡易的なテーブル抽出（FROM句とJOIN句から）
            sql_before_cursor = sql[:position]
            
            # FROM句のテーブルを抽出
            from_pattern = r'\bFROM\s+([^\s,()]+)'
            from_matches = re.findall(from_pattern, sql_before_cursor, re.IGNORECASE)
            tables.extend(from_matches)
            
            # JOIN句のテーブルを抽出
            join_pattern = r'\bJOIN\s+([^\s,()]+)'
            join_matches = re.findall(join_pattern, sql_before_cursor, re.IGNORECASE)
            tables.extend(join_matches)
            
        except Exception as e:
            self.logger.error("テーブル抽出エラー", error=str(e))
        
        return tables 