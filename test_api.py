import requests
import json

# API呼び出しテスト
try:
    response = requests.get('http://localhost:8001/api/master/station')
    print(f'Status: {response.status_code}')
    print(f'Response: {response.json()}')
except Exception as e:
    print(f'Error: {e}')