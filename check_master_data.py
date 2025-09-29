import sqlite3

conn = sqlite3.connect('metadata_cache.db')
cursor = conn.cursor()

master_tables = [
    'station_master',
    'measure_master', 
    'set_master',
    'free_master',
    'parts_master',
    'trouble_master'
]

print("Master Data Record Counts:")
print("=" * 30)

for table in master_tables:
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    count = cursor.fetchone()[0]
    print(f"{table:15}: {count:4} records")

conn.close()