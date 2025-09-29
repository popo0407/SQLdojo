from app.services.query_executor import QueryExecutor
from app.services.connection_manager_odbc import ConnectionManagerODBC

try:
    # 依存関係を設定
    connection_manager = ConnectionManagerODBC()
    query_executor = QueryExecutor(connection_manager)
    
    # 利用可能なテーブルを確認
    print("Checking available tables...")
    result = query_executor.execute_query("SHOW TABLES")
    
    if result.success and result.data:
        print(f"Found {len(result.data)} tables:")
        for table in result.data:
            print(f"  - {table}")
    else:
        print("No tables found or error occurred")
        print(f"Error: {result.error_message}")
    
except Exception as e:
    import traceback
    print(f"Error: {e}")
    print("Traceback:")
    traceback.print_exc()