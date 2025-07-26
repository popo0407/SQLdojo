import sqlite3

print("=== metadata_cache.db ===")
try:
    conn = sqlite3.connect('metadata_cache.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print('Tables:', [t[0] for t in tables])
    
    try:
        cursor.execute('PRAGMA table_info(user_templates)')
        columns = cursor.fetchall()
        print('user_templates columns:', columns)
    except Exception as e:
        print('user_templates table not found:', e)
    
    conn.close()
except Exception as e:
    print("Error:", e)

print("\n=== cache_data.db ===")
try:
    conn = sqlite3.connect('cache_data.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print('Tables:', [t[0] for t in tables])
    
    try:
        cursor.execute('PRAGMA table_info(user_templates)')
        columns = cursor.fetchall()
        print('user_templates columns:', columns)
    except Exception as e:
        print('user_templates table not found:', e)
    
    conn.close()
except Exception as e:
    print("Error:", e)
