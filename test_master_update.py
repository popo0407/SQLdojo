from app.services.master_data_service import MasterDataService
from app.metadata_cache import MetadataCache
from app.services.query_executor import QueryExecutor
from app.services.connection_manager_odbc import ConnectionManagerODBC

try:
    # 依存関係を設定
    connection_manager = ConnectionManagerODBC()
    query_executor = QueryExecutor(connection_manager)
    metadata_cache = MetadataCache()
    
    # MasterDataServiceを作成
    master_service = MasterDataService(query_executor, metadata_cache)
    
    # STATION_MASTERのみテスト
    print("Testing STATION_MASTER update...")
    station_count = master_service._update_station_master()
    print(f"STATION_MASTER updated: {station_count} records")
    
except Exception as e:
    import traceback
    print(f"Error: {e}")
    print("Traceback:")
    traceback.print_exc()