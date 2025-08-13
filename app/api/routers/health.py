# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException
import time
from app import __version__
from app.api.models import HealthCheckResponse, PerformanceMetricsResponse
from app.dependencies import SQLServiceDep, PerformanceServiceDep
from app.logger import Logger

logger = Logger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthCheckResponse)
async def health_check(sql_service: SQLServiceDep, performance_service: PerformanceServiceDep):
    logger.info("ヘルスチェック要求")
    connection_status = sql_service.get_connection_status()
    metrics = performance_service.get_metrics()
    return HealthCheckResponse(
        status="healthy",
        version=__version__,
        timestamp=time.time(),
        connection_status=connection_status,
        performance_metrics=metrics,
    )


@router.get("/performance/metrics", response_model=PerformanceMetricsResponse)
async def get_performance_metrics_route(performance_service: PerformanceServiceDep):
    try:
        metrics = performance_service.get_metrics()
        return PerformanceMetricsResponse(timestamp=time.time(), metrics=metrics)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
