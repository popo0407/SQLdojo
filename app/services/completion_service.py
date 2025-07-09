"""
SQL Completion Service
Provides SQL autocompletion for Monaco Editor.
"""
from typing import List, Dict, Any, Optional
import re
import sqlparse
from sqlparse.sql import Token
from sqlparse.tokens import Keyword

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

        self.sql_keywords = {
            "SELECT": "テーブルから列を取得します。", "FROM": "データを取得するテーブルを指定します。",
            "WHERE": "取得する行をフィルタリングします。", "JOIN": "テーブルを結合します。",
            "LEFT JOIN": "左テーブルを基準に結合します。", "RIGHT JOIN": "右テーブルを基準に結合します。",
            "INNER JOIN": "両方に共通する行のみ結合します。", "ON": "結合条件を指定します。",
            "GROUP BY": "データをグループ化します。", "ORDER BY": "結果をソートします。",
            "HAVING": "集計結果をフィルタリングします。", "LIMIT": "取得行の最大数を指定します。",
            "DISTINCT": "重複行を除外します。", "AS": "列やテーブルに別名を付けます。",
            "CASE": "条件に応じて値を返します。", "AND": "複数条件を結合します（すべて満たす）。",
            "OR": "複数条件を結合します（いずれかを満たす）。", "IS NULL": "値がNULLかチェックします。",
            "IS NOT NULL": "値がNULLでないかチェックします。", "LIKE": "パターン一致で検索します。",
            "IN": "リスト内の値のいずれかに一致するかチェックします。", "BETWEEN": "値が範囲内にあるかチェックします。",
            "EXISTS": "サブクエリが結果を返すかチェックします。", "WITH": "一時的なクエリ（CTE）を定義します。",
        }
        
        self.sql_functions = {
            "COUNT": "行の数を数えます。", "SUM": "数値の合計を計算します。", "AVG": "数値の平均を計算します。",
            "MAX": "最大値を取得します。", "MIN": "最小値を取得します。",
            "CONCAT": "文字列を連結します。", "UPPER": "大文字に変換します。", "LOWER": "小文字に変換します。",
            "TRIM": "左右の空白を削除します。", "LENGTH": "文字列の長さを取得します。",
            "COALESCE": "NULLでない最初の値を取得します。", "CURRENT_DATE": "現在の日付を取得します。",
            "CURRENT_TIMESTAMP": "現在の日付と時刻を取得します。", "CAST": "データ型を変換します。",
            "ROW_NUMBER": "連番を付けます。", "RANK": "順位を付けます(同順位は次の順位が飛ぶ)。", 
            "DENSE_RANK": "順位を付けます(同順位でも順位は飛ばない)。",
        }


    def get_completions(self, sql: str, position: int, context: Optional[Dict[str, Any]] = None) -> SQLCompletionResponse:
        """SQL補完候補を文脈に応じて生成するメイン機能"""
        try:
            current_word = self._get_current_word(sql, position)
            self.logger.info(f"DEBUG: get_completions called. Current word: '{current_word}'")
            
            suggestions = []
            
            # 1. SQLの文脈（カーソル直前のキーワード）を解析
            context_keyword = self._get_context_keyword(sql, position)
            
            # 2. 文脈に応じて、出すべき候補の種類を決める
            if context_keyword in ('FROM', 'JOIN'):
                # FROMやJOINの後では、テーブル名を優先的に提案
                suggestions.extend(self._get_table_suggestions(current_word))
            else:
                # それ以外の場所 (SELECT, WHEREなど) では、カラム名と関数を提案
                suggestions.extend(self._get_column_suggestions(sql, current_word))
                suggestions.extend(self._get_function_suggestions(current_word))

            # 3. 常にキーワードは候補に加える
            suggestions.extend(self._get_keyword_suggestions(current_word))

            # 4. 候補をソートして返す
            suggestions.sort(key=lambda x: x.sort_text or x.label)
            return SQLCompletionResponse(suggestions=suggestions, is_incomplete=False)
        except Exception as e:
            self.logger.error(f"SQL completion error: {str(e)}", exc_info=True)
            return SQLCompletionResponse(suggestions=[])

    def _get_context_keyword(self, sql: str, position: int) -> Optional[str]:
        try:
            sql_before_cursor = sql[:position]
            match = re.search(r'\b(FROM|JOIN)\s+$', sql_before_cursor, re.IGNORECASE)
            if match:
                return match.group(1).upper()
        except Exception:
            return None
        return None

    def _get_current_word(self, sql: str, position: int) -> str:
        if position > len(sql):
            position = len(sql)
        start = position
        while start > 0 and (sql[start - 1].isalnum() or sql[start - 1] in '_.'):
            start -= 1
        return sql[start:position].upper()

    def _get_keyword_suggestions(self, current_word: str) -> List[SQLCompletionItem]:
        suggestions = []
        for keyword, description in self.sql_keywords.items():
            if keyword.startswith(current_word):
                suggestions.append(SQLCompletionItem(
                    label=keyword, kind="keyword", detail=description,
                    insert_text=keyword, sort_text=f"3_{keyword}"  # 優先度3
                ))
        return suggestions

    def _get_function_suggestions(self, current_word: str) -> List[SQLCompletionItem]:
        """関数の候補を生成する"""
        suggestions = []
        for func_name, description in self.sql_functions.items():
            if func_name.startswith(current_word):
                suggestions.append(SQLCompletionItem(
                    label=f"{func_name}()",
                    kind="function",
                    detail=description,
                    insert_text=f"{func_name}($1)",
                    sort_text=f"2_{func_name}"  # 優先度2
                ))
        return suggestions

    def _get_table_suggestions(self, current_word: str) -> List[SQLCompletionItem]:
        suggestions = []
        all_metadata = self.metadata_service.get_all_metadata()
        if not all_metadata: return suggestions

        for schema_data in all_metadata:
            for table_data in schema_data.get("tables", []):
                table_name = table_data.get("name", "")
                if table_name and table_name.upper().startswith(current_word):
                    comment = table_data.get("comment")
                    default_detail = f"{table_data.get('table_type', 'TABLE')} in {schema_data.get('name')}"
                    suggestions.append(SQLCompletionItem(
                        label=table_name,
                        kind="table" if table_data.get("table_type") == "TABLE" else "view",
                        detail=comment or default_detail,
                        documentation=comment,
                        insert_text=table_name,
                        sort_text=f"1_{table_name}"  # 優先度1
                    ))
        return suggestions

    def _get_column_suggestions(self, sql: str, current_word: str) -> List[SQLCompletionItem]:
        suggestions = []
        all_metadata = self.metadata_service.get_all_metadata()
        if not all_metadata: return suggestions

        tables_in_query = self._extract_table_names_from_sql(sql)
        if not tables_in_query: return suggestions 

        target_table_names = [t.upper() for t in tables_in_query]
        for schema_data in all_metadata:
            for table_data in schema_data.get("tables", []):
                if table_data.get("name", "").upper() in target_table_names:
                    for column_data in table_data.get("columns", []):
                        column_name = column_data.get("name", "")
                        if column_name and column_name.upper().startswith(current_word):
                            suggestions.append(self._create_column_suggestion(column_data, table_data.get("name", "")))
        return suggestions

    def _create_column_suggestion(self, column_data: Dict[str, Any], table_name: str) -> SQLCompletionItem:
        column_name = column_data.get("name", "")
        comment = column_data.get("comment")
        default_detail = f"{column_data.get('data_type', '')} in {table_name}"
        return SQLCompletionItem(
            label=column_name,
            kind="column",
            detail=comment or default_detail,
            documentation=comment,
            insert_text=column_name,
            sort_text=f"1_{table_name}.{column_name}"  # 優先度1
        )

    def _extract_table_names_from_sql(self, sql: str) -> List[str]:
        tables = set()
        try:
            pattern = re.compile(r'\b(?:FROM|JOIN)\s+([a-zA-Z0-9_."]+)', re.IGNORECASE)
            matches = pattern.findall(sql)
            for match in matches:
                table_name = match.split('.')[-1].replace('"', '')
                if table_name.upper() not in self.sql_keywords:
                    tables.add(table_name)
        except Exception as e:
            self.logger.error(f"Error extracting table names from SQL: {str(e)}")
        return list(tables)