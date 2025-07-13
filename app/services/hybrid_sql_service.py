# -*- coding: utf-8 -*-
"""
ハイブリッドSQLサービス
カーソル方式によるデータ取得とローカルキャッシュ機能を提供
"""
import asyncio
from typing import Optional, Dict, Any, List, Tuple, Generator
from datetime import datetime
from app.services.cache_service import CacheService
from app.services.connection_manager_odbc import ConnectionManagerODBC
from app.services.streaming_state_service import StreamingStateService
from app.logger import get_logger
from app.exceptions import SQLExecutionError, DatabaseError

logger = get_logger("HybridSQLService")

class HybridSQLService:
    """ハイブリッドSQL実行サービス"""
    
    def __init__(self, cache_service: CacheService, connection_manager: ConnectionManagerODBC, streaming_state_service: StreamingStateService = None):
        self.cache_service = cache_service
        self.connection_manager = connection_manager
        self.streaming_state_service = streaming_state_service
        self.chunk_size = 1000  # 一度に取得する行数
    
    async def execute_sql_with_cache(self, sql: str, user_id: str, limit: Optional[int] = None) -> Dict[str, Any]:
        """SQLを実行し、結果をキャッシュに保存"""
        start_time = datetime.now()
        
        try:
            # セッションIDを生成
            session_id = self.cache_service.generate_session_id(user_id)
            
            # セッションを登録（同時実行制限チェック）
            if not self.cache_service.register_session(session_id, user_id):
                raise SQLExecutionError("現在、他の処理を実行中です。しばらく待ってから再度お試しください。")
            
            # 総件数を取得
            total_count = await self._get_total_count(sql)
            
            # 100万件超の場合は警告
            if total_count > 1000000:
                logger.warning(f"大容量データ検出: {total_count}件, ユーザー: {user_id}")
            
            # セッション情報を更新
            self.cache_service.update_session_progress(session_id, 0, False)
            
            # ストリーミング状態を更新
            if self.streaming_state_service:
                self.streaming_state_service.update_progress(session_id, 0)
            
            # カーソル方式でデータを取得・キャッシュ
            processed_rows = await self._fetch_and_cache_data(sql, session_id, limit)
            
            # 実行時間を計算
            execution_time = (datetime.now() - start_time).total_seconds()
            
            # セッション完了（実行時間を含む）
            self.cache_service.update_session_progress(session_id, processed_rows, True, execution_time)
            
            # ストリーミング完了
            if self.streaming_state_service:
                self.streaming_state_service.complete_streaming(session_id, processed_rows)
            
            return {
                'success': True,
                'session_id': session_id,
                'total_count': total_count,
                'processed_rows': processed_rows,
                'execution_time': execution_time,
                'message': f"データ取得完了: {processed_rows}件"
            }
            
        except Exception as e:
            logger.error(f"SQL実行エラー: {e}")
            raise SQLExecutionError(f"SQL実行に失敗しました: {str(e)}")
    
    async def _get_total_count(self, sql: str) -> int:
        """SQLの総件数を取得"""
        count_sql = f"SELECT COUNT(*) FROM ({sql}) as count_query"
        
        try:
            conn_id, connection = self.connection_manager.get_connection()
            cursor = connection.cursor()
            cursor.execute(count_sql)
            result = cursor.fetchone()
            return result[0] if result else 0
        except Exception as e:
            logger.error(f"総件数取得エラー: {e}")
            raise DatabaseError(f"総件数の取得に失敗しました: {str(e)}")
    
    async def _fetch_and_cache_data(self, sql: str, session_id: str, limit: Optional[int] = None) -> int:
        """カーソル方式でデータを取得し、キャッシュに保存"""
        processed_rows = 0
        table_name = None
        columns = None
        
        try:
            conn_id, connection = self.connection_manager.get_connection()
            cursor = connection.cursor()
            
            # SQLを実行
            cursor.execute(sql)
            
            # カラム情報を取得
            columns = [column[0] for column in cursor.description]
            
            # キャッシュテーブルを作成
            table_name = self.cache_service.create_cache_table(session_id, columns)
            
            # チャンク単位でデータを取得・キャッシュ
            while True:
                chunk = cursor.fetchmany(self.chunk_size)
                if not chunk:
                    break
                
                # データ型を検証・変換
                is_valid, error_msg = self.cache_service.validate_data_types(chunk)
                if not is_valid:
                    raise SQLExecutionError(f"データ型エラー: {error_msg}")
                
                # キャッシュに挿入
                inserted_count = self.cache_service.insert_chunk(table_name, chunk)
                processed_rows += inserted_count
                
                # 進捗を更新
                self.cache_service.update_session_progress(session_id, processed_rows, False)
                
                # ストリーミング状態を更新
                if self.streaming_state_service:
                    self.streaming_state_service.update_progress(session_id, processed_rows)
                
                # 制限チェック
                if limit and processed_rows >= limit:
                    break
                
                # 非同期処理のための一時停止
                await asyncio.sleep(0.001)
            
            return processed_rows
            
        except Exception as e:
            logger.error(f"データ取得・キャッシュエラー: {e}")
            # 部分的なキャッシュは保持
            if table_name:
                logger.info(f"部分キャッシュを保持: {processed_rows}件")
            raise DatabaseError(f"データ取得に失敗しました: {str(e)}")
        finally:
            # 処理終了後、必ず接続を解放する
            if conn_id:
                self.connection_manager.release_connection(conn_id)
                logger.info(f"ODBC接続を解放しました: {conn_id}")
    
    def get_cached_data(self, session_id: str, page: int = 1, page_size: int = 100,
                        filters: Optional[Dict] = None, sort_by: Optional[str] = None,
                        sort_order: str = 'ASC') -> Dict[str, Any]:
        """キャッシュされたデータを取得"""
        try:
            # セッション情報を確認
            session_info = self.cache_service.get_session_info(session_id)
            if not session_info:
                raise SQLExecutionError("セッションが見つかりません")
            
            # キャッシュからデータを取得
            result = self.cache_service.get_cached_data(
                session_id, page, page_size, filters, sort_by, sort_order
            )
            
            return {
                'success': True,
                'data': result['data'],
                'columns': result['columns'],
                'total_count': result['total_count'],
                'page': result['page'],
                'page_size': result['page_size'],
                'total_pages': result['total_pages'],
                'session_info': session_info,
                'execution_time': session_info.get('execution_time')  # セッション情報から実行時間を取得
            }
            
        except Exception as e:
            logger.error(f"キャッシュデータ取得エラー: {e}")
            raise SQLExecutionError(f"キャッシュデータの取得に失敗しました: {str(e)}")
    
    def cleanup_session(self, session_id: str):
        """セッションをクリーンアップ"""
        try:
            self.cache_service.cleanup_session(session_id)
            logger.info(f"セッションクリーンアップ完了: {session_id}")
        except Exception as e:
            logger.error(f"セッションクリーンアップエラー: {e}")
    
    def cleanup_user_sessions(self, user_id: str):
        """ユーザーの全セッションをクリーンアップ"""
        try:
            self.cache_service.cleanup_user_sessions(user_id)
            logger.info(f"ユーザーセッションクリーンアップ完了: {user_id}")
        except Exception as e:
            logger.error(f"ユーザーセッションクリーンアップエラー: {e}")
    
    def get_session_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        """セッションの状態を取得"""
        return self.cache_service.get_session_info(session_id) 