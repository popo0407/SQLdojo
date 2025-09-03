import csv
import io
from typing import Optional, Any, Dict, Generator, List
from dataclasses import dataclass

from app.config_simplified import get_settings
from app.logger import get_logger
from app.exceptions import ExportError


@dataclass
class ExportResult:
    success: bool
    download_url: Optional[str] = None
    filename: Optional[str] = None


class ExportService:
    def __init__(self, connection_manager):
        self.logger = get_logger("ExportService")
        self.connection_manager = connection_manager

    def export_to_csv_stream(self, sql: str) -> Generator[bytes, None, None]:
        """CSV形式でデータをストリーミング（カーソル逐次取得）"""
        self.logger.info("CSVエクスポート開始", sql=sql)
        conn_id = None
        try:
            conn_id, connection = self.connection_manager.get_connection()
            cursor = connection.cursor()
            cursor.execute(sql)

            # ヘッダー
            columns_raw = cursor.description or []
            columns = [c[0] if isinstance(c, (list, tuple)) and len(c) > 0 else (c if isinstance(c, str) else str(c)) for c in columns_raw]

            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(columns)
            yield output.getvalue().encode('utf-8')
            output.seek(0)
            output.truncate(0)

            # データ行
            settings = get_settings()
            while True:
                chunk = cursor.fetchmany(settings.cursor_chunk_size)
                if not chunk:
                    break
                for row in chunk:
                    writer.writerow(list(row))
                yield output.getvalue().encode('utf-8')
                output.seek(0)
                output.truncate(0)

        except Exception as e:
            # get_connection 失敗などのときは元のメッセージを活かす
            if conn_id is None:
                raise Exception(str(e))
            self.logger.error("CSVエクスポートエラー", exception=e)
            raise ExportError(f"CSVエクスポート中にエラーが発生しました: {e}")
        finally:
            if conn_id:
                try:
                    self.connection_manager.release_connection(conn_id)
                except Exception:
                    pass

    def export_data_to_csv(self, data: List[Dict[str, Any]], columns: List[str]) -> str:
        """データをCSV形式に変換（ユーティリティ）"""
        self.logger.info("データをCSV形式に変換開始", data_count=len(data), columns=columns)
        try:
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(columns)
            for row in data:
                writer.writerow([row.get(col, '') for col in columns])
            csv_content = output.getvalue()
            output.close()
            self.logger.info("CSV形式への変換完了", csv_length=len(csv_content))
            return csv_content
        except Exception as e:
            self.logger.error("CSV形式への変換エラー", exception=e)
            raise ExportError(f"CSV形式への変換中にエラーが発生しました: {e}")