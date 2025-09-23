#!/usr/bin/env python3
import sqlite3

conn = sqlite3.connect('cache_data.db')
cursor = conn.cursor()

# cache_sessionsテーブルの内容を確認
cursor.execute("SELECT session_id, created_at, last_access, user_id FROM cache_sessions ORDER BY last_access DESC LIMIT 10")
sessions = cursor.fetchall()
print("Recent cache sessions:")
for session in sessions:
    print(f"  {session}")

# 最新のセッションのテーブル内容を確認
if sessions:
    latest_session_id = sessions[0][0]
    print(f"\nChecking data in latest session: {latest_session_id}")
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {latest_session_id}")
        count = cursor.fetchone()[0]
        print(f"  Row count: {count}")
        
        cursor.execute(f"PRAGMA table_info({latest_session_id})")
        columns = cursor.fetchall()
        print(f"  Columns: {[col[1] for col in columns]}")
        
        if count > 0:
            cursor.execute(f"SELECT * FROM {latest_session_id} LIMIT 3")
            sample_data = cursor.fetchall()
            print(f"  Sample data: {sample_data}")
    except Exception as e:
        print(f"  Error: {e}")

conn.close()