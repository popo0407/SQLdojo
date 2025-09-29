import sqlite3

conn = sqlite3.connect('metadata_cache.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print('All tables:', tables)

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%master%'")
master_tables = cursor.fetchall()
print('Master tables:', master_tables)

conn.close()