# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi import BackgroundTasks
from datetime import datetime, timedelta
from typing import List, Dict, Any
import inspect

from app.api.models import (
    UserLoginRequest, UserInfo, AdminLoginRequest,
    UserRefreshResponse
)
from app.dependencies import (
    CurrentUserDep, CurrentAdminDep, UserServiceDep,
    HybridSQLServiceDep, SessionServiceDep, StreamingStateServiceDep
)
from app.config_simplified import get_settings
from app.logger import Logger
from ._helpers import run_in_threadpool

logger = Logger(__name__)
router = APIRouter(prefix="", tags=["auth"])


@router.post("/login")
async def login(request: Request, login_req: UserLoginRequest, user_service: UserServiceDep):
    logger.info(f"ログイン要求: {login_req.user_id}")
    user = await run_in_threadpool(user_service.authenticate_user, login_req.user_id)
    if user:
        logger.info(f"セッション保存前: {list(request.session.keys())}")
        request.session["user"] = user
        logger.info(f"ログイン成功: {user['user_id']}, セッションキー: {list(request.session.keys())}")
        logger.info(f"保存されたユーザー情報: {request.session.get('user')}")
        return {"success": True, "message": "ログイン成功", "user": user, "user_id": user.get("user_id"), "user_name": user.get("user_name")}
    else:
        logger.warning(f"ログイン失敗: {login_req.user_id}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーIDが無効です")


@router.post("/refresh")
async def refresh_user_info(request: Request, current_user: CurrentUserDep, user_service: UserServiceDep):
    logger.info(f"ユーザー情報リフレッシュ要求: user_id={current_user.get('user_id')}")
    try:
        user_id = current_user["user_id"]
        fresh_user = await run_in_threadpool(user_service.authenticate_user, user_id)
        if not fresh_user:
            logger.warning(f"ユーザー情報がキャッシュに存在しません: user_id={user_id}")
            raise HTTPException(status_code=404, detail="ユーザー情報が見つかりません")
        request.session["user"] = fresh_user
        logger.info(f"ユーザー情報を更新しました: user_id={user_id}")
        return {"success": True, "message": "ユーザー情報を更新しました", "user": fresh_user}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ユーザー情報リフレッシュ中にエラー: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"ユーザー情報の更新に失敗しました: {str(e)}")


@router.get("/user/info", response_model=UserInfo)
async def get_user_info(current_user: CurrentUserDep):
    return current_user


@router.post("/logout")
async def logout(request: Request):
    user = request.session.get("user")
    request.session.clear()
    logger.info(f"セッションをクリアしました。ユーザー: {user.get('user_id') if user else '不明'}")
    return {"success": True, "message": "ログアウトしました"}


@router.get("/users/me", response_model=UserInfo)
async def get_current_user_info(current_user: CurrentUserDep):
    return current_user


@router.get("/debug/session")
async def debug_session(request: Request):
    session_data = dict(request.session)
    return {
        "session_keys": list(request.session.keys()),
        "session_data": session_data,
        "has_user": "user" in request.session,
    }


# 管理者認証
@router.post("/admin/login")
async def admin_login(request: Request, admin_req: AdminLoginRequest):
    settings = get_settings()
    if admin_req.password == settings.admin_password:
        request.session["is_admin"] = True
        return {"success": True, "message": "管理者認証成功"}
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="管理者パスワードが無効です")


@router.post("/admin/logout")
async def admin_logout(request: Request):
    request.session.pop("is_admin", None)
    return {"success": True, "message": "管理者ログアウトしました"}


@router.post("/cleanup/cache")
async def cleanup_cache_endpoint(current_user: CurrentUserDep):
    logger.info(f"クリーンアップ要求: user_id={current_user.get('user_id')}")
    return {"success": True, "message": "クリーンアップが完了しました"}
