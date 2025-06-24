# -*- coding: utf-8 -*-
"""
APIモデルのテスト
"""
import pytest
from datetime import datetime
from typing import List, Dict, Any

from app.api.models import (
    SQLRequest, SQLResponse, SQLValidationRequest, SQLValidationResponse,
    SQLFormatRequest, SQLFormatResponse, SchemaInfo, TableInfo, ColumnInfo,
    TableDetailInfo, SchemaListResponse, TableListResponse, DownloadRequest,
    DownloadResponse, DownloadStatusResponse, HealthCheckResponse, ErrorResponse,
    PerformanceMetricsResponse, ExportRequest, ExportResponse, ExportHistoryResponse,
    WarehouseInfo, DatabaseInfo, ConnectionStatusResponse
)


class TestSQLRequest:
    """SQLRequestモデルのテスト"""
    
    def test_sql_request_creation(self):
        """SQLRequest作成のテスト"""
        request = SQLRequest(sql="SELECT * FROM test_table")
        
        assert request.sql == "SELECT * FROM test_table"
        assert request.limit == 5000  # デフォルト値
    
    def test_sql_request_with_limit(self):
        """SQLRequest with limitのテスト"""
        request = SQLRequest(sql="SELECT * FROM test_table", limit=100)
        
        assert request.sql == "SELECT * FROM test_table"
        assert request.limit == 100
    
    def test_sql_request_validation(self):
        """SQLRequestバリデーションのテスト"""
        with pytest.raises(ValueError):
            SQLRequest()  # sqlフィールドは必須


class TestSQLResponse:
    """SQLResponseモデルのテスト"""
    
    def test_sql_response_creation(self):
        """SQLResponse作成のテスト"""
        response = SQLResponse(
            success=True,
            sql="SELECT * FROM test_table",
            data=[{"id": 1, "name": "test"}],
            columns=["id", "name"],
            row_count=1,
            execution_time=0.1
        )
        
        assert response.success is True
        assert response.sql == "SELECT * FROM test_table"
        assert response.data == [{"id": 1, "name": "test"}]
        assert response.columns == ["id", "name"]
        assert response.row_count == 1
        assert response.execution_time == 0.1
        assert response.error_message is None
    
    def test_sql_response_error(self):
        """SQLResponseエラーケースのテスト"""
        response = SQLResponse(
            success=False,
            sql="SELECT * FROM invalid_table",
            error_message="Table not found"
        )
        
        assert response.success is False
        assert response.sql == "SELECT * FROM invalid_table"
        assert response.error_message == "Table not found"
        assert response.data is None
        assert response.columns is None
        assert response.row_count is None
        assert response.execution_time is None


class TestSQLValidationRequest:
    """SQLValidationRequestモデルのテスト"""
    
    def test_sql_validation_request_creation(self):
        """SQLValidationRequest作成のテスト"""
        request = SQLValidationRequest(sql="SELECT * FROM test_table")
        
        assert request.sql == "SELECT * FROM test_table"


class TestSQLValidationResponse:
    """SQLValidationResponseモデルのテスト"""
    
    def test_sql_validation_response_valid(self):
        """SQLValidationResponse有効ケースのテスト"""
        response = SQLValidationResponse(
            is_valid=True,
            errors=[],
            warnings=["Consider adding LIMIT clause"],
            suggestions=["Add WHERE clause for better performance"]
        )
        
        assert response.is_valid is True
        assert response.errors == []
        assert response.warnings == ["Consider adding LIMIT clause"]
        assert response.suggestions == ["Add WHERE clause for better performance"]
    
    def test_sql_validation_response_invalid(self):
        """SQLValidationResponse無効ケースのテスト"""
        response = SQLValidationResponse(
            is_valid=False,
            errors=["Syntax error near 'FROM'"],
            warnings=[],
            suggestions=["Check SQL syntax"]
        )
        
        assert response.is_valid is False
        assert response.errors == ["Syntax error near 'FROM'"]
        assert response.warnings == []
        assert response.suggestions == ["Check SQL syntax"]


class TestSQLFormatRequest:
    """SQLFormatRequestモデルのテスト"""
    
    def test_sql_format_request_creation(self):
        """SQLFormatRequest作成のテスト"""
        request = SQLFormatRequest(sql="SELECT * FROM test_table WHERE id=1")
        
        assert request.sql == "SELECT * FROM test_table WHERE id=1"


class TestSQLFormatResponse:
    """SQLFormatResponseモデルのテスト"""
    
    def test_sql_format_response_success(self):
        """SQLFormatResponse成功ケースのテスト"""
        response = SQLFormatResponse(
            formatted_sql="SELECT *\nFROM test_table\nWHERE id = 1;",
            success=True
        )
        
        assert response.formatted_sql == "SELECT *\nFROM test_table\nWHERE id = 1;"
        assert response.success is True
        assert response.error_message is None
    
    def test_sql_format_response_error(self):
        """SQLFormatResponseエラーケースのテスト"""
        response = SQLFormatResponse(
            formatted_sql="",
            success=False,
            error_message="Invalid SQL syntax"
        )
        
        assert response.formatted_sql == ""
        assert response.success is False
        assert response.error_message == "Invalid SQL syntax"


class TestSchemaInfo:
    """SchemaInfoモデルのテスト"""
    
    def test_schema_info_creation(self):
        """SchemaInfo作成のテスト"""
        now = datetime.now()
        schema = SchemaInfo(
            name="test_schema",
            created_on=now,
            is_default=True
        )
        
        assert schema.name == "test_schema"
        assert schema.created_on == now
        assert schema.is_default is True


class TestTableInfo:
    """TableInfoモデルのテスト"""
    
    def test_table_info_creation(self):
        """TableInfo作成のテスト"""
        now = datetime.now()
        table = TableInfo(
            name="test_table",
            schema_name="test_schema",
            table_type="TABLE",
            row_count=1000,
            created_on=now,
            last_altered=now
        )
        
        assert table.name == "test_table"
        assert table.schema_name == "test_schema"
        assert table.table_type == "TABLE"
        assert table.row_count == 1000
        assert table.created_on == now
        assert table.last_altered == now


class TestColumnInfo:
    """ColumnInfoモデルのテスト"""
    
    def test_column_info_creation(self):
        """ColumnInfo作成のテスト"""
        column = ColumnInfo(
            name="id",
            data_type="NUMBER",
            is_nullable=False,
            default_value="1",
            comment="Primary key"
        )
        
        assert column.name == "id"
        assert column.data_type == "NUMBER"
        assert column.is_nullable is False
        assert column.default_value == "1"
        assert column.comment == "Primary key"


class TestTableDetailInfo:
    """TableDetailInfoモデルのテスト"""
    
    def test_table_detail_info_creation(self):
        """TableDetailInfo作成のテスト"""
        table = TableInfo(
            name="test_table",
            schema_name="test_schema",
            table_type="TABLE"
        )
        columns = [
            ColumnInfo(name="id", data_type="NUMBER", is_nullable=False),
            ColumnInfo(name="name", data_type="VARCHAR", is_nullable=True)
        ]
        
        detail = TableDetailInfo(table=table, columns=columns)
        
        assert detail.table == table
        assert detail.columns == columns


class TestSchemaListResponse:
    """SchemaListResponseモデルのテスト"""
    
    def test_schema_list_response_creation(self):
        """SchemaListResponse作成のテスト"""
        schemas = [
            SchemaInfo(name="schema1", is_default=False),
            SchemaInfo(name="schema2", is_default=True)
        ]
        
        response = SchemaListResponse(schemas=schemas, total_count=2)
        
        assert response.schemas == schemas
        assert response.total_count == 2


class TestTableListResponse:
    """TableListResponseモデルのテスト"""
    
    def test_table_list_response_creation(self):
        """TableListResponse作成のテスト"""
        tables = [
            TableInfo(name="table1", schema_name="schema1", table_type="TABLE"),
            TableInfo(name="table2", schema_name="schema1", table_type="VIEW")
        ]
        
        response = TableListResponse(
            tables=tables,
            schema_name="schema1",
            total_count=2
        )
        
        assert response.tables == tables
        assert response.schema_name == "schema1"
        assert response.total_count == 2


class TestDownloadRequest:
    """DownloadRequestモデルのテスト"""
    
    def test_download_request_creation(self):
        """DownloadRequest作成のテスト"""
        request = DownloadRequest(
            sql="SELECT * FROM test_table",
            file_name="export.csv",
            format="csv"
        )
        
        assert request.sql == "SELECT * FROM test_table"
        assert request.file_name == "export.csv"
        assert request.format == "csv"
    
    def test_download_request_defaults(self):
        """DownloadRequestデフォルト値のテスト"""
        request = DownloadRequest(sql="SELECT * FROM test_table")
        
        assert request.sql == "SELECT * FROM test_table"
        assert request.file_name is None
        assert request.format == "csv"


class TestDownloadResponse:
    """DownloadResponseモデルのテスト"""
    
    def test_download_response_creation(self):
        """DownloadResponse作成のテスト"""
        response = DownloadResponse(
            task_id="task_123",
            status="pending",
            message="Task created",
            download_url="http://example.com/download"
        )
        
        assert response.task_id == "task_123"
        assert response.status == "pending"
        assert response.message == "Task created"
        assert response.download_url == "http://example.com/download"


class TestDownloadStatusResponse:
    """DownloadStatusResponseモデルのテスト"""
    
    def test_download_status_response_creation(self):
        """DownloadStatusResponse作成のテスト"""
        response = DownloadStatusResponse(
            task_id="task_123",
            status="processing",
            progress=50.0,
            total_rows=1000,
            processed_rows=500,
            download_url="http://example.com/download"
        )
        
        assert response.task_id == "task_123"
        assert response.status == "processing"
        assert response.progress == 50.0
        assert response.total_rows == 1000
        assert response.processed_rows == 500
        assert response.download_url == "http://example.com/download"
        assert response.error_message is None


class TestHealthCheckResponse:
    """HealthCheckResponseモデルのテスト"""
    
    def test_health_check_response_creation(self):
        """HealthCheckResponse作成のテスト"""
        response = HealthCheckResponse(
            status="healthy",
            timestamp=1234567890.0,
            version="1.0.0",
            connection_status={"connected": True, "pool_size": 5},
            performance_metrics={"response_time": 0.1}
        )
        
        assert response.status == "healthy"
        assert response.timestamp == 1234567890.0
        assert response.version == "1.0.0"
        assert response.connection_status == {"connected": True, "pool_size": 5}
        assert response.performance_metrics == {"response_time": 0.1}


class TestErrorResponse:
    """ErrorResponseモデルのテスト"""
    
    def test_error_response_creation(self):
        """ErrorResponse作成のテスト"""
        response = ErrorResponse(
            error="Database connection failed",
            detail="Connection timeout after 30 seconds",
            timestamp=1234567890.0
        )
        
        assert response.error == "Database connection failed"
        assert response.detail == "Connection timeout after 30 seconds"
        assert response.timestamp == 1234567890.0
    
    def test_error_response_default_timestamp(self):
        """ErrorResponseデフォルトタイムスタンプのテスト"""
        response = ErrorResponse(error="Test error")
        
        assert response.error == "Test error"
        assert response.detail is None
        assert isinstance(response.timestamp, float)


class TestPerformanceMetricsResponse:
    """PerformanceMetricsResponseモデルのテスト"""
    
    def test_performance_metrics_response_creation(self):
        """PerformanceMetricsResponse作成のテスト"""
        response = PerformanceMetricsResponse(
            timestamp=1234567890.0,
            metrics={
                "cpu_usage": 50.0,
                "memory_usage": 75.0,
                "active_connections": 5
            }
        )
        
        assert response.timestamp == 1234567890.0
        assert response.metrics == {
            "cpu_usage": 50.0,
            "memory_usage": 75.0,
            "active_connections": 5
        }


class TestExportRequest:
    """ExportRequestモデルのテスト"""
    
    def test_export_request_with_sql(self):
        """ExportRequest with SQLのテスト"""
        request = ExportRequest(
            sql="SELECT * FROM test_table",
            filename="export.csv",
            format="csv"
        )
        
        assert request.sql == "SELECT * FROM test_table"
        assert request.data == []
        assert request.columns is None
        assert request.filename == "export.csv"
        assert request.format == "csv"
    
    def test_export_request_with_data(self):
        """ExportRequest with dataのテスト"""
        data = [{"id": 1, "name": "test"}]
        columns = ["id", "name"]
        request = ExportRequest(
            data=data,
            columns=columns,
            filename="export.csv",
            format="csv"
        )
        
        assert request.sql is None
        assert request.data == data
        assert request.columns == columns
        assert request.filename == "export.csv"
        assert request.format == "csv"
    
    def test_export_request_defaults(self):
        """ExportRequestデフォルト値のテスト"""
        request = ExportRequest()
        
        assert request.sql is None
        assert request.data == []
        assert request.columns is None
        assert request.filename == "export"
        assert request.format == "csv"


class TestExportResponse:
    """ExportResponseモデルのテスト"""
    
    def test_export_response_success(self):
        """ExportResponse成功ケースのテスト"""
        response = ExportResponse(
            success=True,
            download_url="http://example.com/download/export.csv",
            filename="export.csv"
        )
        
        assert response.success is True
        assert response.download_url == "http://example.com/download/export.csv"
        assert response.filename == "export.csv"
        assert response.error_message is None
    
    def test_export_response_error(self):
        """ExportResponseエラーケースのテスト"""
        response = ExportResponse(
            success=False,
            error_message="Export failed"
        )
        
        assert response.success is False
        assert response.download_url is None
        assert response.filename is None
        assert response.error_message == "Export failed"


class TestExportHistoryResponse:
    """ExportHistoryResponseモデルのテスト"""
    
    def test_export_history_response_creation(self):
        """ExportHistoryResponse作成のテスト"""
        history = [
            {"id": 1, "filename": "export1.csv", "created_at": "2023-01-01"},
            {"id": 2, "filename": "export2.csv", "created_at": "2023-01-02"}
        ]
        
        response = ExportHistoryResponse(history=history)
        
        assert response.history == history


class TestWarehouseInfo:
    """WarehouseInfoモデルのテスト"""
    
    def test_warehouse_info_creation(self):
        """WarehouseInfo作成のテスト"""
        warehouse = WarehouseInfo(
            name="test_warehouse",
            size="SMALL",
            type="STANDARD",
            running=2,
            queued=1,
            is_default=True,
            is_current=True
        )
        
        assert warehouse.name == "test_warehouse"
        assert warehouse.size == "SMALL"
        assert warehouse.type == "STANDARD"
        assert warehouse.running == 2
        assert warehouse.queued == 1
        assert warehouse.is_default is True
        assert warehouse.is_current is True


class TestDatabaseInfo:
    """DatabaseInfoモデルのテスト"""
    
    def test_database_info_creation(self):
        """DatabaseInfo作成のテスト"""
        database = DatabaseInfo(
            name="test_database",
            created_on="2023-01-01",
            owner="test_user",
            comment="Test database",
            is_default=True,
            is_current=True
        )
        
        assert database.name == "test_database"
        assert database.created_on == "2023-01-01"
        assert database.owner == "test_user"
        assert database.comment == "Test database"
        assert database.is_default is True
        assert database.is_current is True


class TestConnectionStatusResponse:
    """ConnectionStatusResponseモデルのテスト"""
    
    def test_connection_status_response_creation(self):
        """ConnectionStatusResponse作成のテスト"""
        response = ConnectionStatusResponse(
            connected=True,
            details={
                "pool_size": 5,
                "active_connections": 3,
                "max_connections": 10
            }
        )
        
        assert response.connected is True
        assert response.details == {
            "pool_size": 5,
            "active_connections": 3,
            "max_connections": 10
        }


if __name__ == '__main__':
    pytest.main([__file__]) 