/**
 * SQL道場 Webアプリケーションのメインコントローラー
 * 各サービスクラスを統合し、アプリケーション全体の制御を担当
 */
class AppController {
    constructor() {
        // サービスの初期化
        this.apiService = new ApiService();
        this.stateService = new StateService();
        this.uiService = new UiService();
        this.editorService = new EditorService('monaco-editor-container', this.apiService);
        
        // リサイザー関連
        this.isResizing = false;
        this.isHorizontalResizing = false;
        
        // 初期化フラグ
        this.isInitialized = false;
    }

    /**
     * アプリケーションの初期化
     */
    async init() {
        try {
            // UiServiceの初期化
            this.uiService.init();
            
            // エディタの初期化
            await this.editorService.init();
            
            // イベントのバインド
            this.bindEvents();
            
            // リサイザーの初期化
            this.initResizer();
            this.initHorizontalResizer();
            
            // 初期データの読み込み
            await this.loadInitialData();
            
            // 初期レイアウト設定
            this.initializeLayout();
            
            // テンプレートの読み込み
            await this.loadAllTemplates();
            
            // コピーされたSQLの確認
            this.checkAndApplyCopiedSQL();
            
            this.isInitialized = true;
            console.log('アプリケーション初期化完了');
            
        } catch (error) {
            console.error('アプリケーション初期化エラー:', error);
            this.uiService.showError('アプリケーションの初期化に失敗しました');
        }
    }

    /**
     * 初期レイアウト設定
     */
    initializeLayout() {
        // 初期表示時は結果表示エリアを非表示
        this.hideResults();
    }

    /**
     * エディタを最大化
     */
    maximizeEditor() {
        this.stateService.setEditorMaximized(true);
        this.uiService.setEditorMaximized(true);
        
        // Monaco Editorのサイズを更新
        if (this.editorService.isReady()) {
            setTimeout(() => {
                this.editorService.layout();
            }, 100);
        }
    }

    /**
     * エディタを最小化
     */
    minimizeEditor() {
        this.stateService.setEditorMaximized(false);
        this.uiService.setEditorMaximized(false);
        
        // Monaco Editorのサイズを更新
        if (this.editorService.isReady()) {
            setTimeout(() => {
                this.editorService.layout();
            }, 100);
        }
    }

    /**
     * エディタの最大化・最小化をトグル
     */
    toggleEditorSize() {
        if (this.stateService.isEditorMaximized) {
            this.minimizeEditor();
        } else {
            this.maximizeEditor();
        }
    }

    /**
     * 結果表示エリアを非表示
     */
    hideResults() {
        this.uiService.clearResults();
    }

    /**
     * イベントのバインド
     */
    bindEvents() {
        // ボタンイベント
        const replaceBtn = (id, newAction) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', newAction);
            }
        };

        // SQL実行ボタン
        replaceBtn('executeBtn', () => this.executeSQL());
        
        // SQL整形ボタン
        replaceBtn('formatBtn', () => this.formatSQL());
        
        // SQLクリアボタン
        replaceBtn('clearBtn', () => this.clearSQL());
        
        // エディタトグルボタン
        replaceBtn('toggleEditorBtn', () => this.toggleEditorSize());
        
        // CSVエクスポートボタン
        replaceBtn('exportCsvBtn', () => this.exportData('csv'));

        // テンプレート保存ボタン
        replaceBtn('save-template-btn', () => this.saveUserTemplate());

        // 管理者ページボタン
        const adminPageBtn = document.getElementById('admin-page-btn');
        if (adminPageBtn) {
            adminPageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAdminLoginModal();
            });
        }

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            // Ctrl+Enter: SQL実行
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.executeSQL();
            }
            // Ctrl+Shift+F: SQL整形
            if (e.ctrlKey && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                this.formatSQL();
            }
            // Ctrl+L: クリア
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                this.clearSQL();
            }
            // F11: 全画面切り替え
            if (e.key === 'F11') {
                e.preventDefault();
                this.toggleFullscreen();
            }
            // F1: ショートカット表示
            if (e.key === 'F1') {
                e.preventDefault();
                this.showKeyboardShortcuts();
            }
        });
    }

    /**
     * リサイザーの初期化
     */
    initResizer() {
        const resizer = document.getElementById('resizer');
        if (!resizer) return;

        resizer.addEventListener('mousedown', (e) => {
            this.isResizing = true;
            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseup', this.stopResize);
        });
    }

    /**
     * 水平リサイザーの初期化
     */
    initHorizontalResizer() {
        const horizontalResizer = document.getElementById('horizontal-resizer');
        if (!horizontalResizer) return;

        horizontalResizer.addEventListener('mousedown', (e) => {
            this.isHorizontalResizing = true;
            document.addEventListener('mousemove', this.handleHorizontalMouseMove);
            document.addEventListener('mouseup', this.stopHorizontalResize);
        });
    }

    /**
     * マウス移動ハンドラー
     */
    handleMouseMove = (e) => {
        if (!this.isResizing) return;
        
        const sidebar = document.getElementById('sidebar');
        const newWidth = e.clientX;
        sidebar.style.width = `${newWidth}px`;
    }

    /**
     * リサイズ停止
     */
    stopResize = () => {
        this.isResizing = false;
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.stopResize);
    }

    /**
     * 水平マウス移動ハンドラー
     */
    handleHorizontalMouseMove = (e) => {
        if (!this.isHorizontalResizing) return;
        
        const editorContainer = document.getElementById('sql-editor-container');
        const resultsContainer = document.getElementById('results-container');
        
        if (editorContainer && resultsContainer) {
            const newHeight = e.clientY;
            const minHeight = 120; // 最小高さ（3行程度）
            const maxHeight = window.innerHeight - 200; // 最大高さ
            
            if (newHeight >= minHeight && newHeight <= maxHeight) {
                // CSSクラスを削除して手動サイズに切り替え
                editorContainer.classList.remove('editor-maximized', 'editor-minimized');
                editorContainer.style.height = newHeight + 'px';
                
                // Monaco Editorのサイズを更新
                if (this.editorService.isReady()) {
                    this.editorService.layout();
                }
            }
        }
    }

    /**
     * 水平リサイズ停止
     */
    stopHorizontalResize = () => {
        this.isHorizontalResizing = false;
        document.removeEventListener('mousemove', this.handleHorizontalMouseMove);
        document.removeEventListener('mouseup', this.stopHorizontalResize);
    }

    /**
     * 初期データの読み込み
     */
    async loadInitialData() {
        try {
            // 接続状態の確認
            await this.loadConnectionStatus();
            
            // メタデータの読み込み
            await this.loadMetadataTree();
            
        } catch (error) {
            console.error('初期データ読み込みエラー:', error);
            this.uiService.showError('初期データの読み込みに失敗しました');
        }
    }

    /**
     * 接続状態の読み込み
     */
    async loadConnectionStatus() {
        try {
            const status = await this.apiService.getConnectionStatus();
            this.stateService.setConnectionStatus(status);
            this.updateConnectionStatus(status.connected);
        } catch (error) {
            console.error('接続状態取得エラー:', error);
            this.updateConnectionStatus(false);
        }
    }

    /**
     * 接続状態の更新
     */
    updateConnectionStatus(isConnected) {
        const statusElement = document.querySelector('.connection-status');
        if (statusElement) {
            statusElement.className = `connection-status ${isConnected ? 'connected' : 'disconnected'}`;
            statusElement.textContent = isConnected ? '接続中' : '未接続';
        }
    }

    /**
     * メタデータツリーの読み込み
     */
    async loadMetadataTree() {
        try {
            const metadata = await this.apiService.getInitialMetadata();
            this.stateService.setAllMetadata(metadata);
            this.uiService.buildMetadataTree(metadata);
        } catch (error) {
            console.error('メタデータ読み込みエラー:', error);
            this.uiService.showError('メタデータの読み込みに失敗しました');
        }
    }

    /**
     * メタデータの強制更新
     */
    async refreshMetadata() {
        try {
            this.uiService.showLoading(true);
            const metadata = await this.apiService.refreshMetadata();
            this.stateService.setAllMetadata(metadata);
            this.uiService.buildMetadataTree(metadata);
            this.uiService.showSuccess('メタデータを更新しました');
        } catch (error) {
            console.error('メタデータ更新エラー:', error);
            this.uiService.showError('メタデータの更新に失敗しました');
        } finally {
            this.uiService.showLoading(false);
        }
    }

    /**
     * SQLの実行
     */
    async executeSQL() {
        if (!this.editorService.isReady()) {
            this.uiService.showError('エディタが初期化されていません');
            return;
        }

        const sql = this.editorService.getValue();
        if (!sql.trim()) {
            this.uiService.showError('SQLを入力してください');
            return;
        }

        this.uiService.showLoading(true);
        
        try {
            const limit = document.getElementById('limit-check')?.checked ? 5000 : null;
            const result = await this.apiService.executeSQL(sql, limit);
            
            if (result.success) {
                this.stateService.setCurrentResults(result);
                this.uiService.displayResults(result.data, result.columns);
                this.uiService.updateSortInfo(null, null);
                
                // 実行時間の表示
                const executionTimeElement = document.getElementById('execution-time');
                if (executionTimeElement) {
                    executionTimeElement.textContent = `${result.execution_time.toFixed(3)}秒`;
                }
                
                // SQL実行成功時にエディタを最小化
                this.minimizeEditor();
                
                this.uiService.showSuccess('SQLを実行しました');
            } else {
                throw new Error(result.error_message || 'SQLの実行に失敗しました');
            }
        } catch (error) {
            console.error('SQL実行エラー:', error);
            this.uiService.showError(`SQL実行エラー: ${error.message}`);
        } finally {
            this.uiService.showLoading(false);
        }
    }

    /**
     * SQLの整形
     */
    async formatSQL() {
        if (!this.editorService.isReady()) {
            this.uiService.showError('エディタが初期化されていません');
            return;
        }

        try {
            await this.editorService.format();
            this.uiService.showSuccess('SQLを整形しました');
        } catch (error) {
            console.error('SQL整形エラー:', error);
            this.uiService.showError(`SQL整形エラー: ${error.message}`);
        }
    }

    /**
     * SQLのクリア
     */
    clearSQL() {
        if (this.editorService.isReady()) {
            this.editorService.clear();
            this.uiService.showInfo('SQLをクリアしました');
        }
    }

    /**
     * データのエクスポート
     */
    async exportData(format = 'csv') {
        const sql = this.editorService.getValue();
        if (!sql.trim()) {
            this.uiService.showError('エクスポートするSQLを入力してください');
            return;
        }

        try {
            this.uiService.showLoading(true);
            const blob = await this.apiService.exportData(sql, format);
            const filename = `export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${format}`;
            this.uiService.downloadBlob(blob, filename);
            this.uiService.showSuccess(`${format.toUpperCase()}ファイルをダウンロードしました`);
        } catch (error) {
            console.error('エクスポートエラー:', error);
            this.uiService.showError(`エクスポートエラー: ${error.message}`);
        } finally {
            this.uiService.showLoading(false);
        }
    }

    /**
     * 全テンプレートの読み込み
     */
    async loadAllTemplates() {
        try {
            // ユーザーテンプレートと共通テンプレートを並行して読み込み
            const [userTemplates, commonTemplates] = await Promise.all([
                this.apiService.getAllTemplates(),
                this.apiService.getCommonTemplates()
            ]);
            
            this.stateService.setUserTemplates(userTemplates);
            this.stateService.setAdminTemplates(commonTemplates);
            
            this.updateTemplateDropdown();
        } catch (error) {
            console.error('テンプレート読み込みエラー:', error);
            // エラーが発生しても空の配列で初期化
            this.stateService.setUserTemplates([]);
            this.stateService.setAdminTemplates([]);
            this.updateTemplateDropdown();
        }
    }

    /**
     * テンプレートドロップダウンの更新
     */
    updateTemplateDropdown() {
        const dropdown = document.getElementById('template-dropdown');
        if (!dropdown) return;

        let html = '';
        
        // ユーザーテンプレート
        const userTemplates = this.stateService.getUserTemplates();
        if (userTemplates && userTemplates.length > 0) {
            html += '<div class="template-section"><strong>自分のテンプレート</strong></div>';
            userTemplates.forEach(template => {
                html += `
                    <div class="template-item" onclick="loadTemplate('user', '${template.sql.replace(/'/g, "\\'")}')" title="${template.sql}">
                        <i class="fas fa-user me-2"></i>${template.name}
                    </div>
                `;
            });
        }
        
        // 共通テンプレート
        const commonTemplates = this.stateService.getAdminTemplates();
        if (commonTemplates && commonTemplates.length > 0) {
            html += '<div class="template-section"><strong>共通テンプレート</strong></div>';
            commonTemplates.forEach(template => {
                html += `
                    <div class="template-item" onclick="loadTemplate('admin', '${template.sql.replace(/'/g, "\\'")}')" title="${template.sql}">
                        <i class="fas fa-shield-alt me-2"></i>${template.name}
                    </div>
                `;
            });
        }
        
        if (html === '') {
            html = '<div class="template-item disabled">テンプレートがありません<br><small>「テンプレート保存」ボタンで新しいテンプレートを作成できます</small></div>';
        }
        
        dropdown.innerHTML = html;
    }

    /**
     * ユーザーテンプレートの保存
     */
    async saveUserTemplate() {
        const sql = this.editorService.getValue();
        if (!sql.trim()) {
            this.uiService.showError('保存するSQLを入力してください');
            return;
        }

        const name = prompt('テンプレート名を入力してください:');
        if (!name) return;

        try {
            await this.apiService.saveUserTemplate(name, sql);
            await this.loadAllTemplates(); // テンプレート一覧を再読み込み
            this.uiService.showSuccess('テンプレートを保存しました');
        } catch (error) {
            console.error('テンプレート保存エラー:', error);
            this.uiService.showError(`テンプレート保存エラー: ${error.message}`);
        }
    }

    /**
     * 管理者ログインモーダルの表示
     */
    async showAdminLoginModal() {
        const password = prompt('管理者パスワードを入力してください:');
        if (!password) return;

        try {
            const result = await this.apiService.adminLogin(password);
            // 管理者ログインAPIは成功時にmessageを返す
            if (result.message) {
                window.location.href = '/admin';
            } else {
                this.uiService.showError('パスワードが正しくありません');
            }
        } catch (error) {
            console.error('管理者ログインエラー:', error);
            this.uiService.showError(`ログインエラー: ${error.message}`);
        }
    }

    /**
     * コピーされたSQLの確認と適用
     */
    checkAndApplyCopiedSQL() {
        // URLパラメータからのコピー
        const urlParams = new URLSearchParams(window.location.search);
        const copiedSql = urlParams.get('copied_sql');
        
        if (copiedSql && this.editorService.isReady()) {
            this.editorService.setValue(decodeURIComponent(copiedSql));
            this.uiService.showInfo('コピーされたSQLを適用しました');
            
            // URLからパラメータを削除
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
        
        // localStorageからのコピー（履歴からのコピー）
        const sqlToCopy = localStorage.getItem('sqlToCopy');
        if (sqlToCopy && this.editorService.isReady()) {
            this.editorService.setValue(sqlToCopy);
            localStorage.removeItem('sqlToCopy');
            this.formatSQL(); // SQLを整形
            this.uiService.showSuccess('SQLをクリップボードから貼り付けました。');
        } else if (sqlToCopy) {
            // エディタがまだ初期化されていない場合は、少し待ってから再試行
            setTimeout(() => this.checkAndApplyCopiedSQL(), 100);
        }
    }

    /**
     * 全画面切り替え
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    /**
     * キーボードショートカットの表示
     */
    showKeyboardShortcuts() {
        const modal = new bootstrap.Modal(document.getElementById('shortcutsModal'));
        modal.show();
    }

    // グローバル関数として公開（後方互換性のため）
    getApiService() { return this.apiService; }
    getStateService() { return this.stateService; }
    getUiService() { return this.uiService; }
    getEditorService() { return this.editorService; }
}

// グローバルスコープに公開（後方互換性のため）
window.appController = null;

// グローバル関数（後方互換性のため）
function toggleSchema(schemaId) {
    const toggleIcon = document.getElementById(`toggle-${schemaId}`);
    const tableList = document.getElementById(`tables-${schemaId}`);
    
    if (toggleIcon && tableList) {
        const isExpanded = tableList.style.display !== 'none';
        tableList.style.display = isExpanded ? 'none' : 'block';
        toggleIcon.className = `fas fa-chevron-${isExpanded ? 'right' : 'down'} schema-toggle`;
    }
}

function toggleTemplates() {
    const dropdown = document.getElementById('template-dropdown');
    if (dropdown) {
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        
        // ドロップダウンが表示された場合、クリック外での非表示を設定
        if (!isVisible) {
            setTimeout(() => {
                document.addEventListener('click', hideTemplatesOnClickOutside);
            }, 0);
        } else {
            document.removeEventListener('click', hideTemplatesOnClickOutside);
        }
    }
}

function hideTemplatesOnClickOutside(event) {
    const dropdown = document.getElementById('template-dropdown');
    const templateButton = event.target.closest('.sql-templates');
    
    if (dropdown && !templateButton) {
        dropdown.style.display = 'none';
        document.removeEventListener('click', hideTemplatesOnClickOutside);
    }
}

function loadTemplate(type, sql) {
    if (appController && appController.getEditorService()) {
        appController.getEditorService().setValue(sql);
        appController.getUiService().showInfo(`${type === 'user' ? '個人用' : '共通'}テンプレートを読み込みました`);
    }
}

function showKeyboardShortcuts() {
    if (appController) {
        appController.showKeyboardShortcuts();
    }
}

function toggleFullscreen() {
    if (appController) {
        appController.toggleFullscreen();
    }
} 