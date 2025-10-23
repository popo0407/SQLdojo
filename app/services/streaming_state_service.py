# -*- coding: utf-8 -*-
"""
ストリーミング状態管理サービス
データ取得の進捗管理を行う
"""
import asyncio
from typing import Optional, Dict, Any, Callable
from datetime import datetime
from threading import Lock
from app.logger import get_logger

logger = get_logger("StreamingStateService")

class StreamingStateService:
    """ストリーミング状態管理サービス"""
    
    def __init__(self):
        self._states = {}  # session_id -> state_info
        self._callbacks = {}  # session_id -> callback_functions
        self._lock = Lock()
    
    def create_streaming_state(self, session_id: str, total_count: int = 0) -> Dict[str, Any]:
        """ストリーミング状態を作成"""
        with self._lock:
            state_info = {
                'session_id': session_id,
                'status': 'running',  # running, completed, error, cancelled
                'phase': 'executing',  # executing, downloading, completed
                'total_count': total_count,
                'processed_count': 0,
                'start_time': datetime.now(),
                'last_update': datetime.now(),
                'error_message': None,
                'is_cancelled': False
            }
            
            self._states[session_id] = state_info
            logger.info(f"ストリーミング状態作成: {session_id}, 総件数: {total_count}")
            return state_info.copy()
    
    def update_progress(self, session_id: str, processed_count: int, status: str = 'running'):
        """進捗を更新"""
        with self._lock:
            if session_id in self._states:
                state = self._states[session_id]
                state['processed_count'] = processed_count
                state['status'] = status
                state['last_update'] = datetime.now()
                
                # コールバックを実行
                if session_id in self._callbacks:
                    try:
                        callback = self._callbacks[session_id]
                        asyncio.create_task(callback(state.copy()))
                    except Exception as e:
                        logger.error(f"コールバック実行エラー: {e}")
                
                logger.debug(f"進捗更新: {session_id}, {processed_count}/{state['total_count']}")
    
    def update_phase(self, session_id: str, phase: str):
        """処理段階を更新 (executing -> downloading)"""
        with self._lock:
            if session_id in self._states:
                state = self._states[session_id]
                state['phase'] = phase
                state['last_update'] = datetime.now()
                logger.info(f"処理段階更新: {session_id}, phase: {phase}")
    
    def complete_streaming(self, session_id: str, final_count: int):
        """ストリーミング完了"""
        with self._lock:
            if session_id in self._states:
                state = self._states[session_id]
                state['status'] = 'completed'
                state['processed_count'] = final_count
                state['last_update'] = datetime.now()
                
                # コールバックを実行
                if session_id in self._callbacks:
                    try:
                        callback = self._callbacks[session_id]
                        asyncio.create_task(callback(state.copy()))
                    except Exception as e:
                        logger.error(f"コールバック実行エラー: {e}")
                
                logger.info(f"ストリーミング完了: {session_id}, 最終件数: {final_count}")
    
    def error_streaming(self, session_id: str, error_message: str):
        """ストリーミングエラー"""
        with self._lock:
            if session_id in self._states:
                state = self._states[session_id]
                state['status'] = 'error'
                state['error_message'] = error_message
                state['last_update'] = datetime.now()
                
                # コールバックを実行
                if session_id in self._callbacks:
                    try:
                        callback = self._callbacks[session_id]
                        asyncio.create_task(callback(state.copy()))
                    except Exception as e:
                        logger.error(f"コールバック実行エラー: {e}")
                
                logger.error(f"ストリーミングエラー: {session_id}, エラー: {error_message}")
    
    def cancel_streaming(self, session_id: str) -> bool:
        """ストリーミングをキャンセル"""
        with self._lock:
            if session_id in self._states:
                state = self._states[session_id]
                if state['status'] == 'running':
                    state['status'] = 'cancelled'
                    state['is_cancelled'] = True
                    state['last_update'] = datetime.now()
                    
                    # コールバックを実行
                    if session_id in self._callbacks:
                        try:
                            callback = self._callbacks[session_id]
                            asyncio.create_task(callback(state.copy()))
                        except Exception as e:
                            logger.error(f"コールバック実行エラー: {e}")
                    
                    logger.info(f"ストリーミングキャンセル: {session_id}")
                    return True
                else:
                    logger.warning(f"ストリーミングは既に完了済み: {session_id}")
                    return False
            else:
                logger.warning(f"セッションが見つかりません: {session_id}")
                return False
    
    def get_state(self, session_id: str) -> Optional[Dict[str, Any]]:
        """状態を取得"""
        with self._lock:
            if session_id in self._states:
                return self._states[session_id].copy()
        return None
    
    def is_cancelled(self, session_id: str) -> bool:
        """キャンセルされているかチェック"""
        with self._lock:
            if session_id in self._states:
                return self._states[session_id]['is_cancelled']
        return False
    
    def register_callback(self, session_id: str, callback: Callable[[Dict[str, Any]], None]):
        """コールバック関数を登録"""
        with self._lock:
            self._callbacks[session_id] = callback
            logger.debug(f"コールバック登録: {session_id}")
    
    def unregister_callback(self, session_id: str):
        """コールバック関数を削除"""
        with self._lock:
            if session_id in self._callbacks:
                del self._callbacks[session_id]
                logger.debug(f"コールバック削除: {session_id}")
    
    def cleanup_state(self, session_id: str):
        """状態をクリーンアップ"""
        with self._lock:
            if session_id in self._states:
                del self._states[session_id]
            if session_id in self._callbacks:
                del self._callbacks[session_id]
            logger.info(f"ストリーミング状態クリーンアップ: {session_id}")
    
    def get_all_states(self) -> Dict[str, Dict[str, Any]]:
        """全状態を取得"""
        with self._lock:
            return {k: v.copy() for k, v in self._states.items()}
    
    def cleanup_expired_states(self, max_age_hours: int = 24):
        """期限切れの状態をクリーンアップ"""
        cutoff_time = datetime.now().replace(hour=datetime.now().hour - max_age_hours)
        expired_sessions = []
        
        with self._lock:
            for session_id, state in self._states.items():
                if state['last_update'] < cutoff_time:
                    expired_sessions.append(session_id)
            
            for session_id in expired_sessions:
                self.cleanup_state(session_id)
        
        if expired_sessions:
            logger.info(f"期限切れ状態をクリーンアップ: {len(expired_sessions)}件")
    
    def cleanup_user_states(self, user_id: str):
        """ユーザーの全状態をクリーンアップ"""
        sessions_to_cleanup = []
        
        # まず、ロックをかけて安全に削除対象のセッションIDリストを作成します
        with self._lock:
            for session_id in self._states.keys():
                if session_id.startswith(f"{user_id}_"):
                    sessions_to_cleanup.append(session_id)

        if not sessions_to_cleanup:
            logger.info(f"ユーザー状態クリーンアップ: {user_id}, 対象なし")
            return

        # 再度ロックをかけて、対象の全セッションをメモリから一括で削除します
        with self._lock:
            for session_id in sessions_to_cleanup:
                if session_id in self._states:
                    del self._states[session_id]
                if session_id in self._callbacks:
                    del self._callbacks[session_id]
        
        logger.info(f"ユーザー状態クリーンアップ完了: {user_id}, {len(sessions_to_cleanup)}件")