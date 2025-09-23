#!/usr/bin/env python3
import sqlite3

conn = sqlite3.connect('cache_data.db')
cursor = conn.cursor()

# cache_dummyで始まるテーブルを検索
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'cache_dummy%'")
dummy_tables = cursor.fetchall()
print(f'Tables matching cache_dummy: {dummy_tables}')

# 全テーブルを表示
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
all_tables = cursor.fetchall()
print(f'All tables: {all_tables}')

# 特定のテーブルの存在確認
target_table = 'cache_dummy_20250923161157_000'
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (target_table,))
specific_table = cursor.fetchone()
print(f'Target table {target_table} exists: {specific_table is not None}')

conn.close()