# -*- coding: utf-8 -*-
"""
アプリケーション共通のユーティリティ関数
"""
import time
import json
import hashlib
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from pathlib import Path


def generate_timestamp() -> float:
    """現在のUNIXタイムスタンプを取得"""
    return time.time()


def format_datetime(dt: datetime) -> str:
    """datetimeをISO形式の文字列に変換"""
    return dt.isoformat()


def safe_json_serialize(obj: Any) -> str:
    """JSONシリアライゼーション（datetime対応）"""
    def json_serializer(obj):
        if isinstance(obj, datetime):
            return format_datetime(obj)
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
    
    return json.dumps(obj, default=json_serializer, ensure_ascii=False)


def calculate_hash(data: str) -> str:
    """データのSHA256ハッシュを計算"""
    return hashlib.sha256(data.encode('utf-8')).hexdigest()


def validate_file_path(file_path: str) -> bool:
    """ファイルパスの妥当性をチェック"""
    try:
        path = Path(file_path)
        return path.is_file() or path.parent.exists()
    except Exception:
        return False


def sanitize_filename(filename: str) -> str:
    """ファイル名を安全な形式に変換"""
    import re
    # 危険な文字を除去
    sanitized = re.sub(r'[<>:"/\\|?*]', '_', filename)
    # 連続するアンダースコアを単一に
    sanitized = re.sub(r'_+', '_', sanitized)
    # 先頭末尾のアンダースコアを除去
    sanitized = sanitized.strip('_')
    return sanitized or 'unnamed_file'


def chunk_list(lst: List[Any], chunk_size: int) -> List[List[Any]]:
    """リストを指定サイズのチャンクに分割"""
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]


def merge_dicts(dict1: Dict[str, Any], dict2: Dict[str, Any]) -> Dict[str, Any]:
    """辞書をマージ（dict2が優先）"""
    result = dict1.copy()
    result.update(dict2)
    return result


def get_nested_value(data: Dict[str, Any], keys: List[str], default: Any = None) -> Any:
    """ネストした辞書から値を取得"""
    current = data
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return default
    return current


def set_nested_value(data: Dict[str, Any], keys: List[str], value: Any) -> None:
    """ネストした辞書に値を設定"""
    current = data
    for key in keys[:-1]:
        if key not in current:
            current[key] = {}
        current = current[key]
    current[keys[-1]] = value


def format_file_size(size_bytes: int) -> str:
    """ファイルサイズを人間が読みやすい形式に変換"""
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f} {size_names[i]}"


def format_duration(seconds: float) -> str:
    """秒数を人間が読みやすい形式に変換"""
    if seconds < 1:
        return f"{seconds * 1000:.1f}ms"
    elif seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        remaining_seconds = seconds % 60
        return f"{minutes}m {remaining_seconds:.1f}s"
    else:
        hours = int(seconds // 3600)
        remaining_minutes = int((seconds % 3600) // 60)
        return f"{hours}h {remaining_minutes}m"


def retry_on_exception(max_retries: int = 3, delay: float = 1.0, backoff: float = 2.0):
    """例外発生時のリトライデコレータ"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            last_exception = None
            current_delay = delay
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries:
                        time.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        break
            
            raise last_exception
        
        return wrapper
    return decorator 