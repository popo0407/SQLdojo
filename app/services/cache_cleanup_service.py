# -*- coding: utf-8 -*-
"""
キャッシュセッション自動クリーンアップサービス
期限切れのキャッシュセッションを定期的にクリーンアップする
"""
import sqlite3
import asyncio
from datetime import datetime, timedelta
from typing import Optional

from app.logger import get_logger
from app.config_simplified import settings

logger = get_logger("CacheCleanupService")


class CacheCleanupService:
    """キャッシュセッション自動クリーンアップサービス"""
    
    def __init__(self, cache_db_path: str = "cache_data.db"):
        self.cache_db_path = cache_db_path
        self._running = False
        self._task: Optional[asyncio.Task] = None
    
    async def start_cleanup_task(self) -> None:
        """クリーンアップタスクを開始"""
        if not settings.cache_cleanup_enabled:
            logger.info("キャッシュクリーンアップが無効化されています")
            return
        
        if self._running:
            logger.warning("クリーンアップタスクは既に実行中です")
            return
        
        self._running = True
        self._task = asyncio.create_task(self._cleanup_loop())
        logger.info(f"キャッシュクリーンアップタスクを開始しました（間隔: {settings.cache_cleanup_interval_minutes}分）")
    
    async def stop_cleanup_task(self) -> None:
        """クリーンアップタスクを停止"""
        if not self._running:
            return
        
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("キャッシュクリーンアップタスクを停止しました")
    
    async def _cleanup_loop(self) -> None:
        """クリーンアップの定期実行ループ"""
        while self._running:
            try:
                await self._perform_cleanup()
                # 次回実行まで待機
                await asyncio.sleep(settings.cache_cleanup_interval_minutes * 60)
            except asyncio.CancelledError:
                logger.info("クリーンアップタスクがキャンセルされました")
                break
            except Exception as e:
                logger.error(f"クリーンアップ処理中にエラーが発生しました: {e}", exc_info=True)
                # エラーが発生してもタスクは継続
                await asyncio.sleep(60)  # エラー時は1分待機
    
    async def _perform_cleanup(self) -> None:
        """クリーンアップ処理の実行"""
        logger.info("キャッシュクリーンアップ処理を開始します")
        
        timeout_count = 0
        delete_count = 0
        
        try:
            with sqlite3.connect(self.cache_db_path, timeout=10.0) as conn:
                cursor = conn.cursor()
                
                # 現在時刻を取得
                now = datetime.now()
                timeout_threshold = now - timedelta(minutes=settings.cache_session_timeout_minutes)
                delete_threshold = now - timedelta(hours=settings.cache_session_cleanup_hours)
                
                # 1. 30分経過したアクティブセッションをタイムアウトに変更
                cursor.execute("""
                    UPDATE cache_sessions 
                    SET is_complete = 1, status = 'timeout', last_accessed = CURRENT_TIMESTAMP
                    WHERE is_complete = 0 AND created_at < ?
                """, (timeout_threshold.isoformat(),))
                timeout_count = cursor.rowcount
                
                # 2. 12時間経過したセッションを取得して削除
                cursor.execute("""
                    SELECT session_id, user_id FROM cache_sessions 
                    WHERE created_at < ?
                """, (delete_threshold.isoformat(),))
                sessions_to_delete = cursor.fetchall()
                
                if sessions_to_delete:
                    # 対応するキャッシュテーブルを削除
                    for session_id, user_id in sessions_to_delete:
                        try:
                            # セッションIDからテーブル名を生成
                            table_name = self._generate_table_name(session_id)
                            cursor.execute(f"DROP TABLE IF EXISTS {table_name}")
                        except Exception as e:
                            logger.error(f"キャッシュテーブル削除エラー (session: {session_id}): {e}")
                    
                    # セッションレコードを削除
                    cursor.execute("""
                        DELETE FROM cache_sessions 
                        WHERE created_at < ?
                    """, (delete_threshold.isoformat(),))
                    delete_count = len(sessions_to_delete)
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"クリーンアップ処理中にエラーが発生しました: {e}", exc_info=True)
            return
        
        logger.info(f"キャッシュクリーンアップ処理が完了しました（タイムアウト: {timeout_count}件, 削除: {delete_count}件）")
    
    def _generate_table_name(self, session_id: str) -> str:
        """セッションIDからキャッシュテーブル名を生成"""
        # 新しい設計ではセッションIDがそのままテーブル名
        return session_id
    
    async def manual_cleanup(self) -> dict:
        """手動クリーンアップの実行（管理用）"""
        logger.info("手動クリーンアップを実行します")
        await self._perform_cleanup()
        return {"status": "completed", "message": "手動クリーンアップが完了しました"}
