# -*- coding: utf-8 -*-
"""
統合テスト

複数のAPIを組み合わせたエンドツーエンドのテストシナリオ
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
import json
from app.dependencies import (
    get_sql_service, get_hybrid_sql_service, get_current_user,
    get_sql_log_service, get_metadata_service, get_export_service
)


class TestSQLExecutionWorkflow:
    """SQL実行ワークフローの統合テスト"""
    
    def test_complete_sql_execution_workflow(self, client: TestClient, mock_user):
        """完全なSQL実行ワークフロー（バリデーション→実行→ログ記録→エクスポート）"""
        # モックサービスの設定
        mock_sql_service = Mock()
        mock_hybrid_service = Mock()
        mock_log_service = Mock()
        mock_export_service = Mock()
        
        # 1. SQLバリデーション成功
        mock_sql_service.validate_sql.return_value = Mock(
            is_valid=True,
            errors=[],
            warnings=["SELECT * は推奨されません"],
            suggestions=["具体的なカラム名を指定してください"]
        )
        
        # 2. SQL実行成功
        mock_hybrid_service.execute_sql_with_cache.return_value = {
            "success": True,
            "session_id": "test_session_123",
            "total_count": 100,
            "processed_rows": 100,
            "execution_time": 0.5,
            "message": "SQL実行が完了しました"
        }
        
        # 3. キャッシュデータ取得成功
        mock_hybrid_service.get_cached_data.return_value = {
            "success": True,
            "data": [["value1", "value2"], ["value3", "value4"]],
            "columns": ["column1", "column2"],
            "total_count": 2,
            "page": 1,
            "page_size": 10,
            "total_pages": 1,
            "session_info": {"session_id": "test_session_123"},
            "execution_time": 0.1
        }
        
        # 4. CSVエクスポート成功
        mock_export_service.export_to_csv_stream.return_value = iter([
            b"column1,column2\n",
            b"value1,value2\n",
            b"value3,value4\n"
        ])
        
        app = client.app
        app.dependency_overrides[get_sql_service] = lambda: mock_sql_service
        app.dependency_overrides[get_hybrid_sql_service] = lambda: mock_hybrid_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_sql_log_service] = lambda: mock_log_service
        app.dependency_overrides[get_export_service] = lambda: mock_export_service
        
        try:
            sql_query = "SELECT * FROM test_table"
            
            # 1. SQLバリデーション
            validate_response = client.post(
                "/api/v1/sql/validate",
                json={"sql": sql_query}
            )
            assert validate_response.status_code == 200
            validate_data = validate_response.json()
            assert validate_data["is_valid"] is True
            
            # 2. キャッシュSQL実行
            execute_response = client.post(
                "/api/v1/sql/cache/execute",
                json={"sql": sql_query, "limit": 10000}
            )
            assert execute_response.status_code == 200
            execute_data = execute_response.json()
            assert execute_data["success"] is True
            session_id = execute_data["session_id"]
            
            # 3. キャッシュデータ読み込み
            read_response = client.post(
                "/api/v1/sql/cache/read",
                json={"session_id": session_id, "page": 1, "page_size": 10}
            )
            assert read_response.status_code == 200
            read_data = read_response.json()
            assert read_data["success"] is True
            assert len(read_data["data"]) == 2
            
            # 4. CSVエクスポート
            export_response = client.post(
                "/api/v1/export",
                json={"sql": sql_query, "format": "csv"}
            )
            assert export_response.status_code == 200
            assert "text/csv" in export_response.headers["content-type"]
            
        finally:
            app.dependency_overrides.clear()
    
    def test_sql_execution_with_error_handling(self, client: TestClient, mock_user):
        """エラーハンドリングを含むSQL実行のテスト"""
        mock_sql_service = Mock()
        mock_hybrid_service = Mock()
        
        # SQLバリデーションでエラー
        mock_sql_service.validate_sql.return_value = Mock(
            is_valid=False,
            errors=["FROM句が必要です"],
            warnings=[],
            suggestions=["FROM table_name を追加してください"]
        )
        
        # SQL実行でもエラー
        mock_hybrid_service.execute_sql_with_cache.side_effect = Exception("テーブルが見つかりません")
        
        app = client.app
        app.dependency_overrides[get_sql_service] = lambda: mock_sql_service
        app.dependency_overrides[get_hybrid_sql_service] = lambda: mock_hybrid_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_sql_log_service] = lambda: Mock()
        
        try:
            invalid_sql = "SELECT *"
            
            # 1. SQLバリデーション（エラー）
            validate_response = client.post(
                "/api/v1/sql/validate",
                json={"sql": invalid_sql}
            )
            assert validate_response.status_code == 200
            validate_data = validate_response.json()
            assert validate_data["is_valid"] is False
            assert "FROM句が必要です" in validate_data["errors"]
            
            # 2. SQL実行（エラー）
            execute_response = client.post(
                "/api/v1/sql/cache/execute",
                json={"sql": "SELECT * FROM non_existent_table"}
            )
            assert execute_response.status_code == 400
            assert "テーブルが見つかりません" in execute_response.json()["detail"]
            
        finally:
            app.dependency_overrides.clear()


class TestMetadataWorkflow:
    """メタデータ取得ワークフローの統合テスト"""
    
    def test_complete_metadata_workflow(self, client: TestClient, mock_user):
        """完全なメタデータ取得ワークフロー（スキーマ→テーブル→カラム）"""
        mock_metadata_service = Mock()
        
        # スキーマ取得
        mock_metadata_service.get_schemas.return_value = [
            {"name": "PUBLIC", "created_on": "2025-01-17T00:00:00", "is_default": True},
            {"name": "ANALYTICS", "created_on": "2025-01-17T00:00:00", "is_default": False}
        ]
        
        # テーブル取得
        mock_metadata_service.get_tables.return_value = [
            {"name": "customers", "schema_name": "PUBLIC", "table_type": "BASE TABLE"},
            {"name": "orders", "schema_name": "PUBLIC", "table_type": "BASE TABLE"},
            {"name": "customer_view", "schema_name": "PUBLIC", "table_type": "VIEW"}
        ]
        
        # カラム取得
        mock_metadata_service.get_columns.return_value = [
            {"name": "customer_id", "data_type": "INTEGER", "is_nullable": False, "comment": "主キー"},
            {"name": "customer_name", "data_type": "VARCHAR", "is_nullable": True, "comment": "顧客名"},
            {"name": "email", "data_type": "VARCHAR", "is_nullable": True, "comment": "メールアドレス"}
        ]
        
        app = client.app
        app.dependency_overrides[get_metadata_service] = lambda: mock_metadata_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        # 他の必要な依存関係もモック
        from app.dependencies import get_visibility_control_service, get_user_preference_service
        app.dependency_overrides[get_visibility_control_service] = lambda: Mock()
        app.dependency_overrides[get_user_preference_service] = lambda: Mock()
        
        try:
            # 1. スキーマ一覧取得
            schema_response = client.get("/api/v1/metadata/schemas")
            assert schema_response.status_code == 200
            schema_data = schema_response.json()
            assert len(schema_data["schemas"]) == 2
            assert schema_data["schemas"][0]["name"] == "PUBLIC"
            
            # 2. テーブル一覧取得
            table_response = client.get("/api/v1/metadata/tables?schema_name=PUBLIC")
            assert table_response.status_code == 200
            table_data = table_response.json()
            assert len(table_data["tables"]) == 3
            assert any(table["name"] == "customers" for table in table_data["tables"])
            
            # 3. カラム一覧取得
            column_response = client.get("/api/v1/metadata/columns?schema_name=PUBLIC&table_name=customers")
            assert column_response.status_code == 200
            column_data = column_response.json()
            assert len(column_data["columns"]) == 3
            assert column_data["columns"][0]["name"] == "customer_id"
            assert column_data["columns"][0]["is_nullable"] is False
            
        finally:
            app.dependency_overrides.clear()


class TestCacheWorkflow:
    """キャッシュ機能のワークフローテスト"""
    
    def test_cache_pagination_and_filtering_workflow(self, client: TestClient, mock_user):
        """キャッシュのページング・フィルタリングワークフロー"""
        mock_hybrid_service = Mock()
        
        # SQL実行（キャッシュ作成）
        mock_hybrid_service.execute_sql_with_cache.return_value = {
            "success": True,
            "session_id": "test_session_123",
            "total_count": 1000,
            "processed_rows": 1000,
            "execution_time": 2.0,
            "message": "SQL実行が完了しました"
        }
        
        # ページング・フィルタリング結果
        def mock_get_cached_data(session_id, page, page_size, filters=None, sort_by=None, sort_order="ASC"):
            # フィルタ適用の模擬
            if filters and "status" in filters:
                data = [["1", "active", "User1"], ["3", "active", "User3"]]
                total_count = 2
            else:
                # ページに応じたデータ
                start = (page - 1) * page_size
                data = [[str(i), "active", f"User{i}"] for i in range(start + 1, min(start + page_size + 1, 101))]
                total_count = 100
            
            return {
                "success": True,
                "data": data,
                "columns": ["id", "status", "name"],
                "total_count": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": (total_count + page_size - 1) // page_size,
                "session_info": {"session_id": session_id},
                "execution_time": 0.1
            }
        
        mock_hybrid_service.get_cached_data.side_effect = mock_get_cached_data
        
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service] = lambda: mock_hybrid_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_sql_log_service] = lambda: Mock()
        
        try:
            # 1. SQL実行してキャッシュ作成
            execute_response = client.post(
                "/api/v1/sql/cache/execute",
                json={"sql": "SELECT * FROM users", "limit": None}
            )
            assert execute_response.status_code == 200
            session_id = execute_response.json()["session_id"]
            
            # 2. 最初のページを取得
            page1_response = client.post(
                "/api/v1/sql/cache/read",
                json={"session_id": session_id, "page": 1, "page_size": 10}
            )
            assert page1_response.status_code == 200
            page1_data = page1_response.json()
            assert len(page1_data["data"]) == 10
            assert page1_data["total_count"] == 100
            
            # 3. 2ページ目を取得
            page2_response = client.post(
                "/api/v1/sql/cache/read",
                json={"session_id": session_id, "page": 2, "page_size": 10}
            )
            assert page2_response.status_code == 200
            page2_data = page2_response.json()
            assert len(page2_data["data"]) == 10
            assert page2_data["data"][0][0] == "11"  # 11番目のレコード
            
            # 4. フィルタ適用
            filtered_response = client.post(
                "/api/v1/sql/cache/read",
                json={
                    "session_id": session_id,
                    "page": 1,
                    "page_size": 10,
                    "filters": {"status": ["active"]}
                }
            )
            assert filtered_response.status_code == 200
            filtered_data = filtered_response.json()
            assert len(filtered_data["data"]) == 2
            assert filtered_data["total_count"] == 2
            assert all(row[1] == "active" for row in filtered_data["data"])
            
        finally:
            app.dependency_overrides.clear()


class TestUserSessionWorkflow:
    """ユーザーセッション管理のワークフローテスト"""
    
    def test_user_login_to_sql_execution_workflow(self, client: TestClient):
        """ユーザーログインからSQL実行までのワークフロー"""
        mock_user_service = Mock()
        mock_hybrid_service = Mock()
        mock_log_service = Mock()
        
        # ログイン成功
        mock_user_service.authenticate_user.return_value = {
            "success": True,
            "user_id": "workflow_user",
            "user_name": "Workflow Test User"
        }
        
        # SQL実行成功
        mock_hybrid_service.execute_sql_with_cache.return_value = {
            "success": True,
            "session_id": "workflow_session_123",
            "total_count": 50,
            "processed_rows": 50,
            "execution_time": 1.0,
            "message": "SQL実行が完了しました"
        }
        
        # ログ取得
        mock_log_service.get_logs.return_value = {
            "logs": [
                {
                    "log_id": 1,
                    "user_id": "workflow_user",
                    "sql": "SELECT * FROM test_table",
                    "execution_time": 1.0,
                    "row_count": 50,
                    "success": True,
                    "error_message": None,
                    "timestamp": "2025-01-17T10:00:00"
                }
            ],
            "total_count": 1
        }
        
        app = client.app
        from app.dependencies import get_user_service
        app.dependency_overrides[get_user_service] = lambda: mock_user_service
        app.dependency_overrides[get_hybrid_sql_service] = lambda: mock_hybrid_service
        app.dependency_overrides[get_sql_log_service] = lambda: mock_log_service
        
        try:
            # 1. ユーザーログイン
            login_response = client.post(
                "/api/v1/login",
                json={"user_id": "workflow_user"}
            )
            assert login_response.status_code == 200
            login_data = login_response.json()
            assert login_data["success"] is True
            assert login_data["user_id"] == "workflow_user"
            
            # 2. SQL実行（認証済み）
            # セッションを設定
            with client as c:
                with c.session_transaction() as sess:
                    sess["user_id"] = "workflow_user"
                    sess["user_name"] = "Workflow Test User"
                
                execute_response = c.post(
                    "/api/v1/sql/cache/execute",
                    json={"sql": "SELECT * FROM test_table"}
                )
                assert execute_response.status_code == 200
                execute_data = execute_response.json()
                assert execute_data["success"] is True
                
                # 3. 実行ログ確認
                log_response = c.get("/api/v1/logs/sql")
                assert log_response.status_code == 200
                log_data = log_response.json()
                assert len(log_data["logs"]) == 1
                assert log_data["logs"][0]["user_id"] == "workflow_user"
                assert log_data["logs"][0]["success"] is True
            
        finally:
            app.dependency_overrides.clear()


class TestErrorRecoveryWorkflow:
    """エラー回復のワークフローテスト"""
    
    def test_connection_error_recovery_workflow(self, client: TestClient, mock_user):
        """接続エラーからの回復テスト"""
        mock_sql_service = Mock()
        
        # 最初は接続エラー
        mock_sql_service.get_connection_status.return_value = {
            "is_connected": False,
            "error": "データベース接続エラー"
        }
        
        app = client.app
        app.dependency_overrides[get_sql_service] = lambda: mock_sql_service
        from app.dependencies import get_performance_service
        app.dependency_overrides[get_performance_service] = lambda: Mock(get_metrics=Mock(return_value={}))
        
        try:
            # 1. ヘルスチェック（接続エラー状態）
            health_response = client.get("/api/v1/health")
            assert health_response.status_code == 200
            health_data = health_response.json()
            assert health_data["connection_status"]["is_connected"] is False
            
            # 2. 接続状態チェック
            connection_response = client.get("/api/v1/connection/status")
            assert connection_response.status_code == 200
            connection_data = connection_response.json()
            assert connection_data["connected"] is False
            
            # 3. 接続回復をシミュレート
            mock_sql_service.get_connection_status.return_value = {
                "is_connected": True,
                "connection_type": "snowflake",
                "database": "test_db"
            }
            
            # 4. 再度ヘルスチェック（回復後）
            health_response_recovered = client.get("/api/v1/health")
            assert health_response_recovered.status_code == 200
            health_data_recovered = health_response_recovered.json()
            assert health_data_recovered["connection_status"]["is_connected"] is True
            
        finally:
            app.dependency_overrides.clear()
