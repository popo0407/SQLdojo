import sqlite3

def check_master_tables():
    try:
        conn = sqlite3.connect('metadata_cache.db')
        cursor = conn.cursor()
        
        # マスターテーブル一覧を取得
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_MASTER'")
        tables = cursor.fetchall()
        
        print('マスターテーブル一覧:')
        for table in tables:
            table_name = table[0]
            print(f'  {table_name}')
            try:
                cursor.execute(f'SELECT COUNT(*) FROM {table_name}')
                count = cursor.fetchone()[0]
                print(f'    レコード数: {count}')
                
                # 最初の3件のデータを表示
                cursor.execute(f'SELECT * FROM {table_name} LIMIT 3')
                rows = cursor.fetchall()
                if rows:
                    print(f'    サンプルデータ: {len(rows)}件')
                    for i, row in enumerate(rows):
                        print(f'      {i+1}: {row}')
                else:
                    print(f'    データなし')
            except Exception as e:
                print(f'    エラー: {e}')
        
        conn.close()
        
    except Exception as e:
        print(f'データベース接続エラー: {e}')

if __name__ == "__main__":
    check_master_tables()