import sqlite3

# データベース接続
conn = sqlite3.connect('metadata_cache.db')
cursor = conn.cursor()

# テーブル名確認
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%station%'")
tables = cursor.fetchall()
print('STATIONテーブル:', tables)

# station_masterのカラム構造確認
cursor.execute("PRAGMA table_info(station_master)")
columns = cursor.fetchall()
print('station_masterカラム:', columns)

# データ件数確認
cursor.execute("SELECT COUNT(*) FROM station_master")
count = cursor.fetchone()
print('station_master件数:', count)

# サンプルデータ確認
cursor.execute("SELECT * FROM station_master LIMIT 3")
samples = cursor.fetchall()
print('サンプルデータ:', samples)

conn.close()