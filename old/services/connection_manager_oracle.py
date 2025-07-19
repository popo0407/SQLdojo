# app/services/connection_manager_oracle.py

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Tuple, Any
import threading
import pyodbc
from app.config_simplified import get_settings
from app.logger import get_logger
from app.exceptions import DatabaseError as AppDatabaseError

@dataclass
class ConnectionInfo:
    connection_id: str
    created_at: datetime
    last_used: datetime
    is_active: bool = True
    query_count: int = 0

class ConnectionManagerOracle:
    def __init__(self, config=None):
        self.config = config or get_settings()
        self.logger = get_logger(__name__)
        self._connections: Dict[str, pyodbc.Connection] = {}
        self._connection_info: Dict[str, ConnectionInfo] = {}
        self._lock = threading.Lock()
        self._max_connections = 5
        self._connection_timeout = 30

    def _create_connection(self) -> Tuple[str, pyodbc.Connection]:
        try:
            user = self.config.oracle_user
            password = self.config.oracle_password
            dsn = self.config.oracle_dsn
            conn_str = ""

            if dsn:
                if not all([user, password]):
                    raise AppDatabaseError("OracleのDSN接続には、USERとPASSWORDも.envファイルに必要です。")
                conn_str = f"DSN={dsn};UID={user};PWD={password}"
                self.logger.info(f"OracleにDSN方式で接続します: DSN={dsn};UID={user}")
            else:
                driver = self.config.oracle_driver
                host = self.config.oracle_host
                port = self.config.oracle_port
                # service_name の代わりに sid を取得
                sid = self.config.oracle_sid 
                user = self.config.oracle_user
                password = self.config.oracle_password

                if not all([driver, host, port, sid, user, password]):
                    raise AppDatabaseError("OracleのDSN-less接続には、DRIVER, HOST, PORT, SID, USER, PASSWORDが.envファイルに必要です。")
                
                # 接続文字列を SID を使う形式に変更
                tns_entry = f"(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST={host})(PORT={port}))(CONNECT_DATA=(SID={sid})))"
                conn_str = f"DRIVER={{{driver}}};UID={user};PWD={password};DBQ={tns_entry}"

                self.logger.info(f"OracleにDSN-less方式(SID)で接続します（パスワード除く）: DRIVER={driver};DBQ={tns_entry};UID={user}")

            connection = pyodbc.connect(conn_str, timeout=self._connection_timeout, autocommit=True)
            connection_id = f"conn_oracle_{len(self._connections)}_{int(datetime.now().timestamp())}"
            return connection_id, connection
        except Exception as e:
            self.logger.error(f"Oracle(ODBC)への接続に失敗しました: {e}")
            raise AppDatabaseError(f"Oracle(ODBC)接続の作成に失敗しました: {str(e)}")

    def get_connection(self) -> Tuple[str, pyodbc.Connection]:
        with self._lock:
            for conn_id, info in self._connection_info.items():
                if info.is_active:
                    info.last_used = datetime.now()
                    info.query_count += 1
                    return conn_id, self._connections[conn_id]
            if len(self._connections) < self._max_connections:
                conn_id, connection = self._create_connection()
                self._connections[conn_id] = connection
                self._connection_info[conn_id] = ConnectionInfo(
                    connection_id=conn_id, created_at=datetime.now(), last_used=datetime.now(), query_count=1
                )
                return conn_id, connection
            raise AppDatabaseError("Oracle接続プールが上限に達しました。")

    def release_connection(self, connection_id: str):
        with self._lock:
            if connection_id in self._connection_info:
                self._connection_info[connection_id].last_used = datetime.now()

    def close_all_connections(self):
        with self._lock:
            for conn_id in list(self._connections.keys()):
                try:
                    self._connections[conn_id].close()
                except Exception as e:
                    self.logger.error(f"Oracle接続クローズエラー: {e}")
            self._connections.clear()
            self._connection_info.clear()