"""
セッションライフサイクル統一管理
セッションの作成から削除までを一元管理し、一貫性を保つ
"""
import threading
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class SessionStatus(Enum):
    """セッション状態の定義"""
    PENDING = "pending"       # 作成済み、まだ実行開始していない
    ACTIVE = "active"         # 実行中
    COMPLETED = "completed"   # 正常完了
    ERROR = "error"          # エラーで終了
    CANCELLED = "cancelled"   # ユーザーによりキャンセル
    TIMEOUT = "timeout"      # タイムアウト

class SessionLifecycleManager:
    """セッションライフサイクル統一管理クラス"""
    
    def __init__(self, cache_db_path: str = "cache_data.db"):
        self.cache_db_path = cache_db_path
        self._lock = threading.Lock()
        self._active_sessions = {}  # メモリ（プライマリ）
        self._max_concurrent_sessions = 5
        self._session_timeout = timedelta(minutes=30)  # 30分タイムアウト
        self._cleanup_interval = timedelta(minutes=5)   # 5分間隔でクリーンアップ
        self._last_cleanup = datetime.now()
        
    # ===== セッション作成・登録 =====
    def create_session(self, session_id: str, user_id: str, total_rows: int = 0) -> bool:
        """セッションを作成・登録"""
        with self._lock:
            logger.info(f"セッション作成開始: {session_id}")
            
            # 自動クリーンアップ実行
            self._auto_cleanup_if_needed()
            
            # 同時実行制限チェック
            if not self._check_concurrent_limit():
                logger.warning(f"同時実行制限によりセッション作成を拒否: {session_id}")
                return False
            
            # メモリに登録
            session_info = {
                'session_id': session_id,
                'user_id': user_id,
                'status': SessionStatus.PENDING,
                'total_rows': total_rows,
                'processed_rows': 0,
                'created_at': datetime.now(),
                'updated_at': datetime.now(),
                'last_activity': datetime.now()
            }
            
            self._active_sessions[session_id] = session_info
            
            # DBに同期
            if self._sync_session_to_db(session_info):
                logger.info(f"セッション作成完了: {session_id}")
                return True
            else:
                # DB同期失敗時はメモリからも削除
                self._active_sessions.pop(session_id, None)
                logger.error(f"セッション作成失敗（DB同期エラー）: {session_id}")
                return False
    
    # ===== セッション状態更新 =====
    def start_session(self, session_id: str) -> bool:
        """セッションを実行開始状態にする"""
        return self._update_session_status(session_id, SessionStatus.ACTIVE)
    
    def complete_session(self, session_id: str) -> bool:
        """セッションを完了状態にする"""
        return self._update_session_status(session_id, SessionStatus.COMPLETED)
    
    def error_session(self, session_id: str, error_message: str = None) -> bool:
        """セッションをエラー状態にする"""
        return self._update_session_status(session_id, SessionStatus.ERROR, error_message)
    
    def cancel_session(self, session_id: str) -> bool:
        """セッションをキャンセル状態にする"""
        return self._update_session_status(session_id, SessionStatus.CANCELLED)
    
    # ===== セッション進行状況更新 =====
    def update_progress(self, session_id: str, processed_rows: int) -> bool:
        """セッション進行状況を更新"""
        with self._lock:
            if session_id not in self._active_sessions:
                logger.warning(f"進行状況更新対象のセッションが見つかりません: {session_id}")
                return False
            
            self._active_sessions[session_id]['processed_rows'] = processed_rows
            self._active_sessions[session_id]['last_activity'] = datetime.now()
            self._active_sessions[session_id]['updated_at'] = datetime.now()
            
            # DBにも反映（高頻度なのでバッチ処理を検討）
            return self._sync_progress_to_db(session_id, processed_rows)
    
    # ===== セッション取得 =====
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """セッション情報を取得"""
        with self._lock:
            session_info = self._active_sessions.get(session_id)
            if session_info:
                # アクティビティ時刻を更新
                session_info['last_activity'] = datetime.now()
                return session_info.copy()
            
            # メモリにない場合はDBから復元を試行
            return self._restore_session_from_db(session_id)
    
    def get_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """ユーザーの全セッション情報を取得"""
        with self._lock:
            user_sessions = []
            for session_info in self._active_sessions.values():
                if session_info['user_id'] == user_id:
                    user_sessions.append(session_info.copy())
            return user_sessions
    
    # ===== セッションクリーンアップ =====
    def cleanup_session(self, session_id: str, force: bool = False) -> bool:
        """個別セッションをクリーンアップ"""
        with self._lock:
            logger.info(f"セッションクリーンアップ開始: {session_id}")
            
            # メモリから削除
            session_info = self._active_sessions.pop(session_id, None)
            
            # キャッシュテーブル削除
            self._cleanup_session_cache_table(session_id)
            
            # DB からセッション情報削除（force=Trueの場合）
            if force:
                self._delete_session_from_db(session_id)
            else:
                # 通常は削除せず完了状態のまま保持（履歴として）
                pass
            
            if session_info:
                logger.info(f"セッションクリーンアップ完了: {session_id}")
                return True
            else:
                logger.warning(f"クリーンアップ対象のセッションが見つかりません: {session_id}")
                return False
    
    def cleanup_user_sessions(self, user_id: str) -> int:
        """ユーザーの全セッションをクリーンアップ"""
        with self._lock:
            logger.info(f"ユーザーセッションクリーンアップ開始: {user_id}")
            
            # 対象セッションを特定
            sessions_to_cleanup = [
                sid for sid, info in self._active_sessions.items() 
                if info['user_id'] == user_id
            ]
            
            cleanup_count = 0
            for session_id in sessions_to_cleanup:
                if self.cleanup_session(session_id):
                    cleanup_count += 1
            
            logger.info(f"ユーザーセッションクリーンアップ完了: {user_id} ({cleanup_count}件)")
            return cleanup_count
    
    def auto_cleanup_expired_sessions(self) -> int:
        """期限切れセッションの自動クリーンアップ"""
        with self._lock:
            logger.info("期限切れセッション自動クリーンアップ開始")
            
            current_time = datetime.now()
            expired_sessions = []
            
            for session_id, session_info in self._active_sessions.items():
                last_activity = session_info.get('last_activity', session_info['created_at'])
                if current_time - last_activity > self._session_timeout:
                    expired_sessions.append(session_id)
            
            cleanup_count = 0
            for session_id in expired_sessions:
                # タイムアウト状態に更新してからクリーンアップ
                self._update_session_status(session_id, SessionStatus.TIMEOUT)
                if self.cleanup_session(session_id):
                    cleanup_count += 1
            
            self._last_cleanup = current_time
            logger.info(f"期限切れセッション自動クリーンアップ完了: {cleanup_count}件")
            return cleanup_count
    
    # ===== 内部メソッド =====
    def _check_concurrent_limit(self) -> bool:
        """同時実行制限チェック"""
        active_count = len([
            s for s in self._active_sessions.values() 
            if s['status'] in [SessionStatus.PENDING, SessionStatus.ACTIVE]
        ])
        return active_count < self._max_concurrent_sessions
    
    def _update_session_status(self, session_id: str, status: SessionStatus, 
                              error_message: str = None) -> bool:
        """セッション状態を更新"""
        with self._lock:
            if session_id not in self._active_sessions:
                logger.warning(f"状態更新対象のセッションが見つかりません: {session_id}")
                return False
            
            self._active_sessions[session_id]['status'] = status
            self._active_sessions[session_id]['updated_at'] = datetime.now()
            self._active_sessions[session_id]['last_activity'] = datetime.now()
            
            if error_message:
                self._active_sessions[session_id]['error_message'] = error_message
            
            # DBに同期
            return self._sync_session_to_db(self._active_sessions[session_id])
    
    def _auto_cleanup_if_needed(self):
        """必要に応じて自動クリーンアップ実行"""
        current_time = datetime.now()
        if current_time - self._last_cleanup > self._cleanup_interval:
            self.auto_cleanup_expired_sessions()
    
    def _sync_session_to_db(self, session_info: Dict[str, Any]) -> bool:
        """セッション情報をDBに同期"""
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO cache_sessions 
                    (session_id, user_id, total_rows, processed_rows, status, is_complete, 
                     created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    session_info['session_id'],
                    session_info['user_id'],
                    session_info['total_rows'],
                    session_info['processed_rows'],
                    session_info['status'].value,
                    1 if session_info['status'] in [SessionStatus.COMPLETED, SessionStatus.ERROR, 
                                                   SessionStatus.CANCELLED, SessionStatus.TIMEOUT] else 0,
                    session_info['created_at'].isoformat(),
                    session_info['updated_at'].isoformat()
                ))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"DB同期エラー: {e}")
            return False
    
    def _sync_progress_to_db(self, session_id: str, processed_rows: int) -> bool:
        """進行状況をDBに同期"""
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE cache_sessions 
                    SET processed_rows = ?, updated_at = ?
                    WHERE session_id = ?
                """, (processed_rows, datetime.now().isoformat(), session_id))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"進行状況DB同期エラー: {e}")
            return False
    
    def _restore_session_from_db(self, session_id: str) -> Optional[Dict[str, Any]]:
        """DBからセッション情報を復元"""
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT session_id, user_id, total_rows, processed_rows, status, 
                           created_at, updated_at
                    FROM cache_sessions 
                    WHERE session_id = ?
                """, (session_id,))
                row = cursor.fetchone()
                
                if row:
                    session_info = {
                        'session_id': row[0],
                        'user_id': row[1],
                        'total_rows': row[2],
                        'processed_rows': row[3],
                        'status': SessionStatus(row[4]),
                        'created_at': datetime.fromisoformat(row[5]),
                        'updated_at': datetime.fromisoformat(row[6]),
                        'last_activity': datetime.now()
                    }
                    
                    # メモリに復元
                    self._active_sessions[session_id] = session_info
                    logger.info(f"セッションをDBから復元: {session_id}")
                    return session_info.copy()
                    
        except Exception as e:
            logger.error(f"セッション復元エラー: {e}")
        
        return None
    
    def _cleanup_session_cache_table(self, session_id: str):
        """セッションのキャッシュテーブルを削除"""
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(f"DROP TABLE IF EXISTS {session_id}")
                conn.commit()
        except Exception as e:
            logger.error(f"キャッシュテーブル削除エラー: {e}")
    
    def _delete_session_from_db(self, session_id: str):
        """DBからセッション情報を完全削除"""
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM cache_sessions WHERE session_id = ?", (session_id,))
                conn.commit()
        except Exception as e:
            logger.error(f"セッション削除エラー: {e}")
