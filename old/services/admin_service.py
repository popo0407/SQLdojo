from .user_service import UserService
from .metadata_service import MetadataService
from .connection_manager_odbc import ConnectionManagerODBC
from app.logger import get_logger

class AdminService:
    def __init__(self, user_service: UserService, metadata_service: MetadataService):
        self.user_service = user_service
        self.metadata_service = metadata_service
        self.logger = get_logger(__name__)

    def refresh_all_system_data(self, connection_manager: ConnectionManagerODBC) -> dict:
        """
        システムが利用する全てのキャッシュデータ（ユーザー、DBメタデータ）を更新する
        """
        self.logger.info("システム全体のキャッシュ更新処理を開始します。")
        
        # ▼ ユーザー情報の更新（戻り値で件数を受け取る）
        try:
            user_count = self.user_service.refresh_users_from_db(connection_manager)
        except Exception as e:
            self.logger.error(f"ユーザー情報の更新中にエラーが発生しました: {e}")
            raise  # エラーを上位に伝播させる

        # ▼ DBメタデータの更新（戻り値でスキーマ数を受け取る）
        try:
            schema_count = self.metadata_service.refresh_full_metadata_cache()
        except Exception as e:
            self.logger.error(f"DBメタデータの更新中にエラーが発生しました: {e}")
            raise

        # ▼ 最終結果を一つのメッセージにまとめてINFOで出力
        summary_message = f"システムキャッシュの更新が完了しました。(更新件数: ユーザー={user_count}件, DBスキーマ={schema_count}件)"
        self.logger.info(summary_message)

        return {
            "message": summary_message, # APIレスポンス用のメッセージ
            "user_count": user_count,
            "schema_count": schema_count
        } 