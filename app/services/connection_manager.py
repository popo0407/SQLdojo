# -*- coding: utf-8 -*-
"""
接続管理モジュール（キーペア認証専用）
"""
import time
from typing import Dict, Any, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import threading
import os

import snowflake.connector
from snowflake.connector.errors import ProgrammingError, DatabaseError, OperationalError
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

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


class ConnectionManager:
    """Snowflake接続管理クラス（キーペア認証専用）"""
    
    def __init__(self, config=None):
        self.config = config or get_settings()
        self.logger = get_logger(__name__)
        self._connections: Dict[str, snowflake.connector.SnowflakeConnection] = {}
        self._connection_info: Dict[str, ConnectionInfo] = {}
        self._lock = threading.Lock()
        self._max_connections = 10  # 固定値に簡素化
        self._connection_timeout = 30  # 固定値に簡素化
        
        # 接続プールの監視
        self._monitor_thread = None
        self._stop_monitoring = False
        self._start_monitoring()
    
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
    
    def _create_connection(self) -> Tuple[str, snowflake.connector.SnowflakeConnection]:
        """新しい接続を作成（キーペア認証のみ）"""
        try:
            private_key_path = self.config.snowflake_private_key_path
            passphrase = self.config.snowflake_private_key_passphrase
            with open(private_key_path, "rb") as key_file:
                p_key = serialization.load_pem_private_key(
                    key_file.read(),
                    password=passphrase.encode(),
                    backend=default_backend()
                )
            pkb = p_key.private_bytes(
                encoding=serialization.Encoding.DER,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )
            connection_params = {
                'user': self.config.snowflake_user,
                'account': self.config.snowflake_account,
                'private_key': pkb,
                'warehouse': self.config.snowflake_warehouse,
                'database': self.config.snowflake_database,
                'schema': self.config.snowflake_schema,
                'role': self.config.snowflake_role,
                'timeout': self._connection_timeout,
                'autocommit': True,
            }
            connection = snowflake.connector.connect(**connection_params)
            connection_id = f"conn_{len(self._connections)}_{int(time.time())}"
            self.logger.info(f"新しい接続を作成: {connection_id}")
            return connection_id, connection
        except Exception as e:
            self.logger.error(f"Snowflakeへの接続に失敗しました: {e}")
            raise AppDatabaseError(f"Snowflake接続の作成に失敗しました: {str(e)}")
    
    def _close_connection(self, connection_id: str):
        """接続を閉じる"""
        try:
            if connection_id in self._connections:
                connection = self._connections[connection_id]
                connection.close()
                del self._connections[connection_id]
                del self._connection_info[connection_id]
                self.logger.info(f"接続を閉じました: {connection_id}")
        except Exception as e:
            self.logger.error(f"接続クローズエラー: {e}")
    
    def get_connection(self) -> Tuple[str, snowflake.connector.SnowflakeConnection]:
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
            self.logger.error(f"接続テストエラー: {e}")
            return False
    
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