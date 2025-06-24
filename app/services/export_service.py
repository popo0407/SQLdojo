# export_service.py （この内容でファイル全体を置き換えてください）

import time
import csv
import io
from typing import Optional, Any, Dict, Generator, List
from dataclasses import dataclass

from app.logger import Logger
from app.exceptions import ExportError
from app.container import get_app_logger
from .query_executor import QueryExecutor, QueryResult


@dataclass
class ExportResult: # このクラスはもう使いませんが、他の部分で参照されている可能性を考慮し残します
    success: bool
    download_url: Optional[str] = None
    filename: Optional[str] = None


class ExportService:
    def __init__(self, query_executor: QueryExecutor):
        self.logger: Logger = get_app_logger()
        self.query_executor = query_executor

    def stream_query_results(self, sql: str):
        self.logger.info("クエリ結果のストリーミング開始", sql=sql)
        try:
            # Query Executorの新しいストリーミングメソッドを呼び出す
            yield from self.query_executor.execute_query_and_stream(sql)
        except Exception as e:
            self.logger.error("クエリ結果のストリーミング中にエラー", exception=e)
            raise ExportError(f"データのエクスポート中にエラーが発生しました: {e}")

    def export_to_csv_stream(self, sql: str) -> Generator[bytes, None, None]:
        """CSV形式でデータをストリーミング"""
        self.logger.info("CSVエクスポート開始", sql=sql)
        try:
            # クエリを実行してデータを取得
            result = self.query_executor.execute_query(sql)
            if not result.success:
                raise ExportError(f"クエリ実行エラー: {result.error_message}")
            
            if not result.data:
                # データがない場合は空のCSVを返す
                output = io.StringIO()
                writer = csv.writer(output)
                yield output.getvalue().encode('utf-8')
                return
            
            # ヘッダー行を出力
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(result.columns)
            yield output.getvalue().encode('utf-8')
            output.seek(0)
            output.truncate(0)
            
            # データ行を出力
            for row in result.data:
                writer.writerow([row.get(col, '') for col in result.columns])
                yield output.getvalue().encode('utf-8')
                output.seek(0)
                output.truncate(0)
                
        except Exception as e:
            self.logger.error("CSVエクスポートエラー", exception=e)
            raise ExportError(f"CSVエクスポート中にエラーが発生しました: {e}")

    def export_data_to_csv(self, data: List[Dict[str, Any]], columns: List[str]) -> str:
        """データをCSV形式に変換"""
        self.logger.info("データをCSV形式に変換開始", data_count=len(data), columns=columns)
        try:
            output = io.StringIO()
            writer = csv.writer(output)
            
            # ヘッダー行を書き込み
            writer.writerow(columns)
            
            # データ行を書き込み
            for row in data:
                writer.writerow([row.get(col, '') for col in columns])
            
            csv_content = output.getvalue()
            output.close()
            
            self.logger.info("CSV形式への変換完了", csv_length=len(csv_content))
            return csv_content
            
        except Exception as e:
            self.logger.error("CSV形式への変換エラー", exception=e)
            raise ExportError(f"CSV形式への変換中にエラーが発生しました: {e}")