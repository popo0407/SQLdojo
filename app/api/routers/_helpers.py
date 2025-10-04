# -*- coding: utf-8 -*-
"""共通ユーティリティ（スレッドプール実行など）"""
import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.dependencies import (
    get_query_executor_di,
    get_metadata_cache_di,
    get_metadata_service_di,
    get_connection_manager_di
)
from app.services.master_data_service import MasterDataService
from app.services.scheduler_service import SchedulerService
from app.services.master_search_preference_service import MasterSearchPreferenceService

# グローバル ThreadPoolExecutor（オリジナル互換: max_workers=4）
_thread_pool = ThreadPoolExecutor(max_workers=4)

# サービスインスタンス（シングルトン）
_master_data_service = None
_scheduler_service = None
_master_search_preference_service = None


def run_in_threadpool(func, *args, **kwargs):
    """関数をスレッドプールで実行する（同期関数を非同期にラップ）"""
    loop = asyncio.get_event_loop()
    return loop.run_in_executor(_thread_pool, lambda: func(*args, **kwargs))


def maybe_await(maybe):
    """値が awaitable なら await して返すための補助。呼び出し側で `await` を付けて呼ぶ。"""
    return maybe


# 依存関係注入用ファクトリ関数

def get_master_data_service():
    """MasterDataServiceのインスタンスを取得（シングルトン）"""
    global _master_data_service
    if _master_data_service is None:
        # 依存関係を手動で解決
        connection_manager = get_connection_manager_di()
        query_executor = get_query_executor_di(connection_manager)
        metadata_cache = get_metadata_cache_di()
        _master_data_service = MasterDataService(query_executor, metadata_cache)
    return _master_data_service


def get_scheduler_service():
    """SchedulerServiceのインスタンスを取得（シングルトン）"""
    global _scheduler_service
    if _scheduler_service is None:
        _scheduler_service = SchedulerService()
        # MasterDataServiceの設定
        _scheduler_service.set_master_data_service(get_master_data_service())
    return _scheduler_service


def get_master_search_preference_service():
    """MasterSearchPreferenceServiceのインスタンスを取得（シングルトン）"""
    global _master_search_preference_service
    if _master_search_preference_service is None:
        metadata_cache = get_metadata_cache_di()
        _master_search_preference_service = MasterSearchPreferenceService(metadata_cache)
    return _master_search_preference_service
