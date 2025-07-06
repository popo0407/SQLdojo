/**
 * API通信を担当するサービスクラス
 * サーバーとの通信ロジックをすべてこのクラスに集約
 */
class ApiService {
    constructor(baseUrl = '/api/v1') {
        this.baseUrl = baseUrl;
    }

    /**
     * 共通のfetch処理
     * @param {string} endpoint - APIエンドポイント
     * @param {Object} options - fetchオプション
     * @returns {Promise} レスポンスデータ
     */
    async _fetch(endpoint, options = {}) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.detail || `API Error: ${response.statusText}`;
            throw new Error(errorMessage);
        }
        // CSVエクスポートのようなケースではblobを返す
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/csv")) {
            return response.blob();
        }
        return response.json();
    }

    /**
     * 接続状態を取得
     * @returns {Promise<Object>} 接続状態
     */
    getConnectionStatus() {
        return this._fetch('/connection/status');
    }

    /**
     * 初期メタデータを取得（キャッシュ利用）
     * @returns {Promise<Array>} メタデータ配列
     */
    getInitialMetadata() {
        return this._fetch('/metadata/all');
    }

    /**
     * 生メタデータを取得（フィルタリングなし）
     * @returns {Promise<Array>} 生メタデータ配列
     */
    getRawMetadata() {
        return this._fetch('/metadata/raw');
    }

    /**
     * メタデータを強制更新
     * @returns {Promise<Array>} 更新されたメタデータ配列
     */
    refreshMetadata() {
        return this._fetch('/metadata/refresh', { method: 'POST' });
    }

    /**
     * SQLを実行
     * @param {string} sql - 実行するSQL
     * @param {number|null} limit - 結果制限数
     * @returns {Promise<Object>} 実行結果
     */
    executeSQL(sql, limit) {
        return this._fetch('/sql/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql, limit })
        });
    }

    /**
     * SQLを整形
     * @param {string} sql - 整形するSQL
     * @returns {Promise<Object>} 整形結果
     */
    formatSQL(sql) {
        return this._fetch('/sql/format', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql })
        });
    }

    /**
     * SQL補完候補を取得
     * @param {string} sql - 現在のSQL
     * @param {number} position - カーソル位置のオフセット
     * @returns {Promise<Object>} 補完候補
     */
    getCompletions(sql, position) {
        return this._fetch('/sql/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql, position, context: null })
        });
    }
    
    /**
     * データをエクスポート
     * @param {string} sql - エクスポートするSQL
     * @param {string} format - エクスポート形式（csv等）
     * @returns {Promise<Blob>} エクスポートデータ
     */
    exportData(sql, format = 'csv') {
        return this._fetch('/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql, format })
        });
    }

    /**
     * 全テンプレートを取得
     * @returns {Promise<Array>} テンプレート配列
     */
    getAllTemplates() {
        return this._fetch('/users/templates');
    }

    /**
     * 共通テンプレートを取得
     * @returns {Promise<Array>} 共通テンプレート配列
     */
    getCommonTemplates() {
        return this._fetch('/admin/templates');
    }

    /**
     * ユーザーテンプレートを保存
     * @param {string} name - テンプレート名
     * @param {string} sql - SQL内容
     * @returns {Promise<Object>} 保存結果
     */
    saveUserTemplate(name, sql) {
        return this._fetch('/users/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, sql })
        });
    }

    /**
     * 管理者ログイン
     * @param {string} password - 管理者パスワード
     * @returns {Promise<Object>} ログイン結果
     */
    adminLogin(password) {
        return this._fetch('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
    }
} 