#!/usr/bin/env python
# -*- coding: utf-8 -*-
import requests
import json

def test_chart():
    # ダミーデータ生成でキャッシュにデータを作成
    print("=== ダミーデータ生成テスト ===")
    response = requests.post('http://localhost:8001/api/v1/sql/cache/dummy-data', json={
        'row_count': 20,
        'table_name': 'test_products'
    })
    print(f'ダミーデータ生成結果: {response.status_code}')
    if response.status_code != 200:
        print(f'エラー: {response.text}')
        return
    
    session_data = response.json()
    session_id = session_data.get('session_id')
    print(f'session_id: {session_id}')
    
    if not session_id:
        print('session_idが取得できませんでした')
        return
    
    # グラフ設定付きでExcelダウンロード
    print("\n=== Excelダウンロードテスト ===")
    chart_config = {
        'chartType': 'bar',
        'xColumn': 'name',
        'yColumns': ['price', 'quantity'],
        'title': 'Products Chart',
        'xAxisLabel': 'Product Name',
        'yAxisLabel': 'Value'
    }
    
    excel_response = requests.post('http://localhost:8001/api/v1/sql/cache/download/excel', 
        json={
        'session_id': session_id,
        'chart_config': chart_config
    })
    print(f'Excel出力結果: {excel_response.status_code}')
    print(f'Content-Type: {excel_response.headers.get("Content-Type")}')
    
    if excel_response.status_code == 200:
        print(f'ファイルサイズ: {len(excel_response.content)} bytes')
        
        # ファイルを保存してExcelで確認
        with open('test_chart_output.xlsx', 'wb') as f:
            f.write(excel_response.content)
        print('test_chart_output.xlsx として保存しました')
    else:
        print(f'エラー: {excel_response.text}')

if __name__ == "__main__":
    test_chart()