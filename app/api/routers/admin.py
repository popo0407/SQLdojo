# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException, Body
from typing import List
from datetime import datetime, timedelta

from app.config_simplified import get_settings
from app.api.models import (
    TemplateRequest, TemplateResponse, PartRequest, PartResponse,
    UserRefreshResponse, BusinessUserListResponse, BusinessUserRefreshResponse, UserInfo,
    UserTemplatePreferencesResponse, UserPartPreferencesResponse,
    UpdateTemplatePreferencesRequest, UpdatePartPreferencesRequest,
    UpdateTemplateRequest, TemplateDropdownResponse, PartDropdownResponse,
    SaveVisibilitySettingsDictRequest
)
from app.dependencies import (
    TemplateServiceDep, PartServiceDep, AdminServiceDep, ConnectionManagerDep,
    CurrentAdminDep, UserServiceDep, VisibilityControlServiceDep,
    CurrentUserDep, UserPreferenceServiceDep, MetadataServiceDep, SQLLogServiceDep
)
from app.logger import Logger
from ._helpers import run_in_threadpool

logger = Logger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/system/refresh", response_model=UserRefreshResponse)
async def refresh_system_data(
    current_admin: CurrentAdminDep,
    admin_service: AdminServiceDep,
    connection_manager: ConnectionManagerDep,
):
    try:
        result = await admin_service.refresh_all_system_data(connection_manager)
        return UserRefreshResponse(message=result["message"], user_count=result["user_count"])
    except Exception as e:
        logger.error(f"システムキャッシュ更新エラー: {e}")
        raise HTTPException(status_code=500, detail=f"システムキャッシュの更新に失敗しました: {str(e)}")


# Templates
@router.get("/templates", response_model=List[TemplateResponse])
async def get_admin_templates(template_service: TemplateServiceDep):
    return await run_in_threadpool(template_service.get_admin_templates)


@router.post("/templates", response_model=TemplateResponse)
async def create_admin_template(request: TemplateRequest = Body(...), current_admin: CurrentAdminDep = None, template_service: TemplateServiceDep = None):
    return await run_in_threadpool(template_service.create_admin_template, request.name, request.sql)


@router.delete("/templates/{template_id}")
async def delete_admin_template(template_id: str, current_admin: CurrentAdminDep, template_service: TemplateServiceDep):
    await run_in_threadpool(template_service.delete_admin_template, template_id)
    return {"message": "テンプレートを削除しました"}


# Parts
@router.get("/parts", response_model=List[PartResponse])
async def get_admin_parts(part_service: PartServiceDep):
    return await run_in_threadpool(part_service.get_admin_parts)


@router.post("/parts", response_model=PartResponse)
async def create_admin_part(request: PartRequest = Body(...), current_admin: CurrentAdminDep = None, part_service: PartServiceDep = None):
    return await run_in_threadpool(part_service.create_admin_part, request.name, request.sql)


@router.delete("/parts/{part_id}")
async def delete_admin_part(part_id: str, current_admin: CurrentAdminDep, part_service: PartServiceDep):
    await run_in_threadpool(part_service.delete_admin_part, part_id)
    return {"message": "パーツを削除しました"}


# Visibility settings
@router.get("/visibility-settings")
async def get_visibility_settings(current_admin: CurrentAdminDep, visibility_service: VisibilityControlServiceDep):
    get_fn = getattr(visibility_service, "get_all_visibility_settings", None) or visibility_service.get_all_settings
    # 同期実装のためスレッドプールで実行
    settings = await run_in_threadpool(get_fn)
    # 根本対策: ラッパーキー("settings")を廃止しプレーンマップを返す
    # 旧形式: {"settings": {object_name: {role_name: bool}}}
    # 新形式: {object_name: {role_name: bool}}
    # もし互換が必要ならクエリパラメータ等で旧形式を返す実装を追加する余地あり。
    return settings


@router.post("/visibility-settings")
async def save_visibility_settings(
    request: dict = Body(...),
    current_admin: CurrentAdminDep = None,
    visibility_service: VisibilityControlServiceDep = None,
):
    """表示設定の保存。

    フロントからの形式に柔軟対応:
    - 推奨: {"settings": [{object_name, role_name, is_visible}, ...]}
    - 互換: {"settings": {object_name: is_visible, ...}} なら role_name=DEFAULT で補完
    """
    from app.api.models import VisibilitySetting

    raw = request.get("settings") if isinstance(request, dict) else None
    settings_list: list[VisibilitySetting] = []

    if isinstance(raw, list):
        # 配列形式をそのまま正規化
        for item in raw:
            if not isinstance(item, dict):
                continue
            object_name = item.get("object_name")
            role_name = item.get("role_name") or "DEFAULT"
            is_visible = bool(item.get("is_visible", False))
            if object_name:
                settings_list.append(VisibilitySetting(object_name=object_name, role_name=role_name, is_visible=is_visible))
    elif isinstance(raw, dict):
        # 互換: 辞書形式 { object_name: is_visible }
        for k, v in raw.items():
            settings_list.append(VisibilitySetting(object_name=k, role_name="DEFAULT", is_visible=bool(v)))
    else:
        # 直接 dict だった場合に備える
        if isinstance(request, dict):
            for k, v in request.items():
                if isinstance(v, bool):
                    settings_list.append(VisibilitySetting(object_name=k, role_name="DEFAULT", is_visible=bool(v)))

    save_fn = getattr(visibility_service, "save_visibility_settings", None) or visibility_service.save_settings
    # 同期関数のためスレッドプールで実行
    await run_in_threadpool(save_fn, settings_list)
    return {"success": True, "message": "表示設定を保存しました。"}


# User template/part endpoints (non-admin, kept here for simplicity; could be moved to separate users.py)
user_router = APIRouter(prefix="/users", tags=["users"])


@user_router.get("/templates", response_model=List[TemplateResponse])
async def get_user_templates(current_user: CurrentUserDep, template_service: TemplateServiceDep):
    return await run_in_threadpool(template_service.get_user_templates, current_user["user_id"])


@user_router.post("/templates", response_model=TemplateResponse)
async def create_user_template(request: TemplateRequest = Body(...), current_user: CurrentUserDep = None, template_service: TemplateServiceDep = None):
    return await run_in_threadpool(template_service.create_user_template, current_user["user_id"], request.name, request.sql)


@user_router.delete("/templates/{template_id}")
async def delete_user_template(template_id: str, current_user: CurrentUserDep, template_service: TemplateServiceDep):
    await run_in_threadpool(template_service.delete_user_template, template_id, current_user["user_id"])
    return {"message": "テンプレートを削除しました"}


@user_router.put("/templates/{template_id}")
async def update_user_template(template_id: str, request: UpdateTemplateRequest = Body(...), current_user: CurrentUserDep = None, template_service: TemplateServiceDep = None):
    updated_template = await run_in_threadpool(template_service.update_user_template, template_id, current_user["user_id"], request.name, request.sql, request.display_order)
    return {"template": updated_template}


@user_router.get("/parts", response_model=List[PartResponse])
async def get_user_parts(current_user: CurrentUserDep, part_service: PartServiceDep):
    return await run_in_threadpool(part_service.get_user_parts, current_user["user_id"])


@user_router.post("/parts", response_model=PartResponse)
async def create_user_part(request: PartRequest = Body(...), current_user: CurrentUserDep = None, part_service: PartServiceDep = None):
    return await run_in_threadpool(part_service.create_user_part, current_user["user_id"], request.name, request.sql)


@user_router.delete("/parts/{part_id}")
async def delete_user_part(part_id: str, current_user: CurrentUserDep, part_service: PartServiceDep):
    await run_in_threadpool(part_service.delete_user_part, current_user["user_id"], part_id)
    return {"message": "パーツを削除しました"}


@user_router.get("/template-preferences", response_model=UserTemplatePreferencesResponse)
async def get_user_template_preferences(current_user: CurrentUserDep, user_preference_service: UserPreferenceServiceDep):
    templates = await run_in_threadpool(user_preference_service.get_user_template_preferences, current_user["user_id"])
    return UserTemplatePreferencesResponse(templates=templates)


@user_router.get("/part-preferences", response_model=UserPartPreferencesResponse)
async def get_user_part_preferences(current_user: CurrentUserDep, user_preference_service: UserPreferenceServiceDep):
    parts = await run_in_threadpool(user_preference_service.get_user_part_preferences, current_user["user_id"])
    return UserPartPreferencesResponse(parts=parts)


@user_router.put("/template-preferences")
async def update_user_template_preferences(request: UpdateTemplatePreferencesRequest = Body(...), current_user: CurrentUserDep = None, user_preference_service: UserPreferenceServiceDep = None):
    preferences = [p.dict() for p in request.preferences]
    await run_in_threadpool(user_preference_service.update_template_preferences, current_user["user_id"], preferences)
    return {"message": "テンプレート表示設定を更新しました"}


@user_router.put("/part-preferences")
async def update_user_part_preferences(request: UpdatePartPreferencesRequest = Body(...), current_user: CurrentUserDep = None, user_preference_service: UserPreferenceServiceDep = None):
    preferences = [p.dict() for p in request.preferences]
    await run_in_threadpool(user_preference_service.update_part_preferences, current_user["user_id"], preferences)
    return {"message": "パーツ表示設定を更新しました"}


@user_router.get("/templates-for-dropdown", response_model=List[TemplateDropdownResponse])
async def get_visible_templates_for_dropdown(current_user: CurrentUserDep, user_preference_service: UserPreferenceServiceDep):
    return await run_in_threadpool(user_preference_service.get_visible_templates_for_dropdown, current_user["user_id"])


@user_router.get("/parts-for-dropdown", response_model=List[PartDropdownResponse])
async def get_visible_parts_for_dropdown(current_user: CurrentUserDep, user_preference_service: UserPreferenceServiceDep):
    return await run_in_threadpool(user_preference_service.get_visible_parts_for_dropdown, current_user["user_id"])


@user_router.get("/history")
async def get_user_history(current_user: CurrentUserDep, sql_log_service: SQLLogServiceDep):
    """ユーザーの直近6か月のSQL履歴を返す。

    応答は { "history": [...], "total_count": n } 形式。
    """
    six_months_ago = datetime.now() - timedelta(days=180)
    settings = get_settings()
    result = sql_log_service.get_logs(user_id=current_user["user_id"], limit=settings.max_history_logs, offset=0)
    history = []
    for log in result.get("logs", []):
        ts = log.get("timestamp")
        try:
            dt = datetime.fromisoformat(ts) if isinstance(ts, str) else ts
            if isinstance(dt, datetime) and dt >= six_months_ago:
                history.append({
                    "sql": log.get("sql"),
                    "execution_time": log.get("execution_time"),
                    "row_count": log.get("row_count"),
                    "timestamp": dt.isoformat() if isinstance(dt, datetime) else str(ts),
                })
        except Exception:
            # タイムスタンプ不正はスキップ
            continue
    # フロント互換のため logs と history の両方を返す
    return {"logs": history, "history": history, "total_count": len(history)}


# Admin logs endpoints under /admin to match original paths
@router.get("/logs/sql")
async def admin_get_all_sql_logs(current_admin: CurrentAdminDep, sql_log_service: SQLLogServiceDep):
    result = sql_log_service.get_logs(limit=100, offset=0)
    return {
        "logs": [
            {
                "log_id": str(log.get("log_id", "")),
                "user_id": log["user_id"],
                "sql": log["sql"],
                "execution_time": log["execution_time"],
                "row_count": log["row_count"],
                "success": log["success"],
                "error_message": log.get("error_message"),
                "timestamp": log["timestamp"],
            }
            for log in result["logs"]
        ],
        "total_count": result["total_count"],
    }


@router.delete("/logs/sql")
async def admin_clear_all_sql_logs(current_admin: CurrentAdminDep, sql_log_service: SQLLogServiceDep):
    sql_log_service.clear_logs()
    return {"message": "全SQL実行ログをクリアしました"}


# Admin metadata raw endpoint under /admin
@router.get("/metadata/all-raw")
async def get_all_metadata_raw_admin_endpoint(current_admin: CurrentAdminDep, metadata_service: MetadataServiceDep):
    # get_all_metadata_raw がある場合はそちらを使用（テストはプレーンなリストを期待）
    get_all = getattr(metadata_service, "get_all_metadata", None)
    get_raw = getattr(metadata_service, "get_all_metadata_raw", None)
    primary_fn = get_all or get_raw
    # 常にもう一方をフォールバックに設定
    if primary_fn is get_all:
        fallback_fn = get_raw
    else:
        fallback_fn = get_all

    from fastapi.responses import JSONResponse
    from datetime import datetime, timedelta

    # 取得＋直列化（必要に応じてフォールバック/整形）
    all_metadata = await run_in_threadpool(primary_fn)
    try:
        resp = JSONResponse(content=all_metadata)
    except TypeError:
        # フォールバックがあれば試す
        if fallback_fn is not None:
            all_metadata = await run_in_threadpool(fallback_fn)
            try:
                resp = JSONResponse(content=all_metadata)
            except TypeError:
                # 最後に辞書化を試す
                try:
                    coerced = [dict(item) for item in list(all_metadata)]
                except Exception:
                    coerced = []
                resp = JSONResponse(content=coerced)
        else:
            # 辞書化を試す
            try:
                coerced = [dict(item) for item in list(all_metadata)]
            except Exception:
                coerced = []
            resp = JSONResponse(content=coerced)

    # キャッシュ抑止ヘッダ（管理者の一括取得は都度最新が望ましい）
    expires = (datetime.utcnow() - timedelta(seconds=1)).strftime("%a, %d %b %Y %H:%M:%S GMT")
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = expires
    return resp



# Business users
@router.get("/business-users", response_model=BusinessUserListResponse)
async def get_business_users(current_admin: CurrentAdminDep, user_service: UserServiceDep):
    try:
        users = await run_in_threadpool(user_service.get_all_users)
        return BusinessUserListResponse(
            users=[UserInfo(user_id=u["user_id"], user_name=u["user_name"], role=u.get("role")) for u in users],
            total_count=len(users),
        )
    except Exception as e:
        logger.error(f"業務システムユーザー一覧取得エラー: {e}")
        raise HTTPException(status_code=500, detail=f"ユーザー一覧の取得に失敗しました: {str(e)}")


@router.post("/business-users/refresh", response_model=BusinessUserRefreshResponse)
async def refresh_business_users(current_admin: CurrentAdminDep, user_service: UserServiceDep):
    try:
        updated_count = await run_in_threadpool(user_service.refresh_users_from_db)
        return BusinessUserRefreshResponse(
            success=True,
            updated_count=updated_count,
            message=f"業務システムユーザー情報を更新しました。更新件数: {updated_count}",
        )
    except Exception as e:
        logger.error(f"業務システムユーザー情報更新エラー: {e}")
        return BusinessUserRefreshResponse(success=False, updated_count=0, message=f"ユーザー情報の更新に失敗しました: {str(e)}")
