# app/services/completion_service.py

"""
SQL Completion Service
Provides SQL autocompletion for Monaco Editor.
"""
from typing import List, Dict, Any, Optional
import re
import sqlparse
from sqlparse.sql import Identifier, IdentifierList

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
        self._all_metadata = None  # メモリ内キャッシュ

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

    def _load_metadata_if_needed(self):
        """パフォーマンス改善のため、メタデータをメモリにキャッシュする"""
        if self._all_metadata is None:
            self.logger.info("CompletionService: メタデータをメモリに読み込みます...")
            try:
                self._all_metadata = self.metadata_service.get_all_metadata()
                self.logger.info(f"CompletionService: メタデータ読み込み完了。スキーマ数: {len(self._all_metadata)}")
            except Exception as e:
                self.logger.error(f"CompletionService: メタデータの読み込みに失敗: {e}", exc_info=True)
                self._all_metadata = []

    def get_completions(self, sql: str, position: int, context: Optional[Dict[str, Any]] = None) -> SQLCompletionResponse:
        """SQL補完候補を文脈に応じて生成するメイン機能"""
        try:
            self._load_metadata_if_needed() # メタデータを読み込み
            
            current_word = self._get_current_word(sql, position)
            suggestions = []
            
            context_type, tables_in_query = self._get_sql_context(sql, position)
            self.logger.debug(f"SQL Context: {context_type}, Tables in Query: {tables_in_query}")

            if context_type == 'TABLE':
                suggestions.extend(self._get_table_suggestions(current_word))
            else: # デフォルトはカラム補完を試みる
                suggestions.extend(self._get_column_suggestions(tables_in_query, current_word))

            suggestions.extend(self._get_keyword_suggestions(current_word))
            suggestions.extend(self._get_function_suggestions(current_word))

            seen = set()
            unique_suggestions = [s for s in suggestions if s.label not in seen and not seen.add(s.label)]
            
            unique_suggestions.sort(key=lambda x: (x.sort_text or f"9_{x.label}"))
            return SQLCompletionResponse(suggestions=unique_suggestions, is_incomplete=False)
        except Exception as e:
            self.logger.error(f"SQL completion error: {str(e)}", exc_info=True)
            return SQLCompletionResponse(suggestions=[])

    def _get_sql_context(self, sql: str, position: int) -> tuple[Optional[str], List[str]]:
        """sqlparseを使い、カーソル位置の文脈（テーブル候補か、カラム候補か）を判断する"""
        tables_in_query = self._extract_table_names_from_sql(sql)
        sql_to_cursor = sql[:position]
        
        # カーソル直前の単語のさらに前のキーワードで判断
        tokens = list(sqlparse.parse(sql_to_cursor)[0].flatten())
        
        last_keyword = None
        # 末尾から遡ってキーワードを探す
        for token in reversed(tokens):
            if token.is_keyword:
                last_keyword = token.normalized
                break
        
        if last_keyword in ('FROM', 'JOIN'):
            return 'TABLE', tables_in_query
            
        return 'COLUMN', tables_in_query

    def _get_current_word(self, sql: str, position: int) -> str:
        """カーソル位置の単語を取得"""
        if position > len(sql):
            position = len(sql)
        start = position
        while start > 0 and (sql[start - 1].isalnum() or sql[start - 1] in '_.'):
            start -= 1
        return sql[start:position].upper()

    def _get_keyword_suggestions(self, current_word: str) -> List[SQLCompletionItem]:
        """キーワードの候補を生成する"""
        return [
            SQLCompletionItem(
                label=kw, kind="keyword", detail=desc,
                insert_text=kw, sort_text=f"3_{kw}"
            )
            for kw, desc in self.sql_keywords.items() if kw.startswith(current_word)
        ]

    def _get_function_suggestions(self, current_word: str) -> List[SQLCompletionItem]:
        """関数の候補を生成する"""
        return [
            SQLCompletionItem(
                label=f"{func}", kind="function", detail=desc,
                insert_text=f"{func}($1)", sort_text=f"2_{func}"
            )
            for func, desc in self.sql_functions.items() if func.startswith(current_word)
        ]

    def _get_table_suggestions(self, current_word: str) -> List[SQLCompletionItem]:
        """テーブルとビューの候補を生成する"""
        suggestions = []
        if not self._all_metadata: return suggestions

        for schema_data in self._all_metadata:
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
                        sort_text=f"1_{table_name}"
                    ))
        return suggestions

    def _get_column_suggestions(self, tables_in_query: List[str], current_word: str) -> List[SQLCompletionItem]:
        """クエリ内のテーブルに含まれるカラムの候補を生成する"""
        suggestions = []
        if not tables_in_query or not self._all_metadata:
            return suggestions

        target_table_names = [t.upper() for t in tables_in_query]
        for schema_data in self._all_metadata:
            for table_data in schema_data.get("tables", []):
                if table_data.get("name", "").upper() in target_table_names:
                    for column_data in table_data.get("columns", []):
                        column_name = column_data.get("name", "")
                        if column_name and column_name.upper().startswith(current_word):
                            suggestions.append(self._create_column_suggestion(column_data, table_data.get("name", "")))
        return suggestions

    def _create_column_suggestion(self, column_data: Dict[str, Any], table_name: str) -> SQLCompletionItem:
        """カラム候補のアイテムを作成する"""
        column_name = column_data.get("name", "")
        comment = column_data.get("comment")
        default_detail = f"{column_data.get('data_type', '')} in {table_name}"
        return SQLCompletionItem(
            label=column_name, kind="column", detail=comment or default_detail,
            documentation=comment, insert_text=column_name, sort_text=f"0_{column_name}"
        )

    def _extract_table_names_from_sql(self, sql: str) -> List[str]:
        """sqlparseを使い、SQLクエリからテーブル名を抽出する"""
        tables = set()
        try:
            parsed = sqlparse.parse(sql)
            for statement in parsed:
                from_seen = False
                for token in statement.tokens:
                    if token.is_keyword and token.normalized in ('FROM', 'JOIN'):
                        from_seen = True
                        continue
                    
                    if from_seen:
                        if isinstance(token, Identifier):
                            tables.add(token.get_real_name())
                            from_seen = False
                        elif isinstance(token, IdentifierList):
                            for identifier in token.get_identifiers():
                                tables.add(identifier.get_real_name())
                            from_seen = False
        except Exception as e:
            self.logger.error(f"SQLからのテーブル名抽出エラー: {e}", exc_info=True)
        
        return list(tables)