# -*- coding: utf-8 -*-
"""
クエリ実行モジュール
SQLクエリの実行と結果取得に特化
"""
import time
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
from contextlib import contextmanager
import json
import pandas as pd
import pyodbc

from app.services.connection_manager_odbc import ConnectionManagerODBC
from app.logger import get_logger
from app.exceptions import SQLExecutionError, DatabaseError as AppDatabaseError, ExportError
from contextlib import contextmanager

@dataclass
class QueryResult:
    """クエリ実行結果"""
    success: bool
    data: Optional[List[Dict[str, Any]]] = None
    columns: Optional[List[str]] = None
    row_count: int = 0
    execution_time: float = 0.0
    error_message: Optional[str] = None
    query_id: Optional[str] = None
    sql: Optional[str] = None


class QueryExecutor:
    """SQLクエリ実行クラス"""
    
    def __init__(self, connection_manager: ConnectionManagerODBC):
        self.connection_manager = connection_manager
        self.logger = get_logger(__name__)
    
    def execute_query(self, sql: str, params: Optional[Dict[str, Any]] = None, limit: Optional[int] = None) -> QueryResult:
        """SQLクエリを実行"""
        start_time = time.time()
        conn_id = None
        
        try:
            # 接続を取得
            conn_id, connection = self.connection_manager.get_connection()
            
            # クエリを実行
            result = self._execute_query_internal(connection, sql, params, limit)
            result.execution_time = time.time() - start_time
            
            # Snowflakeへのアクセスログを表示
            self.logger.debug(f"Snowflakeクエリ実行完了", 
                           query_id=result.query_id,
                           row_count=result.row_count,
                           execution_time=f"{result.execution_time:.3f}s")
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            error_message = f"クエリ実行エラー: {str(e)}"
            
            self.logger.error(f"Snowflakeクエリ実行失敗", 
                            sql=sql,
                            error=error_message,
                            execution_time=execution_time)
            
            return QueryResult(
                success=False,
                error_message=error_message,
                execution_time=execution_time,
                sql=sql
            )
        
        finally:
            # 接続をプールに返す
            if conn_id:
                self.connection_manager.release_connection(conn_id)
    
    def _execute_query_internal(self, connection: pyodbc.Connection, 
                               sql: str, params: Optional[Dict[str, Any]] = None, 
                               limit: Optional[int] = None) -> QueryResult:
        """内部クエリ実行処理"""
        cursor = None
        
        try:
            cursor = connection.cursor()
            
            # パラメータがある場合はバインド
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            
            # クエリIDを取得（ODBCでは利用できないためNone）
            query_id = None
            
            # 結果を取得
            if cursor.description:
                # SELECT文の場合
                columns = [desc[0].lower() for desc in cursor.description]
                
                # 制限がある場合は適用
                if limit is not None:
                    rows = cursor.fetchmany(limit)
                else:
                    rows = cursor.fetchall()
                
                # 辞書形式に変換
                data = []
                for row in rows:
                    row_dict = {}
                    for i, value in enumerate(row):
                        row_dict[columns[i]] = value
                    data.append(row_dict)
                
                return QueryResult(
                    success=True,
                    data=data,
                    columns=columns,
                    row_count=len(data),
                    query_id=query_id,
                    sql=sql
                )
            else:
                # INSERT, UPDATE, DELETE文の場合
                row_count = cursor.rowcount if hasattr(cursor, 'rowcount') else 0
                
                return QueryResult(
                    success=True,
                    data=[],
                    columns=[],
                    row_count=row_count,
                    query_id=query_id,
                    sql=sql
                )
        
        except pyodbc.Error as e:
            raise SQLExecutionError(f"SQL構文エラー: {str(e)}")
        except Exception as e:
            raise SQLExecutionError(f"予期しないエラー: {str(e)}")
        
        finally:
            if cursor:
                cursor.close()
    
    def execute_explain_plan(self, sql: str) -> QueryResult:
        """EXPLAIN PLANを実行"""
        explain_sql = f"EXPLAIN PLAN FOR {sql}"
        return self.execute_query(explain_sql)
    
    def execute_metadata_query(self, sql: str) -> QueryResult:
        """メタデータクエリを実行"""
        return self.execute_query(sql)
    
    def execute_export_query(self, sql: str) -> QueryResult:
        """エクスポート用クエリを実行（制限なし）"""
        return self.execute_query(sql, limit=None)
    
    def test_connection(self) -> bool:
        """接続テスト"""
        return self.connection_manager.test_connection()
    
    def get_connection_status(self) -> Dict[str, Any]:
        """接続状態を取得"""
        return self.connection_manager.get_pool_status() 

    def execute_query_and_stream(self, sql: str):
        """
        クエリを実行し、結果をストリーミングでyieldするジェネレータ。
        接続管理は手動で行う。
        """
        conn_id, connection = self.connection_manager.get_connection()
        cursor = connection.cursor()
        self.logger.info("ストリーミング用カーソルを開きました", sql=sql)

        try:
            cursor.execute(sql)
            
            # 最初にヘッダー行をyield
            yield [desc[0] for desc in cursor.description]

            # 次にデータをチャンクでyield
            while True:
                rows_chunk = cursor.fetchmany(5000)
                if not rows_chunk:
                    break
                yield from rows_chunk
        finally:
            self.logger.info("ストリーミング完了。カーソルを閉じ、接続を解放します。")
            cursor.close()
            self.connection_manager.release_connection(conn_id)
    
    def stream_query_results(self, sql: str):
        self.logger.info("クエリ結果のストリーミング開始", sql=sql)
        try:
            # Query Executorの新しいストリーミングメソッドを呼び出す
            return self.execute_query_and_stream(sql)
        except Exception as e:
            self.logger.error("クエリ結果のストリーミング中にエラー", exception=e)
            raise ExportError(f"データのエクスポート中にエラーが発生しました: {e}")

    def execute_query_yield_cursor(self, sql: str, params: Optional[Dict[str, Any]] = None):
        """
        クエリを実行し、結果をyieldするカーソルを返すコンテキストマネージャ。
        ストリーミング処理のために使用。
        """
        conn_id, connection = self.connection_manager.get_connection()
        cursor = None
        try:
            cursor = connection.cursor()
            self.logger.info("ストリーミング用カーソルを開きました", sql=sql)
            
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            
            yield cursor
            
        finally:
            if cursor:
                self.logger.info("ストリーミング完了。カーソルを閉じます。")
                cursor.close()
            if conn_id:
                self.logger.info("接続を解放します。")
                self.connection_manager.release_connection(conn_id)