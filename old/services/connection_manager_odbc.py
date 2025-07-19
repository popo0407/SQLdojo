from dataclasses import dataclass
from datetime import datetime, timedelta
import threading
import os
import time
from typing import Dict, Tuple, Any, List

import pyodbc

from app.config_simplified import get_settings
from app.logger import get_logger
from app.exceptions import DatabaseError as AppDatabaseError


@dataclass
class ConnectionInfo:
    """接続情報"""
    connection_id: str
    created_at: datetime
    last_used: datetime
    is_active: bool = True
    query_count: int = 0


class ConnectionManagerODBC:
    """Snowflake ODBC接続管理クラス（キーペア認証対応）"""
    
    def __init__(self, config=None):
        self.config = config or get_settings()
        self.logger = get_logger(__name__)
        self._connections: Dict[str, pyodbc.Connection] = {}
        self._connection_info: Dict[str, ConnectionInfo] = {}
        self._lock = threading.Lock()
        self._max_connections = 10
        self._connection_timeout = 30
        self._monitor_thread = None
        self._stop_monitoring = False
        
        # ODBCドライバーの確認
        self._check_odbc_driver()
        
        self._start_monitoring()
    
    def _check_odbc_driver(self):
        """ODBCドライバーの確認"""
        try:
            drivers = pyodbc.drivers()
            snowflake_drivers = [d for d in drivers if 'snowflake' in d.lower()]
            if not snowflake_drivers:
                self.logger.warning("Snowflake ODBCドライバーが見つかりません。利用可能なドライバー: %s", drivers)
            else:
                self.logger.info("Snowflake ODBCドライバーが見つかりました: %s", snowflake_drivers)
        except Exception as e:
            self.logger.error("ODBCドライバーの確認中にエラー: %s", e)
    
    def _start_monitoring(self):
        """接続プールの監視を開始"""
        def monitor():
            while not self._stop_monitoring:
                try:
                    self._cleanup_inactive_connections()
                    time.sleep(60)  # 1分ごとにチェック
                except Exception as e:
                    self.logger.error(f"接続プール監視エラー: {e}")
        
        self._monitor_thread = threading.Thread(target=monitor, daemon=True)
        self._monitor_thread.start()
    
    def _cleanup_inactive_connections(self):
        """非アクティブな接続をクリーンアップ"""
        with self._lock:
            current_time = datetime.now()
            inactive_connections = []
            
            for conn_id, info in self._connection_info.items():
                # 30分以上使用されていない接続を削除
                if (current_time - info.last_used) > timedelta(minutes=30):
                    inactive_connections.append(conn_id)
            
            for conn_id in inactive_connections:
                self._close_connection(conn_id)
    
    def _create_connection(self) -> Tuple[str, pyodbc.Connection]:
        """新しいODBC接続を作成（キーペア認証対応）"""
        try:
            # DSNまたは接続文字列を利用
            dsn = getattr(self.config, 'snowflake_odbc_dsn', None)
            use_keypair = getattr(self.config, 'snowflake_use_keypair', True)
            
            # キーペア認証（JWT）の場合
            private_key_path = os.path.normpath(self.config.snowflake_private_key_path)
            passphrase = self.config.snowflake_private_key_passphrase
            
            # ファイルの存在確認
            if not os.path.exists(private_key_path):
                raise FileNotFoundError(f"秘密鍵ファイルが見つかりません: {private_key_path}")
            
            # アカウント識別子の形式を修正
            # ODBCドライバーでは.snowflakecomputing.comが必要
            account = self.config.snowflake_account
            if not account.endswith('.snowflakecomputing.com'):
                account = f"{account}.snowflakecomputing.com"
            
            # Snowflake ODBCドライバーでキーペア認証を使用
            # PRIV_KEY_FILEで秘密鍵ファイルのパスを指定
            conn_str = (
                f"DRIVER={{SnowflakeDSIIDriver}};"
                f"SERVER={account};"
                f"UID={self.config.snowflake_user};"
                f"AUTHENTICATOR=SNOWFLAKE_JWT;"
                f"PRIV_KEY_FILE={private_key_path};"
                f"PRIV_KEY_FILE_PWD={passphrase};"
                f"WAREHOUSE={self.config.snowflake_warehouse};"
                f"DATABASE={self.config.snowflake_database};"
                f"SCHEMA={self.config.snowflake_schema};"
                f"ROLE={self.config.snowflake_role};"
            )
            
            # プロキシ設定が有効な場合のみ追加
            proxy_host = getattr(self.config, 'SNOWFLAKE_PROXY_HOST', '')
            proxy_port = getattr(self.config, 'SNOWFLAKE_PROXY_PORT', '')
            if proxy_host and proxy_port:
                conn_str += f"PROXY={proxy_host}:{proxy_port};"

            # デバッグ用：接続文字列をログに出力（パスワードは隠す）
            debug_conn_str = conn_str.replace(f"PRIV_KEY_FILE_PWD={passphrase};", "PRIV_KEY_FILE_PWD=***;") if use_keypair else conn_str.replace(f"PWD={password};", "PWD=***;")
            self.logger.info(f"ODBC接続文字列: {debug_conn_str}")
            
            connection = pyodbc.connect(conn_str, timeout=self._connection_timeout, autocommit=True)
            
            connection_id = f"conn_odbc_{len(self._connections)}_{int(datetime.now().timestamp())}"
            return connection_id, connection
        except Exception as e:
            self.logger.error(f"Snowflake(ODBC)への接続に失敗しました: {e}")
            raise AppDatabaseError(f"Snowflake(ODBC)接続の作成に失敗しました: {str(e)}")
    
    def _close_connection(self, connection_id: str):
        """接続を閉じる"""
        try:
            if connection_id in self._connections:
                connection = self._connections[connection_id]
                connection.close()
                del self._connections[connection_id]
                del self._connection_info[connection_id]
        except Exception as e:
            self.logger.error(f"接続クローズエラー: {e}")
    
    def get_connection(self) -> Tuple[str, pyodbc.Connection]:
        """接続を取得（プールから取得または新規作成）"""
        with self._lock:
            # 既存のアクティブな接続を探す
            for conn_id, info in self._connection_info.items():
                if info.is_active:
                    info.last_used = datetime.now()
                    info.query_count += 1
                    return conn_id, self._connections[conn_id]
            
            # 新しい接続を作成
            if len(self._connections) < self._max_connections:
                conn_id, connection = self._create_connection()
                self._connections[conn_id] = connection
                self._connection_info[conn_id] = ConnectionInfo(
                    connection_id=conn_id,
                    created_at=datetime.now(),
                    last_used=datetime.now(),
                    query_count=1
                )
                return conn_id, connection
            
            # 接続数が上限に達している場合、最も古い接続を再利用
            oldest_conn_id = min(
                self._connection_info.keys(),
                key=lambda x: self._connection_info[x].last_used
            )
            info = self._connection_info[oldest_conn_id]
            info.last_used = datetime.now()
            info.query_count += 1
            return oldest_conn_id, self._connections[oldest_conn_id]
    
    def release_connection(self, connection_id: str):
        """接続をプールに返す"""
        with self._lock:
            if connection_id in self._connection_info:
                self._connection_info[connection_id].last_used = datetime.now()
    
    def test_connection(self) -> bool:
        """接続テスト"""
        try:
            conn_id, connection = self.get_connection()
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            cursor.close()
            self.release_connection(conn_id)
            return result[0] == 1
        except Exception as e:
            self.logger.error(f"ODBC接続テストエラー: {e}")
            return False
    
    def execute_query(self, sql: str, params: tuple = None) -> List[Dict[str, Any]]:
        """SQLクエリを実行して結果を辞書のリストで返す"""
        conn_id = None
        try:
            conn_id, connection = self.get_connection()
            cursor = connection.cursor()
            
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            
            # カラム名を取得
            columns = [column[0] for column in cursor.description]
            
            # 結果を辞書のリストに変換
            results = []
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            
            cursor.close()
            return results
        except Exception as e:
            self.logger.error(f"SQL実行エラー: {e}")
            raise
        finally:
            if conn_id:
                self.release_connection(conn_id)
    
    def get_pool_status(self) -> Dict[str, Any]:
        """接続プールの状態を取得"""
        with self._lock:
            return {
                'total_connections': len(self._connections),
                'max_connections': self._max_connections,
                'active_connections': sum(1 for info in self._connection_info.values() if info.is_active),
                'connection_details': [
                    {
                        'id': info.connection_id,
                        'created_at': info.created_at.isoformat(),
                        'last_used': info.last_used.isoformat(),
                        'query_count': info.query_count,
                        'is_active': info.is_active
                    }
                    for info in self._connection_info.values()
                ]
            }
    
    def close_all_connections(self):
        """全ての接続を閉じる"""
        with self._lock:
            for conn_id in list(self._connections.keys()):
                self._close_connection(conn_id)
        
        # 監視を停止
        self._stop_monitoring = True
        if self._monitor_thread and self._monitor_thread.is_alive():
            self._monitor_thread.join(timeout=5) 