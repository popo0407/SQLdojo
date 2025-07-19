# -*- coding: utf-8 -*-
"""
パフォーマンス監視サービス
アプリケーションのパフォーマンスメトリクスを管理
"""
import time
from typing import Dict, Any, Optional
from collections import defaultdict, deque
from datetime import datetime, timedelta
import threading

from app.logger import get_logger


class PerformanceMetrics:
    """パフォーマンスメトリクス管理クラス"""
    
    def __init__(self, max_history: int = 1000):
        self.logger = get_logger(__name__)
        self.max_history = max_history
        self._lock = threading.Lock()
        
        # リクエスト統計
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        
        # 応答時間履歴
        self.response_times = deque(maxlen=max_history)
        
        # エンドポイント別統計
        self.endpoint_stats = defaultdict(lambda: {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'total_time': 0.0,
            'min_time': float('inf'),
            'max_time': 0.0
        })
        
        # データベース接続統計
        self.db_connection_stats = {
            'total_connections': 0,
            'active_connections': 0,
            'connection_errors': 0,
            'query_count': 0,
            'avg_query_time': 0.0
        }
    
    def record_request(self, endpoint: str, execution_time: float, success: bool = True):
        """リクエストを記録"""
        with self._lock:
            # 全体統計
            self.total_requests += 1
            if success:
                self.successful_requests += 1
            else:
                self.failed_requests += 1
            
            # 応答時間履歴
            self.response_times.append(execution_time)
            
            # エンドポイント別統計
            stats = self.endpoint_stats[endpoint]
            stats['total_requests'] += 1
            if success:
                stats['successful_requests'] += 1
            else:
                stats['failed_requests'] += 1
            
            stats['total_time'] += execution_time
            stats['min_time'] = min(stats['min_time'], execution_time)
            stats['max_time'] = max(stats['max_time'], execution_time)
    
    def record_database_operation(self, operation_type: str, execution_time: float, success: bool = True):
        """データベース操作を記録"""
        with self._lock:
            if operation_type == 'connection':
                self.db_connection_stats['total_connections'] += 1
                if not success:
                    self.db_connection_stats['connection_errors'] += 1
            elif operation_type == 'query':
                self.db_connection_stats['query_count'] += 1
                # 平均クエリ時間を更新
                current_avg = self.db_connection_stats['avg_query_time']
                total_queries = self.db_connection_stats['query_count']
                self.db_connection_stats['avg_query_time'] = (
                    (current_avg * (total_queries - 1) + execution_time) / total_queries
                )
    
    def update_connection_count(self, active_connections: int):
        """アクティブ接続数を更新"""
        with self._lock:
            self.db_connection_stats['active_connections'] = active_connections
    
    def get_metrics(self) -> Dict[str, Any]:
        """メトリクスを取得"""
        with self._lock:
            # 平均応答時間を計算
            avg_response_time = 0.0
            if self.response_times:
                avg_response_time = sum(self.response_times) / len(self.response_times)
            
            # エラー率を計算
            error_rate = 0.0
            if self.total_requests > 0:
                error_rate = self.failed_requests / self.total_requests
            
            return {
                'total_requests': self.total_requests,
                'successful_requests': self.successful_requests,
                'failed_requests': self.failed_requests,
                'average_response_time': avg_response_time,
                'error_rate': error_rate,
                'active_connections': self.db_connection_stats['active_connections'],
                'endpoint_stats': dict(self.endpoint_stats),
                'database_stats': self.db_connection_stats.copy(),
                'timestamp': time.time()
            }
    
    def get_recent_metrics(self, minutes: int = 5) -> Dict[str, Any]:
        """最近のメトリクスを取得（実装は簡略化）"""
        return self.get_metrics()
    
    def reset_metrics(self):
        """メトリクスをリセット"""
        with self._lock:
            self.total_requests = 0
            self.successful_requests = 0
            self.failed_requests = 0
            self.response_times.clear()
            self.endpoint_stats.clear()
            self.db_connection_stats = {
                'total_connections': 0,
                'active_connections': 0,
                'connection_errors': 0,
                'query_count': 0,
                'avg_query_time': 0.0
            }


class PerformanceService:
    """パフォーマンス監視サービス"""
    
    def __init__(self):
        self.logger = get_logger(__name__)
        self.metrics = PerformanceMetrics()
    
    def record_request(self, endpoint: str, execution_time: float, success: bool = True):
        """リクエストを記録"""
        try:
            self.metrics.record_request(endpoint, execution_time, success)
        except Exception as e:
            self.logger.error("リクエスト記録エラー", exception=e)
    
    def record_database_operation(self, operation_type: str, execution_time: float, success: bool = True):
        """データベース操作を記録"""
        try:
            self.metrics.record_database_operation(operation_type, execution_time, success)
        except Exception as e:
            self.logger.error("データベース操作記録エラー", exception=e)
    
    def update_connection_count(self, active_connections: int):
        """接続数を更新"""
        try:
            self.metrics.update_connection_count(active_connections)
        except Exception as e:
            self.logger.error("接続数更新エラー", exception=e)
    
    def get_metrics(self) -> Dict[str, Any]:
        """メトリクスを取得"""
        try:
            return self.metrics.get_metrics()
        except Exception as e:
            self.logger.error("メトリクス取得エラー", exception=e)
            return {}
    
    def get_recent_metrics(self, minutes: int = 5) -> Dict[str, Any]:
        """最近のメトリクスを取得"""
        try:
            return self.metrics.get_recent_metrics(minutes)
        except Exception as e:
            self.logger.error("最近のメトリクス取得エラー", exception=e)
            return {}
    
    def reset_metrics(self):
        """メトリクスをリセット"""
        try:
            self.metrics.reset_metrics()
            self.logger.info("メトリクスをリセットしました")
        except Exception as e:
            self.logger.error("メトリクスリセットエラー", exception=e)


# グローバルインスタンス
_performance_service: Optional[PerformanceService] = None


def get_performance_service() -> PerformanceService:
    """パフォーマンスサービスのインスタンスを取得"""
    global _performance_service
    if _performance_service is None:
        _performance_service = PerformanceService()
    return _performance_service


def get_performance_metrics() -> Dict[str, Any]:
    """パフォーマンスメトリクスを取得（簡易版）"""
    try:
        service = get_performance_service()
        metrics = service.get_metrics()
        
        # APIレスポンス用に整形
        return {
            'total_requests': metrics.get('total_requests', 0),
            'average_response_time': metrics.get('average_response_time', 0.0),
            'error_rate': metrics.get('error_rate', 0.0),
            'active_connections': metrics.get('active_connections', 0)
        }
    except Exception as e:
        logger = get_logger(__name__)
        logger.error("パフォーマンスメトリクス取得エラー", exception=e)
        return {
            'total_requests': 0,
            'average_response_time': 0.0,
            'error_rate': 0.0,
            'active_connections': 0
        } 