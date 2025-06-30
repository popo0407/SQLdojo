# -*- coding: utf-8 -*-
"""
SQL Completion Service
Provides SQL autocompletion for Monaco Editor.
"""
from typing import List, Dict, Any, Optional
import re
from app.api.models import SQLCompletionItem, SQLCompletionResponse
from app.services.metadata_service import MetadataService
from app.config_simplified import get_settings
from app.logger import get_logger


class CompletionService:
    """SQL Completion Service"""

    def __init__(self, metadata_service: MetadataService):
        self.metadata_service = metadata_service
        self.logger = get_logger(__name__)
        self.settings = get_settings()

        # SQL Keywords
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

        # SQL Functions
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
        """Get SQL completion suggestions."""
        self.logger.info("SQL completion request", position=position, sql_length=len(sql))

        try:
            # Get the current word
            current_word = self._get_current_word(sql, position)
            self.logger.debug("Current word", word=current_word)

            # Generate suggestions
            suggestions = []

            # Keyword suggestions
            keyword_suggestions = self._get_keyword_suggestions(current_word)
            suggestions.extend(keyword_suggestions)

            # Function suggestions
            function_suggestions = self._get_function_suggestions(current_word)
            suggestions.extend(function_suggestions)

            # Database object suggestions
            object_suggestions = self._get_object_suggestions(sql, position, current_word)
            suggestions.extend(object_suggestions)

            # Sort suggestions
            suggestions.sort(key=lambda x: x.sort_text or x.label)

            self.logger.info("Completion suggestions generated", count=len(suggestions))

            return SQLCompletionResponse(
                suggestions=suggestions,
                is_incomplete=False
            )

        except Exception as e:
            self.logger.error("SQL completion error", error=str(e))
            return SQLCompletionResponse(suggestions=[], is_incomplete=False)

    def _get_current_word(self, sql: str, position: int) -> str:
        """Get the word at the current cursor position."""
        if position > len(sql):
            position = len(sql)

        # Get the word to the left of the cursor
        start = position
        while start > 0 and (sql[start - 1].isalnum() or sql[start - 1] in '_'):
            start -= 1

        return sql[start:position].upper()

    def _get_keyword_suggestions(self, current_word: str) -> List[SQLCompletionItem]:
        """Get SQL keyword suggestions."""
        suggestions = []

        for keyword in self.sql_keywords:
            if keyword.startswith(current_word):
                suggestions.append(SQLCompletionItem(
                    label=keyword,
                    kind="keyword",
                    detail=f"SQL Keyword: {keyword}",
                    documentation=f"SQL reserved word. Used in {keyword} clause.",
                    insert_text=keyword,
                    sort_text=f"1_{keyword}"
                ))

        return suggestions

    def _get_function_suggestions(self, current_word: str) -> List[SQLCompletionItem]:
        """Get SQL function suggestions."""
        suggestions = []

        for func in self.sql_functions:
            if func.startswith(current_word):
                suggestions.append(SQLCompletionItem(
                    label=f"{func}()",
                    kind="function",
                    detail=f"SQL Function: {func}",
                    documentation=f"Built-in SQL function. Calls the {func} function.",
                    insert_text=f"{func}($1)",
                    sort_text=f"2_{func}"
                ))

        return suggestions

    def _get_object_suggestions(self, sql: str, position: int, current_word: str) -> List[SQLCompletionItem]:
        """Get suggestions for database objects (schemas, tables, columns)."""
        suggestions = []
        
        try:
            # Get all metadata
            all_metadata = self.metadata_service.get_all_metadata()
            
            # Filter by schemas specified in settings
            target_schemas = self.settings.completion_target_schemas
            if target_schemas:
                all_metadata = [
                    schema for schema in all_metadata 
                    if schema.get("name", "").upper() in [s.upper() for s in target_schemas]
                ]

            # Schema suggestions (if needed)
            # schema_suggestions = self._get_schema_suggestions(all_metadata, current_word)
            # suggestions.extend(schema_suggestions)
            
            # Table suggestions
            table_suggestions = self._get_table_suggestions(all_metadata, current_word)
            suggestions.extend(table_suggestions)
            
            # Column suggestions
            column_suggestions = self._get_column_suggestions(all_metadata, sql, position, current_word)
            suggestions.extend(column_suggestions)
            
        except Exception as e:
            self.logger.error("Error getting object suggestions", error=str(e))
        
        return suggestions

    def _get_schema_suggestions(self, all_metadata: List[Dict[str, Any]], current_word: str) -> List[SQLCompletionItem]:
        """Get schema suggestions."""
        suggestions = []

        for schema_data in all_metadata:
            schema_name = schema_data.get("name", "")
            if schema_name.upper().startswith(current_word):
                suggestions.append(SQLCompletionItem(
                    label=schema_name,
                    kind="schema",
                    detail=f"Schema: {schema_name}",
                    documentation="Database schema. Contains tables and views.",
                    insert_text=schema_name,
                    sort_text=f"3_{schema_name}"
                ))

        return suggestions

    def _get_table_suggestions(self, all_metadata: List[Dict[str, Any]], current_word: str) -> List[SQLCompletionItem]:
        """Get table suggestions."""
        suggestions = []

        for schema_data in all_metadata:
            schema_name = schema_data.get("name", "")
            tables = schema_data.get("tables", [])

            for table_data in tables:
                table_name = table_data.get("name", "")
                table_type = table_data.get("table_type", "TABLE")

                # Generate label and insert_text without schema name
                label = table_name
                insert_text = table_name

                if table_name.upper().startswith(current_word):
                    suggestions.append(SQLCompletionItem(
                        label=label,
                        kind="table" if table_type == "TABLE" else "view",
                        detail=f"{table_type}: {table_name}",
                        documentation=f"{table_type} in schema {schema_name}.",
                        insert_text=insert_text,
                        sort_text=f"4_{label}"
                    ))

        return suggestions

    def _get_column_suggestions(self, all_metadata: List[Dict[str, Any]], sql: str, position: int, current_word: str) -> List[SQLCompletionItem]:
        """Get column suggestions."""
        suggestions = []

        # Parse tables from SQL to suggest relevant columns
        tables_in_context = self._extract_tables_from_sql(sql, position)

        for schema_data in all_metadata:
            schema_name = schema_data.get("name", "")
            tables = schema_data.get("tables", [])

            for table_data in tables:
                table_name = table_data.get("name", "")
                columns = table_data.get("columns", [])

                # Suggest columns only if the table is in context
                if not tables_in_context or f"{schema_name}.{table_name}" in tables_in_context or table_name in tables_in_context:
                    for column_data in columns:
                        column_name = column_data.get("name", "")
                        data_type = column_data.get("data_type", "")

                        # Generate label and insert_text without schema and table name
                        label = column_name
                        insert_text = column_name

                        if column_name.upper().startswith(current_word):
                            suggestions.append(SQLCompletionItem(
                                label=label,
                                kind="column",
                                detail=f"Column: {column_name} ({data_type})",
                                documentation=f"Column in table {table_name}. Data type: {data_type}",
                                insert_text=insert_text,
                                sort_text=f"5_{table_name}.{column_name}"
                            ))

        return suggestions

    def _extract_tables_from_sql(self, sql: str, position: int) -> List[str]:
        """Extract table names from SQL."""
        tables = []

        try:
            # Simple extraction from FROM and JOIN clauses
            sql_before_cursor = sql[:position]

            # Extract tables from FROM clause
            from_pattern = r'\bFROM\s+([^\s,()]+)'
            from_matches = re.findall(from_pattern, sql_before_cursor, re.IGNORECASE)
            tables.extend(from_matches)

            # Extract tables from JOIN clause
            join_pattern = r'\bJOIN\s+([^\s,()]+)'
            join_matches = re.findall(join_pattern, sql_before_cursor, re.IGNORECASE)
            tables.extend(join_matches)

        except Exception as e:
            self.logger.error("Error extracting tables", error=str(e))

        return tables