# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException, Request, Depends
import asyncio
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

from app.api.models import UserInfo
from app.dependencies import MetadataServiceDep, VisibilityControlServiceDep, CurrentUserDep
from ._helpers import run_in_threadpool, get_master_data_service
from app.logger import Logger
from app.exceptions import BaseAppException, MetadataError

logger = Logger(__name__)
router = APIRouter(prefix="/metadata", tags=["metadata"])


@router.get("/all", response_model=List[Dict[str, Any]])
async def get_all_metadata_endpoint(
    metadata_service: MetadataServiceDep, visibility_service: VisibilityControlServiceDep, current_user: CurrentUserDep
):
    logger.info("全メタデータ取得要求（キャッシュ利用）")
    all_metadata = await run_in_threadpool(metadata_service.get_all_metadata)
    user_role = current_user.get("role", "DEFAULT")
    filtered = await run_in_threadpool(visibility_service.filter_metadata, all_metadata, user_role)
    return filtered


@router.get("/initial", response_model=List[Dict[str, Any]])
async def get_initial_metadata_endpoint(metadata_service: MetadataServiceDep):
    logger.info("初期メタデータ取得要求（キャッシュのみ）")
    return await run_in_threadpool(metadata_service.get_all_metadata)


@router.get("/raw", response_model=List[Dict[str, Any]])
async def get_raw_metadata_endpoint(metadata_service: MetadataServiceDep):
    logger.info("生メタデータ取得要求（フィルタリングなし）")
    all_metadata = await run_in_threadpool(metadata_service.get_all_metadata)
    from fastapi.responses import JSONResponse
    resp = JSONResponse(content=all_metadata)
    resp.headers["Deprecation"] = "true"
    resp.headers["Sunset"] = (datetime.utcnow() + timedelta(days=90)).strftime("%a, %d %b %Y %H:%M:%S GMT")
    resp.headers["Link"] = "</api/v1/metadata/all>; rel=successor-version"
    return resp


@router.get("/admin/all-raw")
async def get_all_metadata_raw_admin_endpoint(visibility_service: VisibilityControlServiceDep, metadata_service: MetadataServiceDep):
    """互換用: 管理者の生メタデータ取得（段階的廃止ヘッダ付き）"""
    all_metadata = await run_in_threadpool(metadata_service.get_all_metadata)
    from fastapi.responses import JSONResponse
    resp = JSONResponse(content=all_metadata)
    resp.headers["Deprecation"] = "true"
    resp.headers["Sunset"] = (datetime.utcnow() + timedelta(days=90)).strftime("%a, %d %b %Y %H:%M:%S GMT")
    resp.headers["Link"] = "</api/v1/metadata/refresh>; rel=successor-version"
    return resp


@router.post("/refresh", response_model=List[Dict[str, Any]])
async def refresh_all_metadata_endpoint(
    metadata_service: MetadataServiceDep,
    master_data_service=Depends(get_master_data_service)
):
    """メタデータとマスター情報の強制更新。

    重い処理のため、即時にレスポンスを返す方針。
    - まずバックグラウンドでメタデータとマスター情報の更新を開始
    - 可能なら短時間だけ待機して完了を待つ
    - 間に合わなければ現在のキャッシュを返す（フロントのタイムアウトを避ける）
    """
    logger.info("メタデータとマスター情報の強制更新要求(非同期起動)")
    loop = asyncio.get_running_loop()
    # バックグラウンドで開始（メタデータとマスター情報の両方を更新）
    future = loop.run_in_executor(None, metadata_service.refresh_full_metadata_and_master_cache, master_data_service)
    try:
        # 短時間だけ待機（例: 2.5秒）
        await asyncio.wait_for(asyncio.shield(asyncio.wrap_future(future)), timeout=2.5)
        logger.info("メタデータとマスター情報の強制更新: 短時間で完了")
    except asyncio.TimeoutError:
        logger.warning("メタデータとマスター情報の強制更新: バックグラウンド継続中(タイムアウト)")
        # タスクは継続中。ここでは待たずに返す。
    except Exception as e:
        logger.error(f"メタデータとマスター情報の強制更新エラー: {e}")
        # エラー時も最新取得は試みる
    # 直近のキャッシュ（または更新済みなら最新）を返す
    return await run_in_threadpool(metadata_service.get_all_metadata)


@router.get("/schemas")
async def get_schemas_endpoint(metadata_service: MetadataServiceDep, request: Request):
    try:
        schemas = await run_in_threadpool(metadata_service.get_schemas)
        if request.query_params.get("compat") == "1":
            return {"schemas": schemas}
        return schemas
    except MetadataError as e:
        # テスト要件: MetadataError は 400 で返す
        raise HTTPException(status_code=400, detail=str(e))
    except BaseAppException as e:
        # その他のアプリ例外はハンドラーへ
        raise e
    except Exception as e:
        logger.error(f"メタデータ取得エラー(スキーマ): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schemas/{schema_name}/tables", response_model=List[Dict[str, Any]])
async def get_tables_endpoint(schema_name: str, metadata_service: MetadataServiceDep):
    try:
        return await run_in_threadpool(metadata_service.get_tables, schema_name)
    except Exception as e:
        logger.error(f"メタデータ取得エラー(テーブル): {e}")
        raise HTTPException(status_code=500, detail="メタデータ取得に失敗しました")


@router.get("/schemas/{schema_name}/tables/{table_name}/columns", response_model=List[Dict[str, Any]])
async def get_columns_endpoint(schema_name: str, table_name: str, metadata_service: MetadataServiceDep):
    try:
        return await run_in_threadpool(metadata_service.get_columns, schema_name, table_name)
    except Exception as e:
        logger.error(f"メタデータ取得エラー(カラム): {e}")
        raise HTTPException(status_code=500, detail="メタデータ取得に失敗しました")


@router.get("/visibility-settings")
async def get_visibility_settings_for_user(visibility_service: VisibilityControlServiceDep):
    get_fn = getattr(visibility_service, "get_all_visibility_settings", None) or visibility_service.get_all_settings
    settings = await run_in_threadpool(get_fn)
    return {"settings": settings}


@router.post("/refresh-cache")
async def refresh_all_metadata_normalized_endpoint(metadata_service: MetadataServiceDep):
    logger.info("メタデータキャッシュ更新要求")
    await run_in_threadpool(metadata_service.refresh_full_metadata_cache)
    return {"message": "メタデータキャッシュが更新されました"}


@router.delete("/cache")
async def clear_cache_endpoint(metadata_service: MetadataServiceDep):
    logger.info("メタデータキャッシュクリア要求")
    await run_in_threadpool(metadata_service.clear_cache)
    return {"message": "メタデータキャッシュがクリアされました"}


# Legacy compat endpoints
@router.get("/tables")
async def get_tables_legacy(schema_name: Optional[str] = None, metadata_service: MetadataServiceDep = None):
    try:
        if not schema_name:
            raise HTTPException(status_code=400, detail="schema_name は必須です")
        tables = await run_in_threadpool(metadata_service.get_tables, schema_name)
        return {"tables": tables}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"予期しないエラー(テーブル 互換): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/columns")
async def get_columns_legacy(schema_name: Optional[str] = None, table_name: Optional[str] = None, metadata_service: MetadataServiceDep = None):
    try:
        if not schema_name:
            raise HTTPException(status_code=400, detail="schema_name は必須です")
        if not table_name:
            raise HTTPException(status_code=400, detail="table_name は必須です")
        columns = await run_in_threadpool(metadata_service.get_columns, schema_name, table_name)
        return {"columns": columns}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"予期しないエラー(カラム 互換): {e}")
        raise HTTPException(status_code=500, detail=str(e))
