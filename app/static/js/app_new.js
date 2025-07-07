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
            
            // エディタの内容監視を設定
            this.setupEditorContentMonitoring();
            
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
     * エディタの内容変更を監視し、プレースホルダーを検出
     */
    setupEditorContentMonitoring() {
        if (this.editorService.isReady()) {
            // Monaco Editorの内容変更イベントを監視
            this.editorService.sqlEditor.onDidChangeModelContent(() => {
                this.checkForPlaceholders();
            });
        }
    }

    /**
     * プレースホルダーの検出と入力欄の更新
     */
    checkForPlaceholders() {
        const sql = this.editorService.getValue();
        const placeholders = this.editorService.parsePlaceholders(sql);
        
        // UiServiceにプレースホルダー情報を渡して入力欄を更新
        this.uiService.updatePlaceholderInputs(placeholders);
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

        // ▼▼▼ 以下を追加 ▼▼▼
        // 結果テーブルのヘッダーに対するクリックイベント（イベント委任）
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            resultsContainer.addEventListener('click', (e) => {
                const sortHeader = e.target.closest('th.sortable');
                const filterIcon = e.target.closest('.filter-icon');
                
                if (filterIcon) {
                    // フィルターアイコンをクリックした場合
                    e.preventDefault();
                    e.stopPropagation();
                    this.showFilterPopup(filterIcon.dataset.column, filterIcon);
                } else if (sortHeader && !e.target.closest('.filter-icon')) {
                    // ソートヘッダーをクリックした場合（フィルターアイコン以外）
                    this.handleSort(sortHeader.dataset.column);
                }
            });
        }
        
        // ポップアップの外側クリックで閉じる
        document.body.addEventListener('click', (e) => {
            const popup = document.getElementById('filter-popup-active');
            if (popup && !popup.contains(e.target) && !e.target.classList.contains('filter-icon')) {
                const column = popup.querySelector('.form-check-input').dataset.column;
                this.applyAndCloseFilterPopup(column);
            }
        });

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
            await this.uiService.buildMetadataTree(metadata);
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
            await this.uiService.buildMetadataTree(metadata);
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

        // 選択範囲がある場合は通知
        if (this.editorService.hasSelection()) {
            console.log('選択範囲のSQLを実行します');
        }

        // プレースホルダーを置換（選択範囲内のパラメータのみ処理）
        const placeholderValues = this.uiService.getPlaceholderValues();
        let sql = this.editorService.getSelectedSQLWithParameters(placeholderValues);
        
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
                
                // 成功メッセージは表示しない（ユーザーが見た目で実行成功がわかるため）
            } else {
                throw new Error(result.error_message || 'SQLの実行に失敗しました');
            }
        } catch (error) {
            console.error('SQL実行エラー:', error);
            // エラーメッセージから「SQL実行エラー:」プレフィックスを除去
            const errorMessage = error.message.replace(/^SQL実行エラー:\s*/, '');
            this.uiService.showError(errorMessage);
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
            // 成功メッセージは表示しない（ユーザーが見た目で整形成功がわかるため）
        } catch (error) {
            console.error('SQL整形エラー:', error);
            // エラーメッセージから「SQL整形エラー:」プレフィックスを除去
            const errorMessage = error.message.replace(/^SQL整形エラー:\s*/, '');
            this.uiService.showError(errorMessage);
        }
    }

    /**
     * SQLのクリア
     */
    clearSQL() {
        if (this.editorService.isReady()) {
            this.editorService.clear();
            // 成功メッセージは表示しない（ユーザーが見た目でクリア成功がわかるため）
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
            // エラーメッセージから「エクスポートエラー:」プレフィックスを除去
            const errorMessage = error.message.replace(/^エクスポートエラー:\s*/, '');
            this.uiService.showError(errorMessage);
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
            // 成功メッセージは表示しない（ユーザーが見た目で保存成功がわかるため）
        } catch (error) {
            console.error('テンプレート保存エラー:', error);
            // エラーメッセージから「テンプレート保存エラー:」プレフィックスを除去
            const errorMessage = error.message.replace(/^テンプレート保存エラー:\s*/, '');
            this.uiService.showError(errorMessage);
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

    // AppController クラス内に新しいメソッドとして追加
    handleSort(column) {
        if (!this.stateService.getCurrentResults()) return;

        const sortState = this.stateService.getSortState();
        let direction = 'asc';

        if (sortState.column === column) {
            // 同じカラムをクリックしたら昇順・降順を切り替え
            direction = sortState.direction === 'asc' ? 'desc' : 'asc';
        }
        
        this.stateService.setSortState(column, direction);
        
        // ソートとフィルターを適用
        this.applyFiltersAndSort();
        this.uiService.updateSortInfo(column, direction);
    }

    // AppController クラス内に新しいメソッドとして追加
    showFilterPopup(column, targetIcon) {
        // 他のフィルターで絞り込み済みのデータを元に候補を作成する
        const currentlyVisibleData = this._getFilteredData(column);

        if (!currentlyVisibleData) return;

        // 絞り込み後のデータからユニークな値を取得し、数値も考慮してソート
        const uniqueValues = [...new Set(currentlyVisibleData.map(row => row[column]))].sort((a, b) => {
            const numA = parseFloat(a);
            const numB = parseFloat(b);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            return String(a).localeCompare(String(b));
        });
        
        const selectedValues = this.stateService.getFilters()[column] || [];
        this.uiService.showFilterPopup(column, targetIcon, uniqueValues, selectedValues);
        document.getElementById('apply-filter-btn').onclick = () => this.applyAndCloseFilterPopup(column);
        document.getElementById('clear-filter-btn').onclick = () => this.clearAndCloseFilterPopup(column);
        document.getElementById('close-filter-btn').onclick = () => this.uiService.clearFilterPopup();
    }

    // AppController クラス内に新しいメソッドとして追加
    applyAndCloseFilterPopup(column) {
        const popup = document.getElementById('filter-popup-active');
        if (!popup) return;
        const selectedValues = Array.from(popup.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        this.stateService.setFilter(column, selectedValues);
        this.applyFiltersAndSort();
        this.uiService.clearFilterPopup();
        this.uiService.updateFilterIcons();
    }

    // AppController クラス内に新しいメソッドとして追加
    clearAndCloseFilterPopup(column) {
        this.stateService.setFilter(column, []);
        this.applyFiltersAndSort();
        this.uiService.clearFilterPopup();
        this.uiService.updateFilterIcons();
    }

    // AppController クラス内に新しいメソッドとして追加
    /**
     * 現在アクティブなフィルターを適用した後のデータセットを取得する。
     * @param {string|null} excludeColumn - 候補リスト生成時に無視するカラムフィルター
     * @returns {Array} フィルタリングされたデータ
     */
    _getFilteredData(excludeColumn = null) {
        const results = this.stateService.getCurrentResults();
        if (!results || !results.data) return [];

        const filters = this.stateService.getFilters();
        const filterKeys = Object.keys(filters).filter(key => key !== excludeColumn);

        if (filterKeys.length === 0) {
            return results.data.slice();
        }

        return results.data.filter(row => {
            return filterKeys.every(key => {
                const selectedValues = filters[key];
                if (!selectedValues || selectedValues.length === 0) {
                    return true;
                }
                return selectedValues.includes(String(row[key]));
            });
        });
    }

    // AppController クラス内に新しいメソッドとして追加
    applyFiltersAndSort() {
        const results = this.stateService.getCurrentResults();
        if (!results || !results.data) return;
    
        // ヘルパーメソッドを使ってフィルター後のデータを取得
        let processedData = this._getFilteredData();
        
        // ソート処理
        const sortState = this.stateService.getSortState();
        if (sortState.column) {
            processedData.sort((a, b) => {
                const aVal = a[sortState.column];
                const bVal = b[sortState.column];
                
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;
                
                // 数値と文字列を区別してソート
                const numA = parseFloat(aVal);
                const numB = parseFloat(bVal);
                let comparison;
    
                if (String(aVal).match(/^\d+(\.\d+)?$/) && String(bVal).match(/^\d+(\.\d+)?$/) && !isNaN(numA) && !isNaN(numB)) {
                    comparison = numA - numB;
                } else {
                    comparison = String(aVal).localeCompare(String(bVal));
                }
                
                return sortState.direction === 'asc' ? comparison : -comparison;
            });
        }
        
        this.uiService.displayResults(processedData, results.columns);
        this.uiService.updateFilterIcons();
        this.uiService.updateSortIcons(sortState.column, sortState.direction); // ソートアイコンも更新
    }
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
        // 完了報告（成功メッセージ等）は表示しない
        // appController.getUiService().showInfo(`${type === 'user' ? '個人用' : '共通'}テンプレートを読み込みました`);
    }
    // テンプレート候補ウィンドウを閉じる
    const dropdown = document.getElementById('template-dropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
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