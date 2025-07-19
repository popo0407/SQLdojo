# -*- coding: utf-8 -*-
"""
セッション管理サービス
SQLエディタごとのセッション管理を行う
"""
import uuid
import time
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from app.logger import get_logger

logger = get_logger("SessionService")

class SessionService:
    """セッション管理サービス"""
    
    def __init__(self):
        self._sessions = {}  # session_id -> session_info
        self._user_sessions = {}  # user_id -> [session_ids]
        self._session_timeout = 3600  # 1時間
    
    def create_editor_session(self, user_id: str, editor_id: Optional[str] = None, session_id: Optional[str] = None) -> str:
        """SQLエディタ用のセッションを作成"""
        if session_id is None:
            if editor_id is None:
                editor_id = str(uuid.uuid4())[:8]
            
            session_id = f"{user_id}_{int(time.time())}_{editor_id}"
        
        session_info = {
            'session_id': session_id,
            'user_id': user_id,
            'editor_id': editor_id,
            'created_at': datetime.now(),
            'last_accessed': datetime.now(),
            'status': 'active',
            'cache_session_id': None  # キャッシュセッションID
        }
        
        # セッションを登録
        self._sessions[session_id] = session_info
        
        # ユーザーセッションリストに追加
        if user_id not in self._user_sessions:
            self._user_sessions[user_id] = []
        self._user_sessions[user_id].append(session_id)
        
        logger.info(f"エディタセッション作成: {session_id}, ユーザー: {user_id}")
        return session_id
    
    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """セッション情報を取得"""
        if session_id not in self._sessions:
            return None
        
        session_info = self._sessions[session_id]
        
        # タイムアウトチェック
        if self._is_session_expired(session_info):
            self._cleanup_session(session_id)
            return None
        
        # 最終アクセス時間を更新
        session_info['last_accessed'] = datetime.now()
        return session_info.copy()
    
    def update_cache_session(self, session_id: str, cache_session_id: str):
        """キャッシュセッションIDを更新"""
        if session_id in self._sessions:
            self._sessions[session_id]['cache_session_id'] = cache_session_id
            self._sessions[session_id]['last_accessed'] = datetime.now()
            logger.info(f"キャッシュセッション更新: {session_id} -> {cache_session_id}")
    
    def get_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """ユーザーの全セッションを取得"""
        if user_id not in self._user_sessions:
            return []
        
        active_sessions = []
        expired_sessions = []
        
        for session_id in self._user_sessions[user_id]:
            session_info = self._sessions.get(session_id)
            if session_info:
                if self._is_session_expired(session_info):
                    expired_sessions.append(session_id)
                else:
                    active_sessions.append(session_info.copy())
        
        # 期限切れセッションをクリーンアップ
        for session_id in expired_sessions:
            self._cleanup_session(session_id)
        
        return active_sessions
    
    def cleanup_session(self, session_id: str):
        """セッションをクリーンアップ"""
        self._cleanup_session(session_id)
    
    def cleanup_user_sessions(self, user_id: str):
        """ユーザーの全セッションをクリーンアップ"""
        if user_id in self._user_sessions:
            for session_id in self._user_sessions[user_id][:]:  # コピーを作成
                self._cleanup_session(session_id)
    
    def cleanup_expired_sessions(self):
        """期限切れセッションをクリーンアップ"""
        expired_sessions = []
        
        for session_id, session_info in self._sessions.items():
            if self._is_session_expired(session_info):
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            self._cleanup_session(session_id)
        
        if expired_sessions:
            logger.info(f"期限切れセッションをクリーンアップ: {len(expired_sessions)}件")
    
    def _is_session_expired(self, session_info: Dict[str, Any]) -> bool:
        """セッションが期限切れかチェック"""
        last_accessed = session_info['last_accessed']
        if isinstance(last_accessed, str):
            last_accessed = datetime.fromisoformat(last_accessed.replace('Z', '+00:00'))
        
        return datetime.now() - last_accessed > timedelta(seconds=self._session_timeout)
    
    def _cleanup_session(self, session_id: str):
        """セッションを内部クリーンアップ"""
        if session_id in self._sessions:
            session_info = self._sessions[session_id]
            user_id = session_info['user_id']
            
            # セッション情報を削除
            del self._sessions[session_id]
            
            # ユーザーセッションリストから削除
            if user_id in self._user_sessions:
                if session_id in self._user_sessions[user_id]:
                    self._user_sessions[user_id].remove(session_id)
                
                # 空のリストを削除
                if not self._user_sessions[user_id]:
                    del self._user_sessions[user_id]
            
            logger.info(f"セッションクリーンアップ完了: {session_id}")
    
    def get_session_stats(self) -> Dict[str, Any]:
        """セッション統計情報を取得"""
        total_sessions = len(self._sessions)
        active_users = len(self._user_sessions)
        
        # ユーザー別セッション数
        user_session_counts = {}
        for user_id, sessions in self._user_sessions.items():
            user_session_counts[user_id] = len(sessions)
        
        return {
            'total_sessions': total_sessions,
            'active_users': active_users,
            'user_session_counts': user_session_counts
        } 