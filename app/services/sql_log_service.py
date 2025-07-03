import json
import os
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.logger import get_logger

logger = get_logger("SQLLogService")

class SQLLogService:
    """SQL実行ログ管理サービス"""
    
    def __init__(self, log_file: str = None):
        if log_file is None:
            # デフォルトのログファイルパス
            log_file = os.path.join(os.path.dirname(__file__), '../../sql_execution_logs.json')
        
        self.log_file = log_file
        self._ensure_log_file_exists()
    
    def _ensure_log_file_exists(self):
        """ログファイルが存在しない場合は作成"""
        if not os.path.exists(self.log_file):
            with open(self.log_file, 'w', encoding='utf-8') as f:
                json.dump([], f, ensure_ascii=False, indent=2)
    
    def _load_logs(self) -> List[Dict[str, Any]]:
        """ログファイルからログを読み込み"""
        try:
            with open(self.log_file, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if content:
                    return json.loads(content)
                else:
                    return []
        except Exception as e:
            logger.error(f"ログファイル読み込みエラー: {e}")
            return []
    
    def _save_logs(self, logs: List[Dict[str, Any]]):
        """ログをファイルに保存"""
        try:
            with open(self.log_file, 'w', encoding='utf-8') as f:
                json.dump(logs, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"ログファイル保存エラー: {e}")
    
    def add_log(self, user_id: str, sql: str, execution_time: float, 
                row_count: int, success: bool, error_message: Optional[str] = None) -> str:
        """SQL実行ログを追加"""
        log_id = str(uuid.uuid4())
        log_entry = {
            "log_id": log_id,
            "user_id": user_id,
            "sql": sql,
            "execution_time": execution_time,
            "row_count": row_count,
            "success": success,
            "error_message": error_message,
            "timestamp": datetime.now().isoformat()
        }
        
        logs = self._load_logs()
        logs.append(log_entry)
        
        # 最新の1000件のみ保持
        if len(logs) > 1000:
            logs = logs[-1000:]
        
        self._save_logs(logs)
        logger.info(f"SQL実行ログを追加: {log_id}")
        
        return log_id
    
    def get_logs(self, user_id: Optional[str] = None, limit: int = 100, 
                 offset: int = 0) -> Dict[str, Any]:
        """ログを取得"""
        logs = self._load_logs()
        
        # ユーザーIDでフィルタリング
        if user_id:
            logs = [log for log in logs if log.get("user_id") == user_id]
        
        # 日時順でソート（最新順）
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        # ページネーション
        total_count = len(logs)
        logs = logs[offset:offset + limit]
        
        return {
            "logs": logs,
            "total_count": total_count
        }
    
    def get_user_logs(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """特定ユーザーのログを取得"""
        result = self.get_logs(user_id=user_id, limit=limit)
        return result["logs"]
    
    def get_all_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """全ログを取得（管理者用）"""
        result = self.get_logs(limit=limit)
        return result["logs"]
    
    def clear_logs(self, user_id: Optional[str] = None):
        """ログをクリア"""
        if user_id:
            # 特定ユーザーのログのみクリア
            logs = self._load_logs()
            logs = [log for log in logs if log.get("user_id") != user_id]
            self._save_logs(logs)
            logger.info(f"ユーザー {user_id} のログをクリア")
        else:
            # 全ログをクリア
            self._save_logs([])
            logger.info("全ログをクリア")
    
    def get_log_statistics(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """ログ統計を取得"""
        logs = self._load_logs()
        
        if user_id:
            logs = [log for log in logs if log.get("user_id") == user_id]
        
        if not logs:
            return {
                "total_executions": 0,
                "successful_executions": 0,
                "failed_executions": 0,
                "average_execution_time": 0.0,
                "total_rows_processed": 0
            }
        
        successful_logs = [log for log in logs if log.get("success", False)]
        failed_logs = [log for log in logs if not log.get("success", False)]
        
        total_execution_time = sum(log.get("execution_time", 0) for log in logs)
        total_rows = sum(log.get("row_count", 0) for log in logs)
        
        return {
            "total_executions": len(logs),
            "successful_executions": len(successful_logs),
            "failed_executions": len(failed_logs),
            "average_execution_time": total_execution_time / len(logs) if logs else 0.0,
            "total_rows_processed": total_rows
        } 