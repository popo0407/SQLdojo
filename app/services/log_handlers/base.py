from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, Dict, Any

class BaseLogHandler(ABC):
    """ログハンドラのベースクラス"""
    
    @abstractmethod
    def add_log(self, user_id: str, sql: str, execution_time: float, start_time: datetime, row_count: int, success: bool, error_message: Optional[str] = None):
        """SQL実行ログを追加する"""
        pass
    
    @abstractmethod
    def get_logs(self, user_id: Optional[str] = None, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """SQL実行ログを取得する"""
        pass
    
    @abstractmethod
    def clear_logs(self, user_id: Optional[str] = None):
        """SQL実行ログをクリアする"""
        pass 