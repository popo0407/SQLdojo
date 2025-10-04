# -*- coding: utf-8 -*-
"""
マスターデータ関連のAPIルーター
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel

from app.api.routers._helpers import get_master_data_service, get_scheduler_service, get_master_search_preference_service
from app.api.models import SuccessResponse, ErrorResponse
from app.logger import get_logger
from app.dependencies import get_current_user

logger = get_logger(__name__)

router = APIRouter(prefix="/master", tags=["master"])


# リクエスト/レスポンスモデル
class MasterDataUpdateResponse(BaseModel):
    success: bool
    message: str
    results: Optional[Dict[str, int]] = None


class StationMasterFilterRequest(BaseModel):
    sta_no1: Optional[str] = None
    place_name: Optional[str] = None
    sta_no2_first_digit: Optional[str] = None
    sta_no2: Optional[str] = None
    line_name: Optional[str] = None
    sta_no3: Optional[str] = None
    st_name: Optional[str] = None


class GenerateSQLRequest(BaseModel):
    master_type: str
    selected_items: List[Dict[str, Any]]
    sta_no1: str
    sta_no2: str
    sta_no3: str


class MasterSearchPreferenceRequest(BaseModel):
    sta_no1: str
    sta_no2_first: str


@router.post("/update", response_model=MasterDataUpdateResponse)
async def update_master_data(
    master_data_service=Depends(get_master_data_service),
    scheduler_service=Depends(get_scheduler_service)
):
    """
    マスターデータを手動で更新
    """
    try:
        logger.info("マスターデータの手動更新要求")
        
        # スケジューリングサービス経由で実行（履歴管理のため）
        result = scheduler_service.execute_master_data_update_now()
        
        if result['success']:
            return MasterDataUpdateResponse(
                success=True,
                message=result['message'],
                results=result['results']
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=result['message']
            )
        
    except Exception as e:
        logger.error("マスターデータ更新エラー", exception=e)
        raise HTTPException(
            status_code=500,
            detail=f"マスターデータの更新に失敗しました: {str(e)}"
        )


@router.get("/station/stations")
async def get_station_master_stations(
    master_data_service=Depends(get_master_data_service)
):
    """
    重複を排除したSTA_NO1,PLACE_NAMEの表を取得
    """
    try:
        logger.info("STATION_MASTER駅一覧の取得要求")
        
        stations = master_data_service.get_station_master_stations()
        
        return SuccessResponse(
            message="STATION_MASTER駅一覧を取得しました",
            data=stations
        )
        
    except Exception as e:
        logger.error("STATION_MASTER駅一覧取得エラー", exception=e)
        raise HTTPException(
            status_code=500,
            detail=f"駅一覧の取得に失敗しました: {str(e)}"
        )


# マスター検索履歴エンドポイント（/{table_name}より前に配置）
@router.post("/search-preferences")
async def save_search_preference(
    request: MasterSearchPreferenceRequest,
    current_user=Depends(get_current_user),
    search_preference_service=Depends(get_master_search_preference_service)
):
    """
    マスター検索履歴を保存
    """
    try:
        search_preference_service.save_search_preference(
            current_user.get('user_id'), 
            request.sta_no1, 
            request.sta_no2_first
        )
        
        return SuccessResponse(
            message="マスター検索履歴を保存しました"
        )
        
    except Exception as e:
        logger.error("マスター検索履歴保存エラー", exception=e)
        raise HTTPException(
            status_code=500,
            detail=f"検索履歴の保存に失敗しました: {str(e)}"
        )


@router.get("/search-preferences")
async def get_search_preference(
    current_user=Depends(get_current_user),
    search_preference_service=Depends(get_master_search_preference_service)
):
    """
    マスター検索履歴を取得
    """
    try:
        preference = search_preference_service.get_search_preference(current_user.get('user_id'))
        
        return SuccessResponse(
            message="マスター検索履歴を取得しました",
            data=preference
        )
        
    except Exception as e:
        logger.error("マスター検索履歴取得エラー", exception=e)
        raise HTTPException(
            status_code=500,
            detail=f"検索履歴の取得に失敗しました: {str(e)}"
        )


@router.get("/{table_name}")
async def get_master_table_data(
    table_name: str,
    sta_no1: Optional[str] = Query(None, description="STA_NO1でフィルタ"),
    sta_no2: Optional[str] = Query(None, description="STA_NO2でフィルタ"),
    sta_no3: Optional[str] = Query(None, description="STA_NO3でフィルタ"),
    master_data_service=Depends(get_master_data_service)
):
    """
    マスターテーブルのデータを取得（オプションでステーション条件でフィルタ）
    """
    try:
        logger.info("マスターテーブルデータ取得要求", 
                   table_name=table_name, sta_no1=sta_no1, sta_no2=sta_no2, sta_no3=sta_no3)
        
        # テーブル名のバリデーション
        valid_tables = ['station', 'measure', 'set', 'free', 'parts', 'trouble']
        if table_name.lower() not in valid_tables:
            raise HTTPException(
                status_code=400,
                detail=f"無効なテーブル名です: {table_name}. 有効な値: {valid_tables}"
            )
        
        # ステーション条件でのフィルタリングが指定されている場合
        if sta_no1 and sta_no2 and sta_no3 and table_name.lower() != 'station':
            data = master_data_service.get_master_data_by_station(
                table_name.upper(), sta_no1, sta_no2, sta_no3
            )
        else:
            # 対応するメソッドを呼び出し（全データ取得）
            table_methods = {
                'station': master_data_service.get_all_station_master,
                'measure': master_data_service.get_all_measure_master,
                'set': master_data_service.get_all_set_master,
                'free': master_data_service.get_all_free_master,
                'parts': master_data_service.get_all_parts_master,
                'trouble': master_data_service.get_all_trouble_master
            }
            
            method = table_methods[table_name.lower()]
            data = method()
        
        logger.info(f"取得したデータ: テーブル={table_name}, 件数={len(data)}, サンプル={data[:2] if data else '空'}")
        
        return SuccessResponse(
            message=f"{table_name.upper()}_MASTERデータを取得しました",
            data={"items": data, "count": len(data)}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("マスターテーブルデータ取得エラー", exception=e, table_name=table_name)
        raise HTTPException(
            status_code=500,
            detail=f"{table_name}テーブルのデータ取得に失敗しました: {str(e)}"
        )


@router.post("/station/filter")
async def get_station_master_by_filter(
    filter_request: StationMasterFilterRequest,
    master_data_service=Depends(get_master_data_service)
):
    """
    条件を指定してSTATION_MASTERデータを取得
    """
    try:
        logger.info("STATION_MASTERフィルタ取得要求", filters=filter_request.dict(exclude_none=True))
        
        filters = filter_request.dict(exclude_none=True)
        stations = master_data_service.get_station_master_by_filter(**filters)
        
        return SuccessResponse(
            message="STATION_MASTERデータを取得しました",
            data=stations
        )
        
    except Exception as e:
        logger.error("STATION_MASTERフィルタ取得エラー", exception=e)
        raise HTTPException(
            status_code=500,
            detail=f"STATIONデータの取得に失敗しました: {str(e)}"
        )


@router.get("/data/{master_type}")
async def get_master_data_by_station(
    master_type: str,
    sta_no1: str = Query(..., description="STA_NO1"),
    sta_no2: str = Query(..., description="STA_NO2"),
    sta_no3: str = Query(..., description="STA_NO3"),
    master_data_service=Depends(get_master_data_service)
):
    """
    指定されたSTA_NO1,STA_NO2,STA_NO3でマスターデータを取得
    """
    try:
        logger.info("マスターデータ取得要求", 
                   master_type=master_type, sta_no1=sta_no1, sta_no2=sta_no2, sta_no3=sta_no3)
        
        # マスタータイプのバリデーション
        valid_types = ['MEASURE', 'SET', 'FREE', 'PARTS', 'TROUBLE']
        if master_type.upper() not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"無効なマスタータイプです: {master_type}. 有効な値: {valid_types}"
            )
        
        data = master_data_service.get_master_data_by_station(
            master_type.upper(), sta_no1, sta_no2, sta_no3
        )
        
        return SuccessResponse(
            message=f"{master_type.upper()}マスターデータを取得しました",
            data=data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("マスターデータ取得エラー", exception=e)
        raise HTTPException(
            status_code=500,
            detail=f"マスターデータの取得に失敗しました: {str(e)}"
        )


@router.post("/generate-sql")
async def generate_sql_for_master(
    request: GenerateSQLRequest,
    master_data_service=Depends(get_master_data_service)
):
    """
    選択されたマスターデータ項目からSQL文を生成
    """
    try:
        logger.info("マスター用SQL生成要求", 
                   master_type=request.master_type, 
                   items_count=len(request.selected_items),
                   sta_no1=request.sta_no1, sta_no2=request.sta_no2, sta_no3=request.sta_no3)
        
        # マスタータイプのバリデーション
        valid_types = ['MEASURE', 'SET', 'FREE', 'PARTS', 'TROUBLE']
        if request.master_type.upper() not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"無効なマスタータイプです: {request.master_type}. 有効な値: {valid_types}"
            )
        
        if not request.selected_items:
            raise HTTPException(
                status_code=400,
                detail="選択されたアイテムがありません"
            )
        
        sql = master_data_service.generate_sql_for_master(
            request.master_type.upper(),
            request.selected_items,
            request.sta_no1,
            request.sta_no2,
            request.sta_no3
        )
        
        if not sql:
            raise HTTPException(
                status_code=500,
                detail="SQLの生成に失敗しました"
            )
        
        return SuccessResponse(
            message="SQLを生成しました",
            data={"sql": sql}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("マスター用SQL生成エラー", exception=e)
        raise HTTPException(
            status_code=500,
            detail=f"SQLの生成に失敗しました: {str(e)}"
        )


@router.get("/scheduler/status")
async def get_scheduler_status(
    scheduler_service=Depends(get_scheduler_service)
):
    """
    スケジューラーの状態を取得
    """
    try:
        logger.info("スケジューラー状態取得要求")
        
        job_info = scheduler_service.get_job_info('master_data_update')
        
        return SuccessResponse(
            message="スケジューラー状態を取得しました",
            data={
                "scheduler_running": scheduler_service.scheduler and scheduler_service.scheduler.running if hasattr(scheduler_service, 'scheduler') else False,
                "job_info": job_info
            }
        )
        
    except Exception as e:
        logger.error("スケジューラー状態取得エラー", exception=e)
        raise HTTPException(
            status_code=500,
            detail=f"スケジューラー状態の取得に失敗しました: {str(e)}"
        )


@router.get("/scheduler/history")
async def get_job_execution_history(
    limit: int = Query(10, description="取得する履歴件数"),
    scheduler_service=Depends(get_scheduler_service)
):
    """
    ジョブ実行履歴を取得
    """
    try:
        logger.info("ジョブ実行履歴取得要求", limit=limit)
        
        history = scheduler_service.get_job_execution_history(limit)
        
        return SuccessResponse(
            message="ジョブ実行履歴を取得しました",
            data=history
        )
        
    except Exception as e:
        logger.error("ジョブ実行履歴取得エラー", exception=e)
        raise HTTPException(
            status_code=500,
            detail=f"実行履歴の取得に失敗しました: {str(e)}"
        )


