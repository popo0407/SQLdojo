import json
import os
from typing import Optional, Dict, Any, List
from app.services.connection_manager_odbc import ConnectionManagerODBC
from app.logger import get_logger

USER_DATA_FILE = os.path.join(os.path.dirname(__file__), '../../user_data.json')
logger = get_logger("UserService")

class UserService:
    def __init__(self, user_data_file: str = None):
        # 環境変数があれば優先
        env_file = os.environ.get("USER_DATA_FILE")
        if user_data_file is not None:
            self.user_data_file = user_data_file
        elif env_file:
            self.user_data_file = env_file
        else:
            self.user_data_file = USER_DATA_FILE
        self._load_users()

    def _load_users(self):
        if os.path.exists(self.user_data_file):
            try:
                with open(self.user_data_file, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    if content:
                        self.users = json.loads(content)
                    else:
                        self.users = {}
            except Exception:
                self.users = {}
        else:
            self.users = {}

    def _save_users(self):
        with open(self.user_data_file, 'w', encoding='utf-8') as f:
            json.dump(self.users, f, ensure_ascii=False, indent=2)

    def refresh_users_from_db(self, connection_manager: Optional[ConnectionManagerODBC] = None):
        """
        HF3IGM01テーブルからユーザー情報を取得し、user_data.jsonを更新
        """
        if connection_manager is None:
            connection_manager = ConnectionManagerODBC()
        sql = """
            SELECT USER_ID, USER_NAME FROM HF3IGM01
        """
        try:
            result = connection_manager.execute_query(sql)
            users = {}
            for row in result:
                user_id = row["USER_ID"]
                user_name = row["USER_NAME"]
                users[user_id] = {"user_id": user_id, "user_name": user_name}
            self.users = users
            self._save_users()
            logger.info(f"ユーザー情報をDBから更新しました。件数: {len(users)}")
            return users
        except Exception as e:
            logger.error(f"ユーザー情報のDB取得に失敗: {e}")
            raise

    def authenticate_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        user_idがuser_data.jsonに存在すれば認証OK
        """
        self._load_users()
        user = self.users.get(user_id)
        if user:
            return user
        return None

    def get_all_users(self) -> List[Dict[str, Any]]:
        self._load_users()
        return list(self.users.values()) 