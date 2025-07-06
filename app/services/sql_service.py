# -*- coding: utf-8 -*-
"""
SQLサービス
SQLの実行、検証、整形を行う
"""
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
import time

from app.logger import get_logger
from app.sql_validator import get_validator, ValidationResult
from app.exceptions import SQLExecutionError, SQLValidationError
from .query_executor import QueryExecutor, QueryResult


@dataclass
class SQLExecutionResult:
    """SQL実行結果"""
    success: bool
    data: Optional[List[Dict[str, Any]]] = None
    columns: Optional[List[str]] = None
    row_count: int = 0
    execution_time: float = 0.0
    error_message: Optional[str] = None
    sql: str = ""
    query_id: Optional[str] = None


class SQLService:
    """SQLサービス"""
    
    def __init__(self, query_executor: QueryExecutor):
        self.validator = get_validator()
        self.logger = get_logger()
        self.query_executor = query_executor
    
    def validate_sql(self, sql: str) -> ValidationResult:
        """SQLをバリデーション"""
        try:
            self.logger.info("SQLバリデーション開始", sql=sql)
            result = self.validator.validate_sql(sql)
            
            if result.is_valid:
                self.logger.info("SQLバリデーション成功", sql=sql)
            else:
                self.logger.warning("SQLバリデーション失敗", 
                                  sql=sql, errors=result.errors)
            
            return result
            
        except Exception as e:
            self.logger.error("SQLバリデーションエラー", exception=e, sql=sql)
            raise SQLValidationError(f"SQLバリデーションエラー: {str(e)}")
    
    def format_sql(self, sql: str):
        """SQLを整形"""
        try:
            self.logger.info("SQL整形開始", sql=sql)
            formatted = self.validator.format_sql(sql)
            self.logger.info("SQL整形完了", 
                           original_sql=sql, formatted_sql=formatted)
            return type('FormatResult', (), {
                'formatted_sql': formatted,
                'success': True,
                'error_message': None
            })()
        except Exception as e:
            self.logger.error("SQL整形エラー", exception=e, sql=sql)
            return type('FormatResult', (), {
                'formatted_sql': '',
                'success': False,
                'error_message': f"SQL整形エラー: {str(e)}"
            })()
    
    def execute_sql(self, sql: str, limit: Optional[int] = None) -> SQLExecutionResult:
        """SQLを実行"""
        start_time = time.time()
        
        try:
            self.logger.info("SQL実行開始", sql=sql, limit=limit)
            
            # SQLバリデーション
            validation_result = self.validate_sql(sql)
            if not validation_result.is_valid:
                # エラーメッセージを具体化
                error_messages = []
                for error in validation_result.errors:
                    if "FROM句が必要です" in error:
                        error_messages.append("FROM句が必要です。対象テーブルを指定してください。例: SELECT * FROM table_name")
                    elif "WHERE句が必要です" in error:
                        error_messages.append("WHERE句が必要です。大量データの取得を防ぐため、条件を指定してください。例: WHERE column_name = 'value'")
                    elif "SELECT句が必要です" in error:
                        error_messages.append("SELECT句が必要です。取得するカラムを指定してください。例: SELECT column1, column2")
                    else:
                        error_messages.append(error)
                
                return SQLExecutionResult(
                    success=False,
                    error_message="; ".join(error_messages),
                    sql=sql,
                    execution_time=time.time() - start_time
                )
            
            # クエリ実行器でSQL実行
            db_result = self.query_executor.execute_query(sql, limit=limit)
            
            # 結果を変換
            result = SQLExecutionResult(
                success=db_result.success,
                data=db_result.data,
                columns=db_result.columns,
                row_count=db_result.row_count,
                execution_time=db_result.execution_time,
                error_message=db_result.error_message,
                sql=sql,
                query_id=db_result.query_id
            )
            
            if result.success:
                self.logger.info("SQL実行完了", 
                               sql=sql, row_count=result.row_count, 
                               execution_time=result.execution_time,
                               query_id=result.query_id)
            else:
                self.logger.error("SQL実行失敗", 
                                sql=sql, error=result.error_message,
                                execution_time=result.execution_time)
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            self.logger.error("SQL実行エラー", exception=e, sql=sql)
            
            return SQLExecutionResult(
                success=False,
                error_message=f"SQL実行エラー: {str(e)}",
                sql=sql,
                execution_time=execution_time
            )
    
    def extract_tables(self, sql: str) -> List[str]:
        """SQLからテーブル名を抽出"""
        try:
            return self.validator.extract_tables(sql)
        except Exception as e:
            self.logger.error("テーブル名抽出エラー", exception=e, sql=sql)
            return []
    
    def extract_columns(self, sql: str) -> List[str]:
        """SQLからカラム名を抽出"""
        try:
            return self.validator.extract_columns(sql)
        except Exception as e:
            self.logger.error("カラム名抽出エラー", exception=e, sql=sql)
            return []
    
    def test_connection(self) -> bool:
        """データベース接続テスト"""
        try:
            return self.query_executor.test_connection()
        except Exception as e:
            self.logger.error("接続テストエラー", exception=e)
            return False
    
    def get_connection_status(self) -> Dict[str, Any]:
        """接続状態を取得"""
        try:
            return self.query_executor.get_connection_status()
        except Exception as e:
            self.logger.error("接続状態取得エラー", exception=e)
            return {"error": str(e)} 

    def get_pool_status(self) -> Dict[str, Any]:
        """接続プールの状態を取得（DatabaseServiceから移行）"""
        try:
            return self.query_executor.get_connection_status()
        except Exception as e:
            self.logger.error("接続プール状態取得エラー", exception=e)
            return {"error": str(e)} 