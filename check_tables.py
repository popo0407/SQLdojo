import sqlite3

conn = sqlite3.connect('cache_data.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'cache_hint%'")
tables = [row[0] for row in cursor.fetchall()]
print("cache_hintテーブル:", tables)

# 最新のテーブル名を確認
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name DESC LIMIT 5")
recent_tables = [row[0] for row in cursor.fetchall()]
print("最新テーブル:", recent_tables)

conn.close()
