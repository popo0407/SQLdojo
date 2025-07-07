/**
 * アプリケーションの状態管理を担当するサービスクラス
 * アプリケーション全体で共有される状態（データ）を管理
 */
class StateService {
    constructor() {
        // 現在の実行結果
        this.currentResults = null;
        
        // 全メタデータ
        this.allMetadata = null;
        
        // ソート状態
        this.sortState = { 
            column: null, 
            direction: 'asc' 
        };
        
        // フィルター値
        this.filterValue = '';
        this.filters = {}; // ▼ フィルターの状態を保持するオブジェクトを追加
        
        // エディタの最大化状態
        this.isEditorMaximized = false;
        
        // テンプレートデータ
        this.userTemplates = [];
        this.adminTemplates = [];
        this.userParts = [];
        this.adminParts = [];
        
        // 接続状態
        this.connectionStatus = null;
    }

    // 実行結果の管理
    setCurrentResults(results) { 
        this.currentResults = results; 
    }
    
    getCurrentResults() { 
        return this.currentResults; 
    }

    // メタデータの管理
    setAllMetadata(metadata) { 
        this.allMetadata = metadata; 
    }
    
    getAllMetadata() { 
        return this.allMetadata; 
    }

    // ソート状態の管理
    setSortState(column, direction) { 
        this.sortState = { column, direction }; 
    }
    
    getSortState() { 
        return this.sortState; 
    }

    // フィルター値の管理
    setFilterValue(value) { 
        this.filterValue = value; 
    }
    
    getFilterValue() { 
        return this.filterValue; 
    }

    // ▼ フィルター用のゲッター/セッターを追加
    setFilter(column, values) {
        if (values && values.length > 0) {
            this.filters[column] = values;
        } else {
            delete this.filters[column];
        }
    }
    getFilters() {
        return this.filters;
    }

    // エディタ状態の管理
    setEditorMaximized(maximized) { 
        this.isEditorMaximized = maximized; 
    }
    
    isEditorMaximized() { 
        return this.isEditorMaximized; 
    }

    // テンプレートの管理
    setUserTemplates(templates) { 
        this.userTemplates = templates; 
    }
    
    getUserTemplates() { 
        return this.userTemplates; 
    }
    
    setAdminTemplates(templates) { 
        this.adminTemplates = templates; 
    }
    
    getAdminTemplates() { 
        return this.adminTemplates; 
    }

    // パーツの管理
    setUserParts(parts) { 
        this.userParts = parts; 
    }
    
    getUserParts() { 
        return this.userParts; 
    }
    
    setAdminParts(parts) { 
        this.adminParts = parts; 
    }
    
    getAdminParts() { 
        return this.adminParts; 
    }

    // 接続状態の管理
    setConnectionStatus(status) { 
        this.connectionStatus = status; 
    }
    
    getConnectionStatus() { 
        return this.connectionStatus; 
    }

    /**
     * 状態をリセット
     */
    reset() {
        this.currentResults = null;
        this.sortState = { column: null, direction: 'asc' };
        this.filterValue = '';
    }

    /**
     * 特定のスキーマのメタデータを取得
     * @param {string} schemaName - スキーマ名
     * @returns {Object|null} スキーマのメタデータ
     */
    getSchemaMetadata(schemaName) {
        if (!this.allMetadata) return null;
        return this.allMetadata.find(schema => schema.schema_name === schemaName) || null;
    }

    /**
     * 特定のテーブルのメタデータを取得
     * @param {string} schemaName - スキーマ名
     * @param {string} tableName - テーブル名
     * @returns {Object|null} テーブルのメタデータ
     */
    getTableMetadata(schemaName, tableName) {
        const schema = this.getSchemaMetadata(schemaName);
        if (!schema || !schema.tables) return null;
        return schema.tables.find(table => table.table_name === tableName) || null;
    }

    /**
     * 全テンプレートを取得（ユーザー + 管理者）
     * @returns {Array} 全テンプレートの配列
     */
    getAllTemplates() {
        const userTemplates = this.userTemplates.map(t => ({ ...t, type: 'user' }));
        const adminTemplates = this.adminTemplates.map(t => ({ ...t, type: 'admin' }));
        return [...userTemplates, ...adminTemplates];
    }

    /**
     * 全パーツを取得（ユーザー + 管理者）
     * @returns {Array} 全パーツの配列
     */
    getAllParts() {
        const userParts = this.userParts.map(p => ({ ...p, type: 'user' }));
        const adminParts = this.adminParts.map(p => ({ ...p, type: 'admin' }));
        return [...userParts, ...adminParts];
    }
} 