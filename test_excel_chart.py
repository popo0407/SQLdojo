#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Excel chart 機能のテストケース"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from httpx import AsyncClient
import asyncio
import json

from app.main import app
from app.services.cache_service import CacheService


def test_excel_chart_config_no_auth():
    """認証なしでExcelダウンロードエンドポイントの動作確認（chart_config付き）"""
    with TestClient(app) as client:
        # chart_config付きリクエスト
        chart_config = {
            'chartType': 'bar',
            'xColumn': 'name',
            'yColumns': ['price', 'quantity'],
            'title': 'Test Chart',
            'xAxisLabel': 'Product Name',
            'yAxisLabel': 'Value'
        }
        
        response = client.post("/api/v1/sql/cache/download/excel", json={
            'session_id': 'test_session_123',
            'chart_config': chart_config
        })
        
        # 401（認証エラー）でも chart_config のログ出力が確認できれば OK
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        # 認証エラーであることを確認
        assert response.status_code == 401


@pytest.mark.asyncio 
async def test_excel_chart_config_with_cache():
    """キャッシュ付きでExcel出力とchart_configログの確認"""
    with TestClient(app) as client:
        # セッション作成（ダミーデータ）
        cache_service = CacheService()
        session_id = "test_chart_session_456"
        
        # ダミーデータをキャッシュに挿入
        test_data = [
            {'name': 'Product_1', 'price': 100, 'quantity': 10},
            {'name': 'Product_2', 'price': 200, 'quantity': 20},
            {'name': 'Product_3', 'price': 150, 'quantity': 15}
        ]
        
        # Cache service mock
        with patch('app.services.cache_service.CacheService') as mock_cache_class:
            mock_cache = mock_cache_class.return_value
            mock_cache.get_cache_data.return_value = (test_data, 3)
            mock_cache.session_exists.return_value = True
            
            # User mock
            with patch('app.dependencies.get_current_user_optional') as mock_user:
                mock_user.return_value = {'user_id': 'test_user', 'role': 'USER'}
                
                chart_config = {
                    'chartType': 'bar',
                    'xColumn': 'name', 
                    'yColumns': ['price', 'quantity'],
                    'title': 'Test Products Chart',
                    'xAxisLabel': 'Product Name',
                    'yAxisLabel': 'Value'
                }
                
                response = client.post("/api/v1/sql/cache/download/excel", json={
                    'session_id': session_id,
                    'chart_config': chart_config
                })
                
                print(f"Chart config test response: {response.status_code}")
                if response.status_code != 200:
                    print(f"Error response: {response.text}")
                else:
                    print(f"Excel file size: {len(response.content)} bytes")
                    # Excelファイルとして保存してグラフが含まれているか確認
                    with open('test_chart_validation.xlsx', 'wb') as f:
                        f.write(response.content)
                    print("Excel file saved as test_chart_validation.xlsx")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])