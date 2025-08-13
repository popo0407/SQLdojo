# -*- coding: utf-8 -*-
"""共通ユーティリティ（スレッドプール実行など）"""
import asyncio
from concurrent.futures import ThreadPoolExecutor

# グローバル ThreadPoolExecutor（オリジナル互換: max_workers=4）
_thread_pool = ThreadPoolExecutor(max_workers=4)


def run_in_threadpool(func, *args, **kwargs):
    """関数をスレッドプールで実行する（同期関数を非同期にラップ）"""
    loop = asyncio.get_event_loop()
    return loop.run_in_executor(_thread_pool, lambda: func(*args, **kwargs))


def maybe_await(maybe):
    """値が awaitable なら await して返すための補助。呼び出し側で `await` を付けて呼ぶ。"""
    return maybe
