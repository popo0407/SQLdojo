#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
統合管理機能のAPIテストスクリプト
"""
import requests
import json


class ApiTester:
    def __init__(self, base_url="http://localhost:8000/api/v1"):
        self.base_url = base_url
        self.session = requests.Session()
    
    def login(self, user_id):
        """ユーザーログイン"""
        url = f"{self.base_url}/login"
        data = {"user_id": user_id}
        response = self.session.post(url, json=data)
        print(f"Login {user_id}: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    
    def test_template_preferences(self):
        """テンプレート表示設定のテスト"""
        print("\n=== テンプレート表示設定テスト ===")
        
        # 取得テスト
        url = f"{self.base_url}/users/template-preferences"
        response = self.session.get(url)
        print(f"GET template-preferences: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Templates: {len(data.get('templates', []))}")
            for template in data.get('templates', []):
                print(f"  - {template.get('name')} (ID: {template.get('template_id')}, 表示: {template.get('is_visible')}, 順序: {template.get('display_order')})")
            return data
        else:
            print(f"Error: {response.text}")
            return None
    
    def test_part_preferences(self):
        """パーツ表示設定のテスト"""
        print("\n=== パーツ表示設定テスト ===")
        
        # 取得テスト
        url = f"{self.base_url}/users/part-preferences"
        response = self.session.get(url)
        print(f"GET part-preferences: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Parts: {len(data.get('parts', []))}")
            for part in data.get('parts', []):
                print(f"  - {part.get('name')} (ID: {part.get('part_id')}, 表示: {part.get('is_visible')}, 順序: {part.get('display_order')})")
            return data
        else:
            print(f"Error: {response.text}")
            return None
    
    def test_dropdown_templates(self):
        """ドロップダウン用テンプレート取得テスト"""
        print("\n=== ドロップダウン用テンプレートテスト ===")
        
        url = f"{self.base_url}/users/templates-for-dropdown"
        response = self.session.get(url)
        print(f"GET templates-for-dropdown: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Visible templates: {len(data)}")
            for template in data:
                print(f"  - {template.get('name')} (共通: {template.get('is_common', False)})")
            return data
        else:
            print(f"Error: {response.text}")
            return None
    
    def test_dropdown_parts(self):
        """ドロップダウン用パーツ取得テスト"""
        print("\n=== ドロップダウン用パーツテスト ===")
        
        url = f"{self.base_url}/users/parts-for-dropdown"
        response = self.session.get(url)
        print(f"GET parts-for-dropdown: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Visible parts: {len(data)}")
            for part in data:
                print(f"  - {part.get('name')} (共通: {part.get('is_common', False)})")
            return data
        else:
            print(f"Error: {response.text}")
            return None
    
    def test_update_template_preferences(self, templates_data):
        """テンプレート表示設定更新テスト"""
        print("\n=== テンプレート表示設定更新テスト ===")
        
        if not templates_data or not templates_data.get('templates'):
            print("更新するテンプレートデータがありません")
            return False
        
        # 表示順序を逆転させて更新テスト
        templates = templates_data['templates']
        preferences = []
        for i, template in enumerate(reversed(templates)):
            template_id = template.get("template_id")
            template_type = template.get("type")
            if template_id and template_type:
                preferences.append({
                    "template_id": template_id,
                    "template_type": template_type,
                    "display_order": i + 1,
                    "is_visible": not template["is_visible"]  # 表示設定も反転
                })
        
        if not preferences:
            print("有効なテンプレートIDが見つかりません")
            return False
        
        url = f"{self.base_url}/users/template-preferences"
        data = {"preferences": preferences}
        response = self.session.put(url, json=data)
        print(f"PUT template-preferences: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    
    def run_all_tests(self, user_id="hint0531"):
        """全テストを実行"""
        print(f"=== 統合管理機能APIテスト開始 (ユーザー: {user_id}) ===")
        
        # ログイン
        if not self.login(user_id):
            print("ログインに失敗しました")
            return False
        
        # 各機能のテスト
        templates_data = self.test_template_preferences()
        parts_data = self.test_part_preferences()
        self.test_dropdown_templates()
        self.test_dropdown_parts()
        
        # 更新テスト
        if templates_data:
            self.test_update_template_preferences(templates_data)
            # 更新後の状態確認
            print("\n=== 更新後の確認 ===")
            self.test_template_preferences()
            self.test_dropdown_templates()
        
        print("\n=== テスト完了 ===")
        return True


if __name__ == "__main__":
    tester = ApiTester()
    tester.run_all_tests()
