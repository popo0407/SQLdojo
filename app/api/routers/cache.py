# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException, Body, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime
import csv
import io
import inspect
import asyncio

from app.config_simplified import get_settings
from app.api.models import (
    CacheSQLRequest, CacheSQLResponse, CacheReadRequest, CacheReadResponse,
    SessionStatusResponse, CancelRequest, CancelResponse, CacheUniqueValuesRequest, CacheUniqueValuesResponse,
    DummyDataRequest, DummyDataResponse
)
from app.dependencies import (
    HybridSQLServiceDep, CurrentUserDep, SQLLogServiceDep,
    StreamingStateServiceDep, SessionServiceDep
)
from app.services.cache_cleanup_service import CacheCleanupService
from app.logger import Logger

logger = Logger(__name__)
router = APIRouter(prefix="/sql/cache", tags=["cache"])


@router.post("/execute", response_model=CacheSQLResponse)
async def execute_sql_with_cache_endpoint(
    request: CacheSQLRequest,
    hybrid_sql_service: HybridSQLServiceDep,
    current_user: CurrentUserDep,
    sql_log_service: SQLLogServiceDep,
):
    if not request.sql:
        raise HTTPException(status_code=400, detail="SQLクエリが無効です")
    start_time = datetime.now()
    try:
        maybe = hybrid_sql_service.execute_sql_with_cache(request.sql, current_user["user_id"], request.limit)
        result = await maybe if inspect.isawaitable(maybe) else maybe
    except Exception as e:
        logger.error(f"キャッシュ付きSQL実行エラー: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    if result.get("status") == "requires_confirmation":
        return CacheSQLResponse(success=False, session_id=None, total_count=result["total_count"], processed_rows=0, execution_time=0, message=result["message"], error_message=None)
    response = CacheSQLResponse(
        success=result["success"],
        session_id=result["session_id"],
        total_count=result["total_count"],
        processed_rows=result["processed_rows"],
        execution_time=result["execution_time"],
        message=result["message"],
        error_message=result.get("error_message"),
    )
    maybe_log = sql_log_service.add_log_to_db(
        current_user["user_id"], request.sql, result["execution_time"], start_time, result["processed_rows"], result["success"], result.get("error_message")
    )
    if inspect.isawaitable(maybe_log):
        await maybe_log
    if not result["success"]:
        return CacheSQLResponse(success=False, session_id=None, total_count=0, processed_rows=0, execution_time=result.get("execution_time", 0), message=None, error_message=result.get("error_message", "SQL実行に失敗しました"))
    return response

@router.post("/execute-async", response_model=CacheSQLResponse)
async def execute_sql_with_cache_async_endpoint(
    request: CacheSQLRequest,
    background_tasks: BackgroundTasks,
    hybrid_sql_service: HybridSQLServiceDep,
    current_user: CurrentUserDep,
    sql_log_service: SQLLogServiceDep,
):
    """軽量非同期対応: 即座にsession_idを返却し、バックグラウンドで処理実行（対策案3）"""
    if not request.sql:
        raise HTTPException(status_code=400, detail="SQLクエリが無効です")
    
    start_time = datetime.now()
    
    try:
        # 軽量検証を実行し、即座にsession_idを取得
        maybe_prepare = hybrid_sql_service.prepare_sql_execution(
            request.sql, current_user["user_id"], request.limit
        )
        prepare_result = await maybe_prepare if inspect.isawaitable(maybe_prepare) else maybe_prepare
        
        # 確認要求やエラーの場合は即座に返却
        if prepare_result.get("status") == "requires_confirmation":
            return CacheSQLResponse(
                success=False, 
                session_id=None, 
                total_count=prepare_result["total_count"], 
                processed_rows=0, 
                execution_time=0, 
                message=prepare_result["message"], 
                error_message=None
            )
        
        if not prepare_result.get("success", True):
            return CacheSQLResponse(
                success=False, 
                session_id=None, 
                total_count=0, 
                processed_rows=0, 
                execution_time=0, 
                message=None, 
                error_message=prepare_result.get("error_message", "SQL実行に失敗しました")
            )
        
        session_id = prepare_result["session_id"]
        
        # バックグラウンドタスクでSQL実行を開始
        background_tasks.add_task(
            hybrid_sql_service.execute_sql_background,
            request.sql,
            session_id,
            current_user["user_id"],
            request.limit
        )
        
        # バックグラウンドタスクでログ記録も追加
        background_tasks.add_task(
            log_sql_execution_async,
            sql_log_service,
            current_user["user_id"],
            request.sql,
            start_time,
            session_id
        )
        
        # 即座にsession_idとprocessing状態を返却
        return CacheSQLResponse(
            success=True,
            session_id=session_id,
            total_count=prepare_result["total_count"],
            processed_rows=0,
            execution_time=0,
            message=prepare_result["message"],
            error_message=None,
            status="processing"
        )
        
    except Exception as e:
        logger.error(f"軽量非同期SQL実行エラー: {e}")
        raise HTTPException(status_code=400, detail=str(e))


async def log_sql_execution_async(
    sql_log_service, 
    user_id: str, 
    sql: str, 
    start_time: datetime, 
    session_id: str
):
    """バックグラウンドでのSQL実行ログ記録"""
    try:
        # セッション完了まで待機（最大5分）
        max_wait_time = 300  # 5分
        wait_interval = 1    # 1秒間隔
        
        for _ in range(max_wait_time):
            # セッション情報を取得してチェック
            from app.dependencies import get_cache_service_di
            cache_service = get_cache_service_di()
            session_info = cache_service.get_session_info(session_id)
            
            if session_info and session_info.get('is_complete', False):
                # 完了していればログ記録
                execution_time = session_info.get('execution_time', 0)
                processed_rows = session_info.get('processed_rows', 0)
                
                maybe_log = sql_log_service.add_log_to_db(
                    user_id, sql, execution_time, start_time, processed_rows, True, None
                )
                if inspect.isawaitable(maybe_log):
                    await maybe_log
                
                logger.info(f"バックグラウンドログ記録完了: {session_id}")
                break
            
            # 1秒待機
            await asyncio.sleep(wait_interval)
        else:
            # タイムアウトの場合
            logger.warning(f"ログ記録タイムアウト: {session_id}")
            
    except Exception as e:
        logger.error(f"バックグラウンドログ記録エラー: {e}")


@router.post("/read", response_model=CacheReadResponse)
async def read_cached_data_endpoint(request: CacheReadRequest = Body(...), hybrid_sql_service: HybridSQLServiceDep = None):
    try:
        result = hybrid_sql_service.get_cached_data(
            request.session_id,
            request.page,
            request.page_size,
            request.filters,
            request.extended_filters,
            request.sort_by,
            request.sort_order,
        )
        result = await result if inspect.isawaitable(result) else result
        return CacheReadResponse(
            success=result["success"],
            data=result["data"],
            columns=result["columns"],
            total_count=result["total_count"],
            page=result["page"],
            page_size=result["page_size"],
            total_pages=result["total_pages"],
            session_info=result["session_info"],
            execution_time=result.get("execution_time"),
            error_message=result.get("error_message"),
        )
    except Exception as e:
        logger.error(f"キャッシュデータ読み出しエラー: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status/{session_id}", response_model=SessionStatusResponse)
async def get_session_status_endpoint(session_id: str, streaming_state_service: StreamingStateServiceDep):
    state = streaming_state_service.get_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")
    progress = (state["processed_count"] / state["total_count"]) * 100 if state["total_count"] > 0 else 0
    return SessionStatusResponse(
        session_id=state["session_id"],
        status=state["status"],
        total_count=state["total_count"],
        processed_count=state["processed_count"],
        progress_percentage=progress,
        is_complete=state["status"] == "completed",
        error_message=state.get("error_message"),
    )


@router.post("/cancel", response_model=CancelResponse)
async def cancel_streaming_endpoint(request: CancelRequest, streaming_state_service: StreamingStateServiceDep, hybrid_sql_service: HybridSQLServiceDep):
    success = streaming_state_service.cancel_streaming(request.session_id)
    if success:
        maybe = hybrid_sql_service.cleanup_session(request.session_id)
        if inspect.isawaitable(maybe):
            await maybe
        return CancelResponse(success=True, message="ストリーミングをキャンセルしました")
    return CancelResponse(success=False, error_message="キャンセルできませんでした")


@router.delete("/session/{session_id}")
async def cleanup_session_endpoint(session_id: str, hybrid_sql_service: HybridSQLServiceDep, session_service: SessionServiceDep, streaming_state_service: StreamingStateServiceDep):
    hybrid_sql_service.cleanup_session(session_id)
    session_service.cleanup_session(session_id)
    streaming_state_service.cleanup_state(session_id)
    return {"message": "セッションをクリーンアップしました"}


@router.delete("/user/{user_id}")
async def cleanup_user_cache_endpoint(user_id: str, hybrid_sql_service: HybridSQLServiceDep, session_service: SessionServiceDep, streaming_state_service: StreamingStateServiceDep):
    try:
        try:
            hybrid_sql_service.cleanup_user_sessions(user_id)
        except Exception as e:
            logger.error(f"HybridSQLService クリーンアップエラー: {e}")
        try:
            session_service.cleanup_user_sessions(user_id)
        except Exception as e:
            logger.error(f"SessionService クリーンアップエラー: {e}")
        try:
            streaming_state_service.cleanup_user_states(user_id)
        except Exception as e:
            logger.error(f"StreamingStateService クリーンアップエラー: {e}")
        return {"message": f"ユーザー {user_id} の全キャッシュをクリーンアップしました"}
    except Exception as e:
        logger.error(f"ユーザーキャッシュクリーンアップエラー: {e}")
        return {"message": "キャッシュクリーンアップを試行しました"}


@router.delete("/current-user")
async def cleanup_current_user_cache_endpoint(current_user: CurrentUserDep, hybrid_sql_service: HybridSQLServiceDep, session_service: SessionServiceDep, streaming_state_service: StreamingStateServiceDep):
    user_id = current_user["user_id"]
    try:
        try:
            hybrid_sql_service.cleanup_user_sessions(user_id)
        except Exception as e:
            logger.error(f"HybridSQLService クリーンアップエラー: {e}")
        try:
            session_service.cleanup_user_sessions(user_id)
        except Exception as e:
            logger.error(f"SessionService クリーンアップエラー: {e}")
        try:
            streaming_state_service.cleanup_user_states(user_id)
        except Exception as e:
            logger.error(f"StreamingStateService クリーンアップエラー: {e}")
        return {"message": f"ユーザー {user_id} の全キャッシュをクリーンアップしました"}
    except Exception as e:
        logger.error(f"現在のユーザーキャッシュクリーンアップエラー: {e}")
        return {"message": "キャッシュクリーンアップを試行しました"}


@router.post("/download/csv")
async def download_cached_csv_endpoint(request: CacheReadRequest = Body(...), hybrid_sql_service: HybridSQLServiceDep = None):
    if not request.session_id:
        raise HTTPException(status_code=400, detail="session_idが必要です")
    try:
        settings = get_settings()
        result = hybrid_sql_service.get_cached_data(
            request.session_id,
            page=1,
            page_size=settings.max_records_for_csv_download,
            filters=request.filters,
            sort_by=request.sort_by,
            sort_order=request.sort_order,
        )
        result = await result if inspect.isawaitable(result) else result
    except Exception as e:
        logger.error(f"キャッシュCSVダウンロード用データ取得エラー: {e}")
        raise HTTPException(status_code=500, detail=f"CSVダウンロードに失敗しました: {str(e)}")
    if not result["success"] or not result["data"] or not result["columns"]:
        raise HTTPException(status_code=404, detail="CSVダウンロードに失敗しました: データが見つかりません")
    output = io.StringIO(); writer = csv.writer(output)
    writer.writerow(result["columns"])  # header
    for row in result["data"]:
        writer.writerow(row)
    csv_content = output.getvalue(); output.close()
    filename = f"query_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(io.StringIO(csv_content), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.post("/unique-values", response_model=CacheUniqueValuesResponse)
async def get_cache_unique_values(request: CacheUniqueValuesRequest, hybrid_sql_service: HybridSQLServiceDep):
    try:
        result = hybrid_sql_service.get_unique_values(request.session_id, request.column_name, request.limit, request.filters, request.extended_filters)
        return CacheUniqueValuesResponse(values=result["values"], total_count=result["total_count"], is_truncated=result["is_truncated"])
    except Exception as e:
        logger.error(f"キャッシュユニーク値取得エラー: {e}")
        raise HTTPException(status_code=500, detail=f"ユニーク値の取得に失敗しました: {str(e)}")


@router.post("/admin/cleanup")
async def manual_cache_cleanup():
    """管理者用：手動キャッシュクリーンアップ実行"""
    try:
        cleanup_service = CacheCleanupService()
        result = await cleanup_service.manual_cleanup()
        return result
    except Exception as e:
        logger.error(f"手動キャッシュクリーンアップエラー: {e}")
        raise HTTPException(status_code=500, detail=f"クリーンアップに失敗しました: {str(e)}")


@router.post("/dummy-data", response_model=DummyDataResponse)
async def generate_dummy_data_endpoint(
    request: DummyDataRequest,
    hybrid_sql_service: HybridSQLServiceDep,
    current_user: CurrentUserDep,
    sql_log_service: SQLLogServiceDep,
):
    """グラフテスト用ダミーデータを生成してキャッシュに保存"""
    import uuid
    import random
    from datetime import datetime, timedelta
    
    start_time = datetime.now()
    
    try:
        # ダミーデータを生成
        row_count = min(request.row_count or 10000, 50000)  # 最大50000行に制限
        
        # 日付・日時データ（過去から未来まで幅広い範囲 + テスト用データ）
        base_date = datetime(2023, 1, 1)  # 2023年1月1日から開始
        dates = []
        datetimes = []
        
        # 基本データ（時系列順）
        for i in range(row_count - 5):  # 最後の5つは特別なテストデータ用に予約
            # 日付を順次進める（1日に4レコード）
            current_date = base_date + timedelta(days=i // 4)
            current_time = current_date.replace(
                hour=6 + (i % 4) * 4,  # 6時, 10時, 14時, 18時
                minute=random.randint(0, 59),  # ランダムな分
                second=0   # 秒は00に固定
            )
            
            dates.append(current_date.strftime('%Y-%m-%d'))
            # YYYY-MM-DDTHH:MM:SS形式の日時文字列
            datetimes.append(current_time.strftime('%Y-%m-%dT%H:%M:%S'))
        
        # テスト用の特別なデータ（時系列順序テスト）
        test_dates_times = [
            (datetime(2025, 11, 1, 0, 0, 0), '2025-11-01T00:00:00'),  # 未来の日付
            (datetime(2023, 1, 15, 12, 30, 0), '2023-01-15T12:30:00'),  # 過去の日付
            (datetime(2024, 12, 31, 23, 59, 0), '2024-12-31T23:59:00'),  # 年末
            (datetime(2025, 1, 1, 0, 0, 0), '2025-01-01T00:00:00'),  # 年始
            (datetime(2024, 6, 15, 12, 0, 0), '2024-06-15T12:00:00'),  # 真ん中の日付
        ]
        
        for test_date, test_datetime in test_dates_times:
            dates.append(test_date.strftime('%Y-%m-%d'))
            datetimes.append(test_datetime)
        
        # 数値データ（波形変動を追加）
        sales = []
        profits = []
        for i in range(row_count):
            import math
            base_sales = random.randint(100000, 5000000)
            sales_variation = math.sin(i * 0.1) * 500000
            final_sales = int(base_sales + sales_variation)
            sales.append(max(final_sales, 100000))  # 最小10万円
            
            profit_rate = random.uniform(0.1, 0.3)  # 10-30%
            profits.append(int(final_sales * profit_rate))
        
        # 文字列データ
        regions = ['東京', '大阪', '名古屋', '福岡', '札幌']
        categories = ['電子機器', '衣料品', '食品', '書籍', '雑貨']
        
        region_data = [random.choice(regions) for _ in range(row_count)]
        category_data = [random.choice(categories) for _ in range(row_count)]
        
        # 辞書形式でデータを作成（フロントエンドと同じカラム名）
        data_list = []
        for i in range(row_count):
            data_list.append({
                '日付': dates[i],
                '日時': datetimes[i],
                '売上高': sales[i],
                '利益': profits[i],
                '地域': region_data[i],
                '商品カテゴリ': category_data[i]
            })
        
        columns = ['日付', '日時', '売上高', '利益', '地域', '商品カテゴリ']
        
        # セッションIDを生成（既存のキャッシュ命名規則に合わせる）
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        session_id = f"cache_dummy_{timestamp}_000"
        
        # キャッシュサービスを使ってデータを保存
        cache_service = hybrid_sql_service.cache_service
        
        # セッションを登録
        cache_service.register_session(session_id, current_user["user_id"], row_count)
        
        # キャッシュテーブルを作成
        table_name = cache_service.create_cache_table(session_id, columns)
        
        # データをリスト形式に変換してチャンク挿入
        data_rows = []
        for item in data_list:
            row = [item[col] for col in columns]
            data_rows.append(row)
        
        # データを挿入（session_idを指定）
        inserted_count = cache_service.insert_chunk(table_name, data_rows, session_id=session_id)
        
        # セッションを完了状態に更新
        execution_time = (datetime.now() - start_time).total_seconds()
        cache_service.update_session_progress(session_id, inserted_count, True, execution_time)
        cache_service.complete_active_session(session_id)
        
        # SQL実行ログを記録（ダミーデータ生成として記録）
        dummy_sql = f"-- ダミーデータ生成 ({row_count}行)"
        maybe_log = sql_log_service.add_log_to_db(
            current_user["user_id"], 
            dummy_sql, 
            execution_time, 
            start_time, 
            row_count, 
            True, 
            None
        )
        if inspect.isawaitable(maybe_log):
            await maybe_log
        
        return DummyDataResponse(
            success=True,
            session_id=session_id,
            total_count=row_count,
            processed_rows=row_count,
            execution_time=execution_time,
            message=f"ダミーデータ（{row_count}行）を生成しました",
            error_message=None
        )
        
    except Exception as e:
        logger.error(f"ダミーデータ生成エラー: {e}")
        execution_time = (datetime.now() - start_time).total_seconds()
        
        return DummyDataResponse(
            success=False,
            session_id=None,
            total_count=0,
            processed_rows=0,
            execution_time=execution_time,
            message=None,
            error_message=f"ダミーデータ生成に失敗しました: {str(e)}"
        )
