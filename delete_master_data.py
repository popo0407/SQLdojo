#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
metadata_cache.dbのmasterテーブルを削除するスクリプト
"""
import sqlite3
import os

def delete_master_tables():
    db_path = "metadata_cache.db"
    
    if not os.path.exists(db_path):
        print(f"データベースファイル '{db_path}' が見つかりません")
        return
    
    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            
            # マスターテーブル一覧
            master_tables = [
                'station_master',
                'measure_master', 
                'set_master',
                'free_master',
                'parts_master',
                'trouble_master'
            ]
            
            print("マスターテーブルのデータを削除中...")
            
            for table in master_tables:
                try:
                    # テーブル存在確認
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
                    if cursor.fetchone():
                        # データ削除（テーブル構造は保持）
                        cursor.execute(f"DELETE FROM {table}")
                        count = cursor.rowcount
                        print(f"  {table}: {count}件削除")
                    else:
                        print(f"  {table}: テーブルが存在しません")
                except Exception as e:
                    print(f"  {table}: エラー - {e}")
            
            conn.commit()
            print("マスターテーブルのデータ削除完了")
            
    except Exception as e:
        print(f"データベース操作エラー: {e}")

if __name__ == "__main__":
    delete_master_tables()