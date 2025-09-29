# -*- coding: utf-8 -*-
"""
スケジューリングサービス
APScheduler + データベース永続化でマスターデータの自動更新を管理
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
import sqlite3
from pathlib import Path

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
    from apscheduler.executors.pool import ThreadPoolExecutor
    from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR
    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False
    BackgroundScheduler = None
    SQLAlchemyJobStore = None
    ThreadPoolExecutor = None
    EVENT_JOB_EXECUTED = None
    EVENT_JOB_ERROR = None

from app.logger import get_logger
from app.exceptions import SchedulerError


class SchedulerService:
    """スケジューリングサービス"""
    
    def __init__(self, jobs_db_path: str = "scheduler_jobs.db"):
        self.jobs_db_path = Path(jobs_db_path)
        self.logger = get_logger(__name__)
        self.scheduler = None
        self._master_data_service = None
        
        if not APSCHEDULER_AVAILABLE:
            self.logger.warning("APSchedulerがインストールされていません。スケジューリング機能は無効化されます。")
            return
        
        # APScheduler設定
        self.jobstore = SQLAlchemyJobStore(url=f'sqlite:///{self.jobs_db_path}')
        executors = {
            'default': ThreadPoolExecutor(20),
        }
        job_defaults = {
            'coalesce': False,
            'max_instances': 1
        }
        
        self.scheduler = BackgroundScheduler(
            jobstores={'default': self.jobstore},
            executors=executors,
            job_defaults=job_defaults,
            timezone='Asia/Tokyo'
        )
        
        # スケジューラーイベントリスナーを設定
        self.scheduler.add_listener(self._job_executed_listener, EVENT_JOB_EXECUTED)
        self.scheduler.add_listener(self._job_error_listener, EVENT_JOB_ERROR)
    
    def set_master_data_service(self, master_data_service):
        """MasterDataServiceを設定（循環import回避）"""
        self._master_data_service = master_data_service
    
    def start(self):
        """スケジューラーを開始"""
        if not APSCHEDULER_AVAILABLE:
            self.logger.warning("APSchedulerが利用できないため、スケジューリング機能をスキップします")
            return
            
        try:
            if not self.scheduler.running:
                self.scheduler.start()
                self.logger.info("スケジューラーを開始しました")
                
                # マスターデータ更新ジョブが存在しない場合は作成
                self._ensure_master_data_job()
            else:
                self.logger.info("スケジューラーは既に開始されています")
        except Exception as e:
            self.logger.error("スケジューラーの開始に失敗", exception=e)
            raise SchedulerError(f"スケジューラーの開始に失敗しました: {str(e)}")
    
    def stop(self):
        """スケジューラーを停止"""
        if not APSCHEDULER_AVAILABLE or not self.scheduler:
            return
            
        try:
            if self.scheduler.running:
                self.scheduler.shutdown()
                self.logger.info("スケジューラーを停止しました")
        except Exception as e:
            self.logger.error("スケジューラーの停止に失敗", exception=e)
    
    def _ensure_master_data_job(self):
        """マスターデータ更新ジョブが存在することを確認し、なければ作成"""
        job_id = 'master_data_update'
        
        try:
            existing_job = self.scheduler.get_job(job_id)
            if existing_job:
                self.logger.info("マスターデータ更新ジョブは既に存在します", job_id=job_id)
                return
            
            # 毎日0:45:00に実行するジョブを作成
            self.scheduler.add_job(
                func=self._update_master_data_job,
                trigger='cron',
                hour=0,
                minute=45,
                second=0,
                id=job_id,
                name='マスターデータ自動更新',
                replace_existing=True,
                misfire_grace_time=300  # 5分の猶予時間
            )
            
            self.logger.info("マスターデータ更新ジョブを作成しました", 
                           job_id=job_id, schedule="毎日0:45:00")
                           
        except Exception as e:
            self.logger.error("マスターデータ更新ジョブの作成に失敗", exception=e)
            raise SchedulerError(f"ジョブの作成に失敗しました: {str(e)}")
    
    def _update_master_data_job(self):
        """マスターデータ更新ジョブの実行処理"""
        self.logger.info("マスターデータ自動更新ジョブを開始")
        
        try:
            if not self._master_data_service:
                raise SchedulerError("MasterDataServiceが設定されていません")
            
            # 全マスターデータを更新
            results = self._master_data_service.update_all_master_data()
            
            total_count = sum(results.values())
            self.logger.info("マスターデータ自動更新ジョブが完了", 
                           total_count=total_count, results=results)
            
            # 実行結果をログに記録
            self._log_job_execution('master_data_update', True, f"更新完了: {total_count}件", results)
            
        except Exception as e:
            error_msg = f"マスターデータ自動更新ジョブでエラーが発生: {str(e)}"
            self.logger.error(error_msg, exception=e)
            
            # エラー結果をログに記録
            self._log_job_execution('master_data_update', False, error_msg, None)
            
            # エラーは再発生させない（スケジューラーの継続実行のため）
    
    def execute_master_data_update_now(self) -> Dict[str, Any]:
        """マスターデータ更新を即座に実行"""
        self.logger.info("マスターデータの手動更新を開始")
        
        try:
            if not self._master_data_service:
                raise SchedulerError("MasterDataServiceが設定されていません")
            
            results = self._master_data_service.update_all_master_data()
            
            total_count = sum(results.values())
            self.logger.info("マスターデータの手動更新が完了", 
                           total_count=total_count, results=results)
            
            # 実行結果をログに記録
            self._log_job_execution('master_data_update_manual', True, f"手動更新完了: {total_count}件", results)
            
            return {
                'success': True,
                'message': f'マスターデータの更新が完了しました（{total_count}件）',
                'results': results
            }
            
        except Exception as e:
            error_msg = f"マスターデータの手動更新でエラーが発生: {str(e)}"
            self.logger.error(error_msg, exception=e)
            
            # エラー結果をログに記録
            self._log_job_execution('master_data_update_manual', False, error_msg, None)
            
            return {
                'success': False,
                'message': error_msg,
                'results': None
            }
    
    def get_job_info(self, job_id: str) -> Optional[Dict[str, Any]]:
        """ジョブ情報を取得"""
        try:
            job = self.scheduler.get_job(job_id)
            if not job:
                return None
            
            return {
                'id': job.id,
                'name': job.name,
                'next_run_time': job.next_run_time.isoformat() if job.next_run_time else None,
                'trigger': str(job.trigger),
                'func': job.func.__name__ if job.func else None
            }
        except Exception as e:
            self.logger.error(f"ジョブ情報の取得に失敗", job_id=job_id, exception=e)
            return None
    
    def get_job_execution_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """ジョブ実行履歴を取得"""
        try:
            with sqlite3.connect(self.jobs_db_path.parent / "job_execution_history.db") as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT * FROM job_execution_history 
                    ORDER BY execution_time DESC 
                    LIMIT ?
                """, (limit,))
                
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error("ジョブ実行履歴の取得に失敗", exception=e)
            return []
    
    def _log_job_execution(self, job_id: str, success: bool, message: str, results: Optional[Dict]):
        """ジョブ実行結果をデータベースに記録"""
        try:
            history_db_path = self.jobs_db_path.parent / "job_execution_history.db"
            
            with sqlite3.connect(history_db_path) as conn:
                cursor = conn.cursor()
                
                # テーブルが存在しない場合は作成
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS job_execution_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        job_id TEXT NOT NULL,
                        execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        success BOOLEAN NOT NULL,
                        message TEXT,
                        results TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # 実行結果を挿入
                cursor.execute("""
                    INSERT INTO job_execution_history (job_id, success, message, results)
                    VALUES (?, ?, ?, ?)
                """, (job_id, success, message, str(results) if results else None))
                
                conn.commit()
                
        except Exception as e:
            self.logger.error("ジョブ実行履歴の記録に失敗", exception=e)
    
    def _job_executed_listener(self, event):
        """ジョブ実行完了イベントリスナー"""
        self.logger.info("ジョブが正常に実行されました", 
                        job_id=event.job_id, 
                        scheduled_run_time=event.scheduled_run_time)
    
    def _job_error_listener(self, event):
        """ジョブエラーイベントリスナー"""
        self.logger.error("ジョブの実行でエラーが発生しました", 
                         job_id=event.job_id, 
                         scheduled_run_time=event.scheduled_run_time,
                         exception=event.exception)
    
    def __del__(self):
        """デストラクタでスケジューラーを停止"""
        self.stop()