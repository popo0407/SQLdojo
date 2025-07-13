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
            
            // パーツの読み込み
            await this.loadAllParts();
            
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
        const replaceBtn = (id, newAction) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.onclick = newAction;
            }
        };

        // ボタンイベントの設定
        replaceBtn('executeBtn', () => this.executeSQL());
        replaceBtn('formatBtn', () => this.formatSQL());
        replaceBtn('clearBtn', () => this.clearSQL());
        replaceBtn('save-template-btn', () => this.saveUserTemplate());
        replaceBtn('save-part-btn', () => this.saveUserPart());

        // エディタの選択変更イベント
        if (this.editorService.sqlEditor) {
            this.editorService.sqlEditor.onDidChangeCursorSelection(() => {
                this.updatePartSaveButton();
            });
        }

        // 初期状態でパーツ保存ボタンを更新
        this.updatePartSaveButton();

        // エディタトグルボタン
        replaceBtn('toggleEditorBtn', () => this.toggleEditorSize());
        
        // CSVエクスポートボタン
        replaceBtn('exportCsvBtn', () => this.exportData('csv'));

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
        // 親要素の左端からの相対的なマウス位置を計算
        const newWidth = e.clientX - sidebar.parentElement.getBoundingClientRect().left;
        
        // 最小幅・最大幅を設定
        const minWidth = 200;
        const maxWidth = window.innerWidth / 2;
        
        if (newWidth >= minWidth && newWidth <= maxWidth) {
            sidebar.style.width = `${newWidth}px`;
        }
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
        
        if (editorContainer) {
            // エディタコンテナの上端からの相対的なマウス位置を計算
            const newHeight = e.clientY - editorContainer.getBoundingClientRect().top;

            const minHeight = 120; // 最小高さ
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
     * SQL実行
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
            // 既存のキャッシュをクリア
            const currentSessionId = this.stateService.getCurrentSessionId();
            if (currentSessionId) {
                // 非同期でクリーンアップを実行（完了を待たない）
                this.apiService.cleanupSession(currentSessionId).catch(err => {
                    console.warn(`旧セッション(${currentSessionId})の非同期クリーンアップ中にエラーが発生しました。`, err);
                });
                this.stateService.setCurrentSessionId(null);
                console.log('旧キャッシュセッションのクリーンアップをリクエストしました。');
            }
            
            // キャッシュ機能付きSQL実行
            const result = await this.apiService.executeSQLWithCache(sql);
            
            if (result.success) {
                // セッションIDを保存
                this.currentSessionId = result.session_id;
                
                // キャッシュ進捗表示を開始
                this.uiService.startCacheProgress(result.session_id);
                
                // 進捗監視を開始
                this.startProgressMonitoring(result.session_id);
                
                // 成功メッセージは表示しない（ユーザーが見た目で実行成功がわかるため）
            } else {
                throw new Error(result.error_message || 'SQLの実行に失敗しました');
            }
        } catch (error) {
            console.error('SQL実行エラー:', error);
            // エラーメッセージから「SQL実行エラー:」プレフィックスを除去
            const errorMessage = error.message.replace(/^SQL実行エラー:\s*/, '');
            this.uiService.showError(errorMessage);
            this.uiService.showLoading(false);
        }
    }

    /**
     * 進捗監視を開始
     * @param {string} sessionId - セッションID
     */
    startProgressMonitoring(sessionId) {
        const checkProgress = async () => {
            try {
                const status = await this.apiService.getSessionStatus(sessionId);
                
                // 進捗を更新
                this.uiService.updateCacheProgress(status);
                
                if (status.status === 'completed') {
                    // キャッシュ完了
                    this.uiService.stopCacheProgress();
                    this.uiService.showLoading(false);
                    
                    // キャッシュされたデータを読み取り
                    await this.loadCachedData(sessionId);
                    
                } else if (status.status === 'error') {
                    // エラー発生
                    this.uiService.stopCacheProgress();
                    this.uiService.showLoading(false);
                    this.uiService.showError(status.error_message || 'データの取得中にエラーが発生しました');
                    
                } else if (status.status === 'cancelled') {
                    // キャンセルされた場合も部分的なデータを表示
                    this.uiService.stopCacheProgress();
                    this.uiService.showLoading(false);
                    await this.loadCachedData(sessionId);
                    
                } else {
                    // 処理中は1秒後に再チェック
                    setTimeout(checkProgress, 1000);
                }
                
            } catch (error) {
                console.error('進捗監視エラー:', error);
                
                // 404エラーの場合はセッションが見つからない
                if (error.message && error.message.includes('404')) {
                    this.uiService.stopCacheProgress();
                    this.uiService.showLoading(false);
                    this.uiService.showError('セッションが見つかりません。再度SQLを実行してください。');
                    return;
                }
                
                // その他のエラーの場合は再試行
                console.log('進捗監視でエラーが発生しました。1秒後に再試行します。');
                setTimeout(checkProgress, 1000);
            }
        };
        
        // 初回チェックを開始
        checkProgress();
    }

    /**
     * キャッシュされたデータを読み取り
     * @param {string} sessionId - セッションID
     */
    async loadCachedData(sessionId) {
        try {
            const result = await this.apiService.readCachedData(sessionId, 1, 100);
            
            if (result.success) {
                // セッションIDを保存
                this.stateService.setCurrentSessionId(sessionId);
                
                // キャッシュされたデータを表示
                this.uiService.displayCachedResults(
                    result.data, 
                    result.columns, 
                    result.total_count
                );
                
                // 実行時間の表示（undefinedチェックを追加）
                const executionTimeElement = document.getElementById('execution-time');
                if (executionTimeElement && result.execution_time !== undefined) {
                    executionTimeElement.textContent = `${result.execution_time.toFixed(3)}秒`;
                } else if (executionTimeElement) {
                    executionTimeElement.textContent = '実行時間: 計測中...';
                }
                
                // SQL実行成功時にエディタを最小化
                this.minimizeEditor();
                
                // 成功メッセージは表示しない（ユーザーが見た目で実行成功がわかるため）
            } else {
                throw new Error(result.error_message || 'キャッシュされたデータの読み取りに失敗しました');
            }
        } catch (error) {
            console.error('キャッシュデータ読み取りエラー:', error);
            const errorMessage = error.message.replace(/^キャッシュデータ読み取りエラー:\s*/, '');
            this.uiService.showError(errorMessage);
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
            // ドロップダウン用のテンプレート一覧を取得（表示設定に基づく）
            const visibleTemplates = await this.apiService.getVisibleTemplatesForDropdown();
            
            // is_commonの代わりにtypeプロパティで個人用と共通用に分類
            const userTemplates = visibleTemplates.filter(t => t.type === 'user');
            const commonTemplates = visibleTemplates.filter(t => t.type === 'admin');
            
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
     * 全パーツの読み込み
     */
    async loadAllParts() {
        try {
            // ドロップダウン用のパーツ一覧を取得（表示設定に基づく）
            const visibleParts = await this.apiService.getVisiblePartsForDropdown();
            
            // is_commonの代わりにtypeプロパティで個人用と共通用に分類
            const userParts = visibleParts.filter(p => p.type === 'user');
            const commonParts = visibleParts.filter(p => p.type === 'admin');
            
            this.stateService.setUserParts(userParts);
            this.stateService.setAdminParts(commonParts);
            
            this.updatePartDropdown();
        } catch (error) {
            console.error('パーツ読み込みエラー:', error);
            // エラーが発生しても空の配列で初期化
            this.stateService.setUserParts([]);
            this.stateService.setAdminParts([]);
        }
    }
    
    
    /**
     * テンプレートドロップダウンの更新
     */
    updateTemplateDropdown() {
        const dropdown = document.getElementById('template-dropdown');
        if (!dropdown) return;

        let html = '';
        
        const userTemplates = this.stateService.getUserTemplates() || [];
        const commonTemplates = this.stateService.getAdminTemplates() || [];
        
        const allTemplates = [...userTemplates, ...commonTemplates];
        
        if (allTemplates.length > 0) {
            allTemplates.forEach(template => {
                // is_commonの代わりにtypeでアイコンを判定し、onclickではIDを渡すように変更
                const iconClass = template.type === 'admin' ? 'fas fa-shield-alt' : 'fas fa-user';
                html += `
                    <div class="template-item" onclick="appController.loadTemplateById('${template.id}')" title="${this.uiService.escapeHtml(template.sql)}">
                        <i class="${iconClass} me-2"></i>${this.uiService.escapeHtml(template.name)}
                    </div>
                `;
            });
        } else {
            html = '<div class="template-item disabled">テンプレートがありません<br><small>「テンプレート保存」ボタンで新しいテンプレートを作成できます</small></div>';
        }

        dropdown.innerHTML = html;
    }
    
    
    /**
     * パーツドロップダウンの更新
     */
    updatePartDropdown() {
        const dropdown = document.getElementById('part-dropdown');
        if (!dropdown) return;

        let html = '';
        
        const userParts = this.stateService.getUserParts() || [];
        const commonParts = this.stateService.getAdminParts() || [];
        
        const allParts = [...userParts, ...commonParts];
        
        if (allParts.length > 0) {
            allParts.forEach(part => {
                // is_commonの代わりにtypeでアイコンを判定し、onclickではIDを渡すように変更
                const iconClass = part.type === 'admin' ? 'fas fa-shield-alt' : 'fas fa-user';
                html += `
                    <div class="part-item" onclick="appController.loadPartById('${part.id}')" title="${this.uiService.escapeHtml(part.sql)}">
                        <i class="${iconClass} me-2"></i>${this.uiService.escapeHtml(part.name)}
                    </div>
                `;
            });
        } else {
            html = '<div class="part-item disabled">パーツがありません<br><small>「パーツ保存」ボタンで新しいパーツを作成できます</small></div>';
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
     * ユーザーパーツの保存
     */
    async saveUserPart() {
        if (!this.editorService.canSaveAsPart()) {
            this.uiService.showNotification('SQLエディタでテキストを選択してください', 'warning');
            return;
        }

        const selectedText = this.editorService.getSelectedText().trim();
        if (selectedText.length === 0) {
            this.uiService.showNotification('選択されたテキストがありません', 'warning');
            return;
        }

        if (selectedText.length > 1000) {
            this.uiService.showNotification('パーツは1000文字以内で保存してください', 'warning');
            return;
        }

        const name = prompt('パーツ名を入力してください:');
        if (!name) return;

        try {
            await this.apiService.saveUserPart(name, selectedText);
            await this.loadAllParts(); // パーツ一覧を再読み込み
            // 成功メッセージは表示しない（ユーザーが見た目で保存成功がわかるため）
        } catch (error) {
            console.error('パーツ保存エラー:', error);
            const errorMessage = error.message.replace(/^パーツ保存エラー:\s*/, '');
            this.uiService.showError(errorMessage);
        }
    }

    /**
     * パーツ保存ボタンの状態を更新
     */
    updatePartSaveButton() {
        const savePartBtn = document.getElementById('save-part-btn');
        if (savePartBtn) {
            if (this.editorService.canSaveAsPart()) {
                savePartBtn.disabled = false;
                savePartBtn.title = '選択されたSQLをパーツとして保存';
            } else {
                savePartBtn.disabled = true;
                savePartBtn.title = 'SQLエディタでテキストを選択してください';
            }
        }
    }

    /**
     * 管理者ログインモーダルの表示
     */
    async showAdminLoginModal() {
        // モーダルを表示
        const modal = new bootstrap.Modal(document.getElementById('adminPasswordModal'));
        modal.show();
        
        // パスワード入力フィールドにフォーカス
        const passwordInput = document.getElementById('modalAdminPassword');
        passwordInput.value = '';
        
        // モーダルが表示されたらパスワード入力にフォーカス
        document.getElementById('adminPasswordModal').addEventListener('shown.bs.modal', function () {
            passwordInput.focus();
        });
        
        // ログインボタンのイベントハンドラ
        const loginBtn = document.getElementById('modalAdminLoginBtn');
        const statusDiv = document.getElementById('modalAdminAuthStatus');
        
        // 既存のイベントリスナーを削除
        const newLoginBtn = loginBtn.cloneNode(true);
        loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
        
        newLoginBtn.addEventListener('click', async () => {
            const password = passwordInput.value;
            if (!password) {
                statusDiv.textContent = 'パスワードを入力してください';
                statusDiv.className = 'alert alert-warning';
                statusDiv.style.display = 'block';
                return;
            }
            
            try {
                statusDiv.textContent = '認証中...';
                statusDiv.className = 'alert alert-info';
                statusDiv.style.display = 'block';
                newLoginBtn.disabled = true;
                
                const result = await this.apiService.adminLogin(password);
                if (result.message) {
                    statusDiv.textContent = '認証成功！管理者ページに移動します...';
                    statusDiv.className = 'alert alert-success';
                    setTimeout(() => {
                        modal.hide();
                        window.location.href = '/admin';
                    }, 1000);
                } else {
                    statusDiv.textContent = 'パスワードが正しくありません';
                    statusDiv.className = 'alert alert-danger';
                }
            } catch (error) {
                console.error('管理者ログインエラー:', error);
                statusDiv.textContent = `ログインエラー: ${error.message}`;
                statusDiv.className = 'alert alert-danger';
            } finally {
                newLoginBtn.disabled = false;
            }
        });
        
        // Enterキーでログイン
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                newLoginBtn.click();
            }
        });
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

    /**
     * ログアウト処理
     */
    async logout() {
        try {
            console.log('ログアウト処理を開始します');
            
            // ① サーバーサイドのキャッシュを非同期でクリア（完了を待たない）
            console.log('サーバーサイドのキャッシュクリアをリクエストします...');
            this.apiService.cleanupCurrentUserCache().catch(err => {
                // エラーはコンソールに警告として出すが、処理はブロックしない
                console.warn('非同期キャッシュクリア中にエラーが発生しましたが、ログアウト処理を続行します。', err);
            });

            // ② ローカルキャッシュをクリア
            console.log('ローカルキャッシュをクリアします');
            sessionStorage.clear();
            localStorage.removeItem('sqlHistoryCache');
            localStorage.removeItem('userPreferences');
            localStorage.removeItem('sqlToCopy');
            
            // ③ セッションをクリアするためにログアウトAPIを呼び出す
            console.log('セッションをクリアするためにログアウトAPIを呼び出します...');
            const logoutResponse = await this.apiService.logout();
            
            console.log('ログアウトAPI応答:', logoutResponse);
            
            if (logoutResponse && logoutResponse.message) {
                console.log('ログアウト成功:', logoutResponse.message);
            } else {
                console.log('ログアウト応答が不正です:', logoutResponse);
            }
            
            console.log('ログインページに遷移します');
            window.location.replace('/login');
            
        } catch (error) {
            // 通信エラー等でも最終的にはログインページへ
            console.error('ログアウト処理中にエラーが発生しました:', error);
            console.log('エラーが発生しましたが、安全のためログインページに遷移します');
            
            // エラーが発生した場合でも、念のためローカルストレージはクリアしておく
            sessionStorage.clear();
            localStorage.clear();
            
            window.location.replace('/login');
        }
    }

    // グローバル関数として公開（後方互換性のため）
    getApiService() { return this.apiService; }
    getStateService() { return this.stateService; }
    getUiService() { return this.uiService; }
    getEditorService() { return this.editorService; }

    // AppController クラス内に新しいメソッドとして追加
    handleSort(column) {
        // キャッシュデータの場合は専用の処理を使用
        if (this.stateService.getCurrentSessionId()) {
            this.handleCachedSort(column);
            return;
        }

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
        // キャッシュデータの場合は専用の処理を使用
        if (this.stateService.getCurrentSessionId()) {
            this.showCachedFilterPopup(column, targetIcon);
            return;
        }

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

    /**
     * キャッシュデータ用のフィルタポップアップ表示
     */
    async showCachedFilterPopup(column, targetIcon) {
        try {
            // 現在のフィルタ条件を取得（対象カラムを除く）
            const currentFilters = { ...this.stateService.getFilters() };
            delete currentFilters[column];
            
            // フィルタ条件付きでデータを取得してユニーク値を抽出
            const result = await this.apiService.readCachedData(
                this.stateService.getCurrentSessionId(),
                1,
                1000, // より多くのデータを取得してユニーク値を抽出
                currentFilters,
                null // ソートなし
            );
            
            if (result.success && result.data.length > 0) {
                // ユニークな値を抽出
                const uniqueValues = [...new Set(result.data.map(row => row[column]))].sort((a, b) => {
                    const numA = parseFloat(a);
                    const numB = parseFloat(b);
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return numA - numB;
                    }
                    return String(a).localeCompare(String(b));
                });
                
                const selectedValues = this.stateService.getFilters()[column] || [];
                this.uiService.showFilterPopup(column, targetIcon, uniqueValues, selectedValues);
                
                // イベントリスナーを設定
                document.getElementById('apply-filter-btn').onclick = () => this.applyCachedFilterAndClose(column);
                document.getElementById('clear-filter-btn').onclick = () => this.clearCachedFilterAndClose(column);
                document.getElementById('close-filter-btn').onclick = () => this.uiService.clearFilterPopup();
            } else {
                this.uiService.showError('フィルタ候補の取得に失敗しました');
            }
        } catch (error) {
            console.error('キャッシュフィルタポップアップエラー:', error);
            this.uiService.showError('フィルタ候補の取得に失敗しました');
        }
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
        
        // 結果を表示
        this.uiService.displayResults(processedData, results.columns);
    }

    /**
     * キャッシュデータ用のフィルタとソート機能
     */
    async applyCachedFiltersAndSort() {
        const sessionId = this.stateService.getCurrentSessionId();
        if (!sessionId) return;
        
        try {
            // フィルタとソート条件を取得
            const filters = this.stateService.getFilters();
            const sortState = this.stateService.getSortState();
            
            // APIを呼び出してフィルタ・ソート済みのデータを取得
            const result = await this.apiService.readCachedData(
                sessionId,
                1, // 1ページ目から再取得
                this.stateService.getPageSize(),
                filters,
                sortState
            );
            
            if (result.success) {
                // 状態をリセットして新しいデータを設定
                this.stateService.setCachedData(result.data);
                this.stateService.setCurrentPage(1);
                this.stateService.setTotalRecords(result.total_records);
                this.stateService.setHasMoreData(result.data.length < result.total_records);
                
                // テーブルを再構築
                this.uiService.buildDataTable(result.data, result.columns);
                
                // 表示件数を更新
                this.uiService.updateDisplayCount();
                
                // ソート情報を更新
                this.uiService.updateSortInfo(sortState.column, sortState.direction);
            } else {
                throw new Error(result.error_message || 'フィルタ・ソートの適用に失敗しました');
            }
        } catch (error) {
            console.error('キャッシュフィルタ・ソートエラー:', error);
            this.uiService.showError('フィルタ・ソートの適用に失敗しました');
        }
    }

    /**
     * キャッシュデータ用のソート処理
     */
    async handleCachedSort(column) {
        const sortState = this.stateService.getSortState();
        let direction = 'asc';

        if (sortState.column === column) {
            // 同じカラムをクリックしたら昇順・降順を切り替え
            direction = sortState.direction === 'asc' ? 'desc' : 'asc';
        }
        
        this.stateService.setSortState(column, direction);
        
        // キャッシュデータ用のフィルタ・ソートを適用
        await this.applyCachedFiltersAndSort();
        this.uiService.updateSortInfo(column, direction);
    }

    /**
     * キャッシュデータ用のフィルタ適用
     */
    async applyCachedFilter(column, selectedValues) {
        this.stateService.setFilter(column, selectedValues);
        await this.applyCachedFiltersAndSort();
        this.uiService.updateFilterIcons();
    }

    /**
     * キャッシュデータ用のフィルタクリア
     */
    async clearCachedFilter(column) {
        this.stateService.setFilter(column, []);
        await this.applyCachedFiltersAndSort();
        this.uiService.updateFilterIcons();
    }

    loadTemplateById(templateId) {
        const allTemplates = this.stateService.getAllTemplates();
        const template = allTemplates.find(t => t.id === templateId);
        if (template) {
            this.editorService.replaceContent(template.sql);
            document.getElementById('template-dropdown').style.display = 'none';
        } else {
            console.error(`Template with ID ${templateId} not found.`);
            this.uiService.showError('テンプレートの読み込みに失敗しました。');
        }
    }

    loadPartById(partId) {
        const allParts = this.stateService.getAllParts();
        const part = allParts.find(p => p.id === partId);
        if (part) {
            this.editorService.insertText(part.sql);
            document.getElementById('part-dropdown').style.display = 'none';
        } else {
            console.error(`Part with ID ${partId} not found.`);
            this.uiService.showError('パーツの読み込みに失敗しました。');
        }
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

/**
 * ドロップダウンの表示・非表示を切り替える共通関数
 * @param {string} dropdownId - ドロップダウンのID
 * @param {string} containerClass - コンテナのクラス名
 * @param {Function} hideFunction - クリック外での非表示処理関数
 */
function toggleDropdown(dropdownId, containerClass, hideFunction) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        
        // ドロップダウンが表示された場合、クリック外での非表示を設定
        if (!isVisible) {
            setTimeout(() => {
                document.addEventListener('click', hideFunction);
            }, 0);
        } else {
            document.removeEventListener('click', hideFunction);
        }
    }
}

function toggleTemplates() {
    toggleDropdown('template-dropdown', '.sql-templates', hideTemplatesOnClickOutside);
}

function toggleParts() {
    toggleDropdown('part-dropdown', '.sql-parts', hidePartsOnClickOutside);
}

/**
 * クリック外でのドロップダウン非表示処理の共通関数
 * @param {Event} event - クリックイベント
 * @param {string} dropdownId - ドロップダウンのID
 * @param {string} containerClass - コンテナのクラス名
 * @param {Function} hideFunction - 非表示処理関数
 */
function hideDropdownOnClickOutside(event, dropdownId, containerClass, hideFunction) {
    const dropdown = document.getElementById(dropdownId);
    const container = event.target.closest(containerClass);
    
    if (dropdown && !container) {
        dropdown.style.display = 'none';
        document.removeEventListener('click', hideFunction);
    }
}

function hideTemplatesOnClickOutside(event) {
    hideDropdownOnClickOutside(event, 'template-dropdown', '.sql-templates', hideTemplatesOnClickOutside);
}

function hidePartsOnClickOutside(event) {
    hideDropdownOnClickOutside(event, 'part-dropdown', '.sql-parts', hidePartsOnClickOutside);
}

/**
 * エディタにコンテンツを挿入する共通関数
 * @param {string} dropdownId - ドロップダウンのID
 * @param {Function} insertFunction - 挿入処理関数
 * @param {string} content - 挿入するコンテンツ
 */
function loadContentToEditor(dropdownId, insertFunction, content) {
    if (appController && appController.getEditorService()) {
        insertFunction.call(appController.getEditorService(), content);
    }
    // ドロップダウンを閉じる
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

function loadTemplate(type, sql) {
    loadContentToEditor('template-dropdown', appController.getEditorService().replaceContent, sql);
}

function loadPart(type, sql) {
    loadContentToEditor('part-dropdown', appController.getEditorService().insertText, sql);
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

// グローバルスコープから AppController の logout を呼び出せるようにする
async function logout() {
    console.log('グローバルlogout関数が呼び出されました');
    
    // ローカルキャッシュをクリア
    console.log('ローカルキャッシュをクリアします');
    sessionStorage.clear();
    localStorage.removeItem('sqlHistoryCache');
    localStorage.removeItem('userPreferences');
    
    if (window.appController) {
        console.log('AppControllerを使用してログアウトします');
        await window.appController.logout();
    } else {
        // appControllerが初期化されていない場合のフォールバック
        console.error('AppController is not initialized.');
        console.log('直接APIを呼び出してログアウトします');
        
        try {
            // サーバーサイドのキャッシュをクリア
            console.log('サーバーサイドのキャッシュをクリアします...');
            const cleanupResponse = await fetch('/api/v1/sql/cache/current-user', { method: 'DELETE' });
            console.log('サーバーサイドのキャッシュクリア結果:', cleanupResponse.status);
            
            // セッションをクリア
            const response = await fetch('/api/v1/logout', { method: 'POST' });
            console.log('直接API呼び出し結果:', response.status);
        } catch (error) {
            console.error('直接API呼び出しエラー:', error);
        } finally {
            console.log('ログインページに遷移します');
            // ★ 変更点
            window.location.replace('/login');
        }
    }
}