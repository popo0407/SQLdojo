#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from app.services.sql_log_service import SQLLogService
from app.services.query_executor import QueryExecutor
from app.services.connection_manager_odbc import ConnectionManagerODBC
from datetime import datetime

def test_sql_log():
    try:
        print("SQLログサービステスト開始...")
        
        # サービスを初期化
        conn_mgr = ConnectionManagerODBC()
        query_exec = QueryExecutor(conn_mgr)
        log_service = SQLLogService(query_exec)
        
        print("サービス初期化完了")
        
        # テストログを追加
        test_sql = "SELECT 1 as test_column"
        test_user = "test_user"
        test_execution_time = 0.5
        test_start_time = datetime.now()
        
        print(f"テストSQL: {test_sql}")
        print(f"テストユーザー: {test_user}")
        print(f"実行時間: {test_execution_time}")
        
        # ログをSnowflakeに保存
        log_service.add_log_to_db(
            user_id=test_user,
            sql=test_sql,
            execution_time=test_execution_time,
            start_time=test_start_time
        )
        
        print("Snowflakeへのログ保存完了")
        
        # ローカルファイルにも保存
        log_id = log_service.add_log(
            user_id=test_user,
            sql=test_sql,
            execution_time=test_execution_time,
            row_count=1,
            success=True
        )
        
        print(f"ローカルファイルへのログ保存完了: {log_id}")
        
        print("テスト完了！")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_sql_log() 