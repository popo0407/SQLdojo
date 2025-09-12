# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime

from app.api.models import SQLRequest, ConnectionStatusResponse
from app.dependencies import QueryExecutorDep, ExportServiceDep

router = APIRouter(tags=["utils"])


@router.get("/connection/status", response_model=ConnectionStatusResponse)
async def get_connection_status_endpoint(query_executor: QueryExecutorDep):
    status = query_executor.get_connection_status()
    # 接続プールに接続があれば connected=True とする
    connected = status.get("total_connections", 0) > 0
    return ConnectionStatusResponse(connected=connected, detail=status)


@router.post("/export")
async def export_data_endpoint(request: SQLRequest, export_service: ExportServiceDep):
    if not request.sql:
        raise HTTPException(status_code=400, detail="SQLクエリが空です、エクスポートできません")
    try:
        stream = export_service.export_to_csv_stream(request.sql)
        first_chunk = next(stream, None)

        def stream_generator():
            yield '\ufeff'.encode('utf-8')
            if first_chunk:
                yield first_chunk
            for chunk in stream:
                yield chunk

        filename = f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        return StreamingResponse(stream_generator(), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": f"attachment; filename={filename}"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"エクスポートに失敗しました: {str(e)}")
