# -*- coding: utf-8 -*-
"""
ログ・監視モジュール
アプリケーション全体のログ出力とパフォーマンス監視を管理
"""
import logging
import logging.handlers
import time
import threading
import sys
from typing import Dict, Any, Optional, Callable
from functools import wraps
from collections import defaultdict, deque
from datetime import datetime
import os

from app.config_simplified import get_settings
from app.exceptions import LoggingError
from app.utils import generate_timestamp, format_duration


class PerformanceMonitor:
    """パフォーマンス監視クラス"""
    
    def __init__(self, max_entries: int = 1000):
        self.max_entries = max_entries
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=max_entries))
        self.lock = threading.Lock()
    
    def record_operation(self, operation_name: str, execution_time: float, 
                        success: bool = True, details: Optional[Dict[str, Any]] = None) -> None:
        """操作の実行時間を記録"""
        try:
            with self.lock:
                metric_data = {
                    'timestamp': generate_timestamp(),
                    'execution_time': execution_time,
                    'success': success,
                    'details': details or {}
                }
                self.metrics[operation_name].append(metric_data)
        except Exception as e:
            raise LoggingError(f"パフォーマンスメトリクスの記録に失敗しました: {str(e)}")
    
    def get_metrics(self, operation_name: Optional[str] = None) -> Dict[str, Any]:
        """メトリクスを取得"""
        try:
            with self.lock:
                if operation_name:
                    if operation_name not in self.metrics:
                        return {}
                    
                    entries = list(self.metrics[operation_name])
                    if not entries:
                        return {}
                    
                    execution_times = [entry['execution_time'] for entry in entries]
                    success_count = sum(1 for entry in entries if entry['success'])
                    
                    return {
                        'count': len(entries),
                        'avg_execution_time': sum(execution_times) / len(execution_times),
                        'min_execution_time': min(execution_times),
                        'max_execution_time': max(execution_times),
                        'success_rate': success_count / len(entries),
                        'last_execution': entries[-1]['timestamp'],
                        'recent_entries': entries[-10:]  # 最新10件
                    }
                else:
                    # 全ての操作のメトリクスを取得（再帰呼び出しを避ける）
                    all_metrics = {}
                    for name in self.metrics.keys():
                        try:
                            entries = list(self.metrics[name])
                            if entries:
                                execution_times = [entry['execution_time'] for entry in entries]
                                success_count = sum(1 for entry in entries if entry['success'])
                                
                                all_metrics[name] = {
                                    'count': len(entries),
                                    'avg_execution_time': sum(execution_times) / len(execution_times),
                                    'min_execution_time': min(execution_times),
                                    'max_execution_time': max(execution_times),
                                    'success_rate': success_count / len(entries),
                                    'last_execution': entries[-1]['timestamp'],
                                    'recent_entries': entries[-10:]  # 最新10件
                                }
                        except Exception:
                            # 個別操作のエラーは無視して続行
                            continue
                    return all_metrics
        except Exception as e:
            raise LoggingError(f"メトリクスの取得に失敗しました: {str(e)}")
    
    def clear_metrics(self, operation_name: Optional[str] = None) -> None:
        """メトリクスをクリア"""
        try:
            with self.lock:
                if operation_name:
                    if operation_name in self.metrics:
                        self.metrics[operation_name].clear()
                else:
                    self.metrics.clear()
        except Exception as e:
            raise LoggingError(f"メトリクスのクリアに失敗しました: {str(e)}")

class Logger:
    """拡張ロガークラス"""
    
    def __init__(self, name: str, config=None):
        self.name = name
        self.config = config or get_settings()
        self.logger = self._setup_logger()
        self.performance_monitor = PerformanceMonitor()
    
    def _setup_logger(self) -> logging.Logger:
        """ロガーを設定"""
        try:
            logger = logging.getLogger(self.name)
            
            # 既存のハンドラーをクリア
            if logger.hasHandlers():
                logger.handlers.clear()
            
            # ログレベルを設定
            logger.setLevel(getattr(logging, self.config.log_level))
            
            # フォーマッターを作成
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            
            # コンソールハンドラー
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            logger.addHandler(console_handler)
            
            # ファイルハンドラー（簡素化）
            try:
                log_dir = os.path.dirname('app.log')
                if not os.path.exists(log_dir) and log_dir:
                    os.makedirs(log_dir)

                file_handler = logging.handlers.RotatingFileHandler(
                    'app.log',
                    maxBytes=10 * 1024 * 1024,  # 10MB
                    backupCount=5,
                    encoding='utf-8'
                )
                file_handler.setFormatter(formatter)
                logger.addHandler(file_handler)
            except Exception as e:
                # ファイルハンドラーの作成に失敗した場合はコンソールのみ
                logger.warning(f"ログファイルハンドラーの作成に失敗しました: {str(e)}")
            
            # 親ロガーへの伝播を無効化
            logger.propagate = False
            
            return logger
            
        except Exception as e:
            raise LoggingError(f"ロガーの設定に失敗しました: {str(e)}")
    
    def _log_with_performance(self, level: str, message: str, 
                            operation_name: Optional[str] = None,
                            execution_time: Optional[float] = None,
                            **kwargs) -> None:
        """パフォーマンス情報付きでログ出力"""
        try:
            # 基本ログメッセージ
            log_message = message
            
            # パフォーマンス情報を追加
            if operation_name and execution_time is not None:
                log_message += f" (実行時間: {format_duration(execution_time)})"
                
                # パフォーマンスメトリクスを記録
                self.performance_monitor.record_operation(
                    operation_name, execution_time, 
                    success=level not in ['ERROR', 'CRITICAL'],
                    details=kwargs
                )
            
            # ログ出力
            log_method = getattr(self.logger, level.lower())
            log_method(log_message, extra=kwargs)
            
        except Exception as e:
            # ログ出力に失敗した場合は標準エラーに出力
            print(f"ログ出力エラー: {str(e)}", file=sys.stderr)
    
    def debug(self, message: str, **kwargs) -> None:
        """デバッグログ"""
        log_kwargs = {
            'exc_info': kwargs.pop('exc_info', None),
            'stack_info': kwargs.pop('stack_info', False),
            'stacklevel': kwargs.pop('stacklevel', 1),
            'extra': kwargs
        }
        self.logger.debug(message, **log_kwargs)

    def info(self, message: str, **kwargs) -> None:
        """情報ログ"""
        log_kwargs = {
            'exc_info': kwargs.pop('exc_info', None),
            'stack_info': kwargs.pop('stack_info', False),
            'stacklevel': kwargs.pop('stacklevel', 1),
            'extra': kwargs
        }
        self.logger.info(message, **log_kwargs)

    def warning(self, message: str, **kwargs) -> None:
        """警告ログ"""
        log_kwargs = {
            'exc_info': kwargs.pop('exc_info', None),
            'stack_info': kwargs.pop('stack_info', False),
            'stacklevel': kwargs.pop('stacklevel', 1),
            'extra': kwargs
        }
        self.logger.warning(message, **log_kwargs)

    def error(self, *args, exception: Optional[Exception] = None, **kwargs) -> None:
        """エラーログ (後方互換・衝突耐性付き)

        対応パターン:
          logger.error("msg")
          logger.error("msg", key=value)
          logger.error("msg %s", val)
          logger.error("msg", exception=e)
          logger.error(message="msg")  # キーワード指定互換
          logger.error("msg", message="dup")  # 重複時は最初の位置引数を優先

        * 予約キー 'message' は extra へ流さず除去
        * exception 指定時は exc_info を自動有効化
        """
        if args:
            msg = args[0]
            fmt_args = args[1:]
        else:
            # キーワード message のみ
            msg = kwargs.pop('message', '')
            fmt_args = ()

        # 衝突する可能性のある 'message' キーを除去 (extra 内に混入させない)
        if 'message' in kwargs:
            kwargs.pop('message', None)

        exc_info_val = kwargs.pop('exc_info', None)
        if exception and exc_info_val is None:
            exc_info_val = True
        if exception:
            kwargs['exception'] = str(exception)
            kwargs['exception_type'] = type(exception).__name__

        log_kwargs = {
            'exc_info': exc_info_val,
            'stack_info': kwargs.pop('stack_info', False),
            'stacklevel': kwargs.pop('stacklevel', 1),
            'extra': kwargs
        }
        try:
            self.logger.error(msg, *fmt_args, **log_kwargs)
        except TypeError:
            # フォーマット不整合など最小限フォールバック
            self.logger.error(str(msg), **log_kwargs)

    def critical(self, message: str, exception: Optional[Exception] = None, **kwargs) -> None:
        """重大エラーログ"""
        exc_info_val = kwargs.pop('exc_info', None)
        if exception and exc_info_val is None:
            exc_info_val = True

        if exception:
            kwargs['exception'] = str(exception)
            kwargs['exception_type'] = type(exception).__name__

        log_kwargs = {
            'exc_info': exc_info_val,
            'stack_info': kwargs.pop('stack_info', False),
            'stacklevel': kwargs.pop('stacklevel', 1),
            'extra': kwargs
        }
        self.logger.critical(message, **log_kwargs)
    
    def log_performance(self, operation_name: str, execution_time: float, **kwargs) -> None:
        """パフォーマンスログ"""
        self._log_with_performance('INFO', f"パフォーマンス記録: {operation_name}", 
                                 operation_name, execution_time, **kwargs)
    
    def log_sql_execution(self, sql: str, execution_time: float, 
                         row_count: Optional[int] = None, success: bool = True, **kwargs) -> None:
        """SQL実行ログ"""
        message = f"SQL実行: {sql[:100]}{'...' if len(sql) > 100 else ''}"
        if row_count is not None:
            message += f" (行数: {row_count})"
        
        level = 'INFO' if success else 'ERROR'
        self._log_with_performance(level, message, 'sql_execution', execution_time, **kwargs)
    
    def log_sql_validation(self, sql: str, is_valid: bool, 
                          error_message: Optional[str] = None, **kwargs) -> None:
        """SQLバリデーションログ"""
        message = f"SQLバリデーション: {sql[:100]}{'...' if len(sql) > 100 else ''}"
        if not is_valid and error_message:
            message += f" (エラー: {error_message})"
        
        level = 'INFO' if is_valid else 'WARNING'
        self.logger.log(getattr(logging, level), message, extra=kwargs)
    
    def log_user_action(self, action: str, user_id: Optional[str] = None, **kwargs) -> None:
        """ユーザーアクションログ"""
        message = f"ユーザーアクション: {action}"
        if user_id:
            message += f" (ユーザー: {user_id})"
        
        self.logger.info(message, extra=kwargs)
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """パフォーマンスメトリクスを取得"""
        return self.performance_monitor.get_metrics()

# グローバルロガーインスタンス
_loggers: Dict[str, Logger] = {}


def get_logger(name: str = "snowsight_app") -> Logger:
    """ロガーを取得（シングルトン）"""
    if name not in _loggers:
        _loggers[name] = Logger(name)
    return _loggers[name]


def log_execution_time(operation_name: str):
    """実行時間を記録するデコレーター"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            logger = get_logger()
            
            try:
                result = await func(*args, **kwargs)
                execution_time = time.time() - start_time
                logger.log_performance(operation_name, execution_time, success=True)
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                logger.log_performance(operation_name, execution_time, success=False, error=str(e))
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            logger = get_logger()
            
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                logger.log_performance(operation_name, execution_time, success=True)
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                logger.log_performance(operation_name, execution_time, success=False, error=str(e))
                raise
        
        # 非同期関数かどうかを判定
        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def clear_all_loggers() -> None:
    """全てのロガーをクリア"""
    global _loggers
    _loggers.clear()


def get_performance_metrics() -> Dict[str, Any]:
    """全体的なパフォーマンスメトリクスを取得"""
    return get_logger().get_performance_metrics()


def log_user_action(action: str, user_id: Optional[str] = None, **kwargs) -> None:
    """ユーザーアクションをログに記録"""
    get_logger().log_user_action(action, user_id, **kwargs) 