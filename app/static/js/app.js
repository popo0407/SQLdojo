// Snowsight風SQL Webアプリ JavaScript

class SQLWebApp {
    constructor() {
        this.apiBase = '/api/v1';
        this.currentResults = null;
        this.currentSortColumn = null;
        this.currentSortDirection = 'asc';
        this.filterValue = '';
        this.allMetadata = null; // 全メタデータをここに保持
        this.sqlEditor = null; // Monaco Editorインスタンス
        this.isEditorMaximized = false; // エディタの最大化状態
        this.init();
    }

    init() {
        this.initMonacoEditor();
        this.bindEvents();
        this.initResizer(); 
        this.initHorizontalResizer();
        this.loadConnectionStatus();
        this.loadMetadataTree(); // 初回ロード (キャッシュ利用)
        this.initializeLayout(); // 初期レイアウト設定
    }

    // 初期レイアウト設定
    initializeLayout() {
        // 初期表示時はエディタを最大化し、結果表示エリアを非表示
        this.maximizeEditor();
        this.hideResults();
    }

    // エディタを最大化
    maximizeEditor() {
        const editorContainer = document.getElementById('sql-editor-container');
        const resultsContainer = document.getElementById('results-container');
        
        if (editorContainer) {
            editorContainer.classList.remove('editor-minimized');
            editorContainer.classList.add('editor-maximized');
        }
        
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
        
        this.isEditorMaximized = true;
        this.updateToggleButton();
        
        // Monaco Editorのサイズを更新
        if (this.sqlEditor) {
            setTimeout(() => {
                this.sqlEditor.layout();
            }, 100);
        }
    }

    // エディタを最小化（3行程度の高さ）
    minimizeEditor() {
        const editorContainer = document.getElementById('sql-editor-container');
        const resultsContainer = document.getElementById('results-container');
        
        if (editorContainer) {
            editorContainer.classList.remove('editor-maximized');
            editorContainer.classList.add('editor-minimized');
        }
        
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
        }
        
        this.isEditorMaximized = false;
        this.updateToggleButton();
        
        // Monaco Editorのサイズを更新
        if (this.sqlEditor) {
            setTimeout(() => {
                this.sqlEditor.layout();
            }, 100);
        }
    }

    // エディタの最大化・最小化をトグル
    toggleEditorSize() {
        if (this.isEditorMaximized) {
            this.minimizeEditor();
        } else {
            this.maximizeEditor();
        }
    }

    // トグルボタンの表示を更新
    updateToggleButton() {
        const toggleBtn = document.getElementById('toggleEditorBtn');
        if (toggleBtn) {
            if (this.isEditorMaximized) {
                toggleBtn.innerHTML = '<i class="fas fa-compress me-1"></i>最小化';
                toggleBtn.title = 'エディタを最小化';
            } else {
                toggleBtn.innerHTML = '<i class="fas fa-expand me-1"></i>最大化';
                toggleBtn.title = 'エディタを最大化';
            }
        }
    }

    // 結果表示エリアを非表示
    hideResults() {
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    }

    async initMonacoEditor() {
        // Monaco Editorの初期化
        require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
        
        require(['vs/editor/editor.main'], () => {
            this.sqlEditor = monaco.editor.create(document.getElementById('monaco-editor-container'), {
                value: 'SELECT * FROM ;',
                language: 'sql',
                theme: 'vs-dark',
                fontSize: 14,
                fontFamily: 'Courier New, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                readOnly: false,
                cursorStyle: 'line',
                automaticLayout: true,
                extraEditorClassName: 'monaco-editor'
            });

            // SQL補完プロバイダーを登録
            this.registerSQLCompletionProvider();

            // キーボードショートカットを設定
            this.setupEditorShortcuts();

            // エディタのサイズを調整
            this.sqlEditor.layout();
        });
    }

    registerSQLCompletionProvider() {
        // Monaco Editorの補完プロバイダーを登録
        monaco.languages.registerCompletionItemProvider('sql', {
            provideCompletionItems: async (model, position) => {
                // 変更点：カーソルまでのテキストではなく、エディタの全文を取得
                const fullSql = model.getValue();
                // カーソル位置をオフセット（文字列の先頭からの文字数）に変換
                const offset = model.getOffsetAt(position);

                try {
                    const response = await fetch(`${this.apiBase}/sql/suggest`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            sql: fullSql,       // エディタの全文を送信
                            position: offset,   // カーソル位置のオフセットを送信
                            context: null
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const result = await response.json();
                    
                    const suggestions = result.suggestions.map(item => ({
                        label: item.label,
                        kind: this.getMonacoCompletionItemKind(item.kind),
                        detail: item.detail,
                        documentation: item.documentation,
                        insertText: item.insert_text || item.label,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        sortText: item.sort_text || item.label
                    }));

                    return { suggestions };
                } catch (error) {
                    console.error('SQL補完エラー:', error);
                    return { suggestions: [] };
                }
            }
        });
    }

    getMonacoCompletionItemKind(kind) {
        // 補完アイテムの種類をMonaco Editor形式に変換
        const kindMap = {
            'keyword': monaco.languages.CompletionItemKind.Keyword,
            'function': monaco.languages.CompletionItemKind.Function,
            'table': monaco.languages.CompletionItemKind.Class,
            'view': monaco.languages.CompletionItemKind.Class,
            'column': monaco.languages.CompletionItemKind.Field,
            'schema': monaco.languages.CompletionItemKind.Module
        };
        return kindMap[kind] || monaco.languages.CompletionItemKind.Text;
    }

    setupEditorShortcuts() {
        // エディタ内のキーボードショートカットを設定
        this.sqlEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            this.executeSQL();
        });

        this.sqlEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
            this.formatSQL();
        });

        this.sqlEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, () => {
            this.clearSQL();
        });
    }

    bindEvents() {
        // イベントリスナーの重複登録を防ぐため、ボタンを再生成してからリスナーを登録
        const replaceBtn = (id, newAction) => {
            const oldBtn = document.getElementById(id);
            if (oldBtn) {
                const newBtn = oldBtn.cloneNode(true);
                oldBtn.parentNode.replaceChild(newBtn, oldBtn);
                newBtn.addEventListener('click', newAction);
            }
        };

        replaceBtn('executeBtn', () => this.executeSQL());
        replaceBtn('clearBtn', () => this.clearSQL());
        replaceBtn('clearResultsBtn', () => this.clearResults());
        replaceBtn('formatBtn', () => this.formatSQL());
        replaceBtn('exportCsvBtn', () => this.exportData('csv'));
        replaceBtn('toggleEditorBtn', () => this.toggleEditorSize());
        replaceBtn('testErrorBtn', () => {
            console.log('Test error button clicked'); // デバッグログ
            const testMessage = 'テストエラーメッセージです。これはSQLエディタ上にオーバーレイ表示されます。';
            console.log('Showing test error:', testMessage); // デバッグログ
            
            // 複数のエラー表示方法をテスト
            this.showError(testMessage);
            
            // 追加のデバッグ情報
            setTimeout(() => {
                const overlay = document.getElementById('error-overlay');
                console.log('Error overlay after 1 second:', overlay); // デバッグログ
                if (overlay) {
                    console.log('Overlay styles:', overlay.style.cssText); // デバッグログ
                    console.log('Overlay computed styles:', getComputedStyle(overlay)); // デバッグログ
                    console.log('Overlay parent:', overlay.parentNode); // デバッグログ
                    console.log('Overlay visibility:', overlay.offsetWidth, overlay.offsetHeight); // デバッグログ
                } else {
                    console.log('No error overlay found - checking alternatives'); // デバッグログ
                    const popup = document.querySelector('.popup-notification.popup-error');
                    console.log('Error popup found:', popup); // デバッグログ
                    const legacyError = document.querySelector('.error-message');
                    console.log('Legacy error found:', legacyError); // デバッグログ
                }
            }, 1000);
        });

        // メタデータ更新ボタン
        const refreshBtn = document.getElementById('refresh-metadata-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                // メタデータ強制更新APIを呼び出す
                this.refreshMetadata();
            });
        }

        // フィルター入力イベント
        const filterInput = document.getElementById('filterInput');
        if (filterInput) {
            filterInput.addEventListener('input', (e) => {
                this.filterValue = e.target.value.toLowerCase();
                this.applyFilter();
            });
        }

        // 並び替えイベント（動的に追加）
        this.setupSorting();
    }

    // リサイザー機能を追加
    initResizer() {
        const resizer = document.getElementById('resizer');
        const sidebar = document.getElementById('sidebar');
        if (!resizer || !sidebar) return;

        let isResizing = false;

        const handleMouseMove = (e) => {
            if (!isResizing) return;
            const newWidth = e.clientX;
            const minWidth = parseInt(getComputedStyle(sidebar).minWidth, 10);
            const maxWidth = parseInt(getComputedStyle(sidebar).maxWidth, 10);
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                sidebar.style.flexBasis = newWidth + 'px';
            }
        };

        const stopResize = () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopResize);
        };

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', stopResize);
        });
    }

    // 水平リサイザー機能
    initHorizontalResizer() {
        const resizer = document.getElementById('horizontal-resizer');
        const editorContainer = document.getElementById('sql-editor-container');
        const resultsContainer = document.getElementById('results-container');
        
        if (!resizer || !editorContainer || !resultsContainer) {
            console.error('Horizontal resizer elements not found:', {
                resizer: !!resizer,
                editorContainer: !!editorContainer,
                resultsContainer: !!resultsContainer
            });
            return;
        }

        let isResizing = false;
        let startY = 0;
        let startEditorHeight = 0;

        const handleMouseMove = (e) => {
            if (!isResizing) return;
            
            const deltaY = e.clientY - startY;
            const newEditorHeight = startEditorHeight + deltaY;
            const minHeight = 120; // 最小高さ（3行程度）
            const maxHeight = window.innerHeight - 200; // 最大高さ
            
            if (newEditorHeight >= minHeight && newEditorHeight <= maxHeight) {
                // CSSクラスを削除して手動サイズに切り替え
                editorContainer.classList.remove('editor-maximized', 'editor-minimized');
                editorContainer.style.height = newEditorHeight + 'px';
                
                // Monaco Editorのサイズを更新
                if (this.sqlEditor) {
                    this.sqlEditor.layout();
                }
            }
        };

        const stopResize = () => {
            isResizing = false;
            resizer.classList.remove('resizing');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopResize);
            document.body.style.cursor = '';
        };

        resizer.addEventListener('mousedown', (e) => {
            console.log('Resizer mousedown event triggered'); // デバッグログ
            isResizing = true;
            startY = e.clientY;
            startEditorHeight = editorContainer.offsetHeight;
            resizer.classList.add('resizing');
            document.body.style.cursor = 'row-resize';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', stopResize);
            e.preventDefault(); // テキスト選択を防ぐ
        });
    }

    updateConnectionStatus(isConnected) {
        const statusIndicator = document.getElementById('connection-status');
        if (statusIndicator) {
            statusIndicator.className = isConnected ? 'status-indicator' : 'status-indicator error';
            statusIndicator.title = isConnected ? '接続中' : '接続エラー';
        }
    }

    async loadConnectionStatus() {
        try {
            const response = await fetch(`${this.apiBase}/connection/status`);
            if (response.ok) {
                const data = await response.json();
                this.updateConnectionStatus(data.is_connected);
            }
        } catch (error) {
            console.error('接続状態取得エラー:', error);
            this.updateConnectionStatus(false);
        }
    }

    async loadMetadataTree() {
        try {
            const response = await fetch(`${this.apiBase}/metadata/all`);
            if (response.ok) {
                const data = await response.json();
                this.allMetadata = data;
                this.buildMetadataTree(data);
            }
        } catch (error) {
            console.error('メタデータ取得エラー:', error);
            this.showError('メタデータの取得に失敗しました。');
        }
    }

    async refreshMetadata() {
        try {
            this.showSuccess('メタデータを更新中...');
            const response = await fetch(`${this.apiBase}/metadata/refresh`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.allMetadata = data;
                this.buildMetadataTree(data);
                this.showSuccess('メタデータの更新が完了しました。');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('メタデータ更新エラー:', error);
            this.showError('メタデータの更新に失敗しました。');
        }
    }

    buildMetadataTree(allMetadata) {
        const metadataTree = document.getElementById('metadata-tree');
        if (!metadataTree) return;

        metadataTree.innerHTML = '';

        if (!allMetadata || !Array.isArray(allMetadata) || allMetadata.length === 0) {
            metadataTree.innerHTML = '<p class="text-muted p-2">メタデータが見つかりません。<br>右上の更新ボタンを押してください。</p>';
            return;
        }

        // 修正点: allMetadata.schemas ではなく、allMetadata を直接ループする
        allMetadata.forEach(schema => {
            const schemaItem = document.createElement('div');
            schemaItem.className = 'schema-item mb-1';
            
            const schemaHeader = document.createElement('div');
            schemaHeader.className = 'schema-header d-flex align-items-center p-2 rounded-1 collapsed';
            schemaHeader.style.cursor = 'pointer';
            schemaHeader.innerHTML = `
                <i class="fas fa-chevron-right fa-fw me-2 toggle-icon"></i>
                <i class="fas fa-database fa-fw me-1 text-secondary"></i>
                <span class="fw-bold">${schema.name}</span>
            `;
            
            const schemaContent = document.createElement('div');
            schemaContent.className = 'schema-content collapsed';
            
            const tableList = document.createElement('ul');
            tableList.className = 'list-unstyled ps-3';
            
            if (schema.tables && Array.isArray(schema.tables)) {
                schema.tables.forEach(table => {
                    const tableItem = document.createElement('li');
                    
                    const tableHeader = document.createElement('div');
                    tableHeader.className = 'table-link d-flex align-items-center p-1 rounded-1 collapsed';
                    tableHeader.style.cursor = 'pointer';
                    tableHeader.innerHTML = `
                        <i class="fas fa-chevron-right fa-fw me-2 toggle-icon"></i>
                        <i class="fas ${table.table_type === 'VIEW' ? 'fa-eye' : 'fa-table'} fa-fw me-1 text-secondary"></i>
                        <span>${table.name}</span>
                    `;

                    const columnList = document.createElement('ul');
                    columnList.className = 'column-list list-unstyled ps-4 mt-1 collapsed';

                    if (table.columns && Array.isArray(table.columns)) {
                        table.columns.forEach(column => {
                            const columnItem = document.createElement('li');
                            columnItem.className = 'column-item d-flex justify-content-between align-items-center p-1';
                            columnItem.innerHTML = `
                                <span class="column-name text-body-secondary">${column.name}</span>
                                <span class="column-type text-muted small">${column.data_type}</span>
                            `;
                            columnList.appendChild(columnItem);
                        });
                    }

                    tableHeader.addEventListener('click', (e) => {
                        e.stopPropagation();
                        tableHeader.classList.toggle('collapsed');
                        columnList.classList.toggle('collapsed');
                        const icon = tableHeader.querySelector('.toggle-icon');
                        icon.classList.toggle('fa-chevron-right');
                        icon.classList.toggle('fa-chevron-down');
                    });

                    tableItem.appendChild(tableHeader);
                    tableItem.appendChild(columnList);
                    tableList.appendChild(tableItem);
                });
            }
            
            schemaContent.appendChild(tableList);
            schemaItem.appendChild(schemaHeader);
            schemaItem.appendChild(schemaContent);
            metadataTree.appendChild(schemaItem);
            
            // スキーマの展開・折りたたみ
            schemaHeader.addEventListener('click', () => {
                schemaHeader.classList.toggle('collapsed');
                schemaContent.classList.toggle('collapsed');
                const icon = schemaHeader.querySelector('.toggle-icon');
                icon.classList.toggle('fa-chevron-right');
                icon.classList.toggle('fa-chevron-down');
            });
        });
    }

    toggleSchema(schemaName, schemaItem) {
        const schemaContent = schemaItem.nextElementSibling;
        schemaContent.classList.toggle('collapsed');
        schemaItem.classList.toggle('collapsed');
    }

    buildTableList(tables, schemaItem) {
        const tableList = document.createElement('ul');
        tableList.className = 'table-list';
        
        tables.forEach(table => {
            const tableItem = document.createElement('li');
            tableItem.innerHTML = `
                <a href="#" class="table-link" onclick="app.toggleTable('${table.schema}', '${table.name}', this)">
                    <i class="fas fa-table me-1"></i>${table.name}
                </a>
            `;
            tableList.appendChild(tableItem);
        });
        
        return tableList;
    }

    async toggleTable(schemaName, tableName, tableItem) {
        const existingColumns = tableItem.nextElementSibling;
        
        if (existingColumns && existingColumns.classList.contains('column-list')) {
            existingColumns.remove();
            return;
        }
        
        const columns = this.getColumnsFromMetadata(schemaName, tableName);
        if (columns && columns.length > 0) {
            const columnList = this.buildColumnList(columns, tableItem);
            tableItem.parentNode.insertBefore(columnList, tableItem.nextSibling);
        }
    }

    getColumnsFromMetadata(schemaName, tableName) {
        if (!this.allMetadata || !this.allMetadata.schemas) return [];
        
        const schema = this.allMetadata.schemas.find(s => s.name === schemaName);
        if (!schema) return [];
        
        const table = schema.tables.find(t => t.name === tableName);
        return table ? table.columns : [];
    }

    buildColumnList(columns, tableItem) {
        const columnList = document.createElement('ul');
        columnList.className = 'column-list';
        
        columns.forEach(column => {
            const columnItem = document.createElement('li');
            columnItem.innerHTML = `
                <div class="column-item">
                    <span class="column-name">${column.name}</span>
                    <span class="column-type">${column.type}</span>
                </div>
            `;
            columnList.appendChild(columnItem);
        });
        
        return columnList;
    }

    setupDataTable() {
        // データテーブルの初期設定
    }

    setupSorting() {
        // 並び替え機能の初期設定
    }

    async executeSQL() {
        if (!this.sqlEditor) {
            this.showError('エディタが初期化されていません。');
            return;
        }

        const sql = this.sqlEditor.getValue().trim();
        if (!sql) {
            this.showError('SQLを入力してください。');
            return;
        }

        this.showLoading(true);

        try {
            const limitCheck = document.getElementById('limit-check');
            const limit = limitCheck && limitCheck.checked ? 5000 : null;

            const response = await fetch(`${this.apiBase}/sql/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sql: sql,
                    limit: limit
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                // response内のmessageを優先的に表示
                const errorMessage = errorData.message || errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            const result = await response.json();
            this.displayResults(result);
            this.showSuccess('SQLを実行しました。');

        } catch (error) {
            console.error('SQL実行エラー:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async formatSQL() {
        if (!this.sqlEditor) {
            this.showError('エディタが初期化されていません。');
            return;
        }

        const sql = this.sqlEditor.getValue().trim();
        if (!sql) {
            this.showError('SQLを入力してください。');
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/sql/format`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sql: sql
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                // response内のmessageを優先的に表示
                const errorMessage = errorData.message || errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            const result = await response.json();
            this.sqlEditor.setValue(result.formatted_sql);
            this.showSuccess('SQLを整形しました。');
            this.sqlEditor.focus();
        } catch (error) {
            console.error('SQL整形エラー:', error);
            this.showError(`SQL整形エラー: ${error.message}`);
        }
    }

    clearSQL() {
        if (this.sqlEditor) {
            this.sqlEditor.setValue('');
            this.sqlEditor.focus();
        }
    }

    displayResults(result) {
        this.currentResults = result;
        
        const resultsContainer = document.getElementById('results-container');
        const resultInfo = document.getElementById('result-info');
        const executionTime = document.getElementById('execution-time');
        
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
        }
        
        if (resultInfo) {
            resultInfo.textContent = `${result.row_count}件`;
        }
        
        if (executionTime) {
            executionTime.textContent = `${result.execution_time.toFixed(3)}秒`;
        }

        // 結果表示時にエディタを最小化
        this.minimizeEditor();

        this.redrawTable();
    }

    clearResults() {
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
        this.currentResults = null;
        
        // 結果クリア時にエディタを最大化
        this.maximizeEditor();
        
        this.showSuccess('結果をクリアしました。');
    }

    async exportData(format = null) {
        if (!this.currentResults || !this.currentResults.data) {
            this.showError('エクスポートするデータがありません。');
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: this.currentResults.data,
                    columns: this.currentResults.columns,
                    filename: 'export',
                    format: format || 'csv'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const filename = `export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
            this.downloadBlob(blob, filename);
            
            this.showSuccess('CSVファイルのエクスポートが完了しました。');

        } catch (error) {
            console.error('エクスポートエラー:', error);
            this.showError(`エクスポートエラー: ${error.message}`);
        }
    }

    downloadBlob(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    showLoading(show) {
        const loading = document.getElementById('sql-loading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }

    // ポップアップ通知を表示
    showPopupNotification(message, type = 'info', duration = 3000) {
        // 既存のポップアップを削除
        const existingPopup = document.querySelector('.popup-notification');
        if (existingPopup) {
            existingPopup.remove();
        }

        // 新しいポップアップを作成
        const popup = document.createElement('div');
        popup.className = `popup-notification popup-${type}`;
        popup.textContent = message;

        // bodyに追加
        document.body.appendChild(popup);

        // 指定時間後にフェードアウトして削除
        setTimeout(() => {
            popup.classList.add('fade-out');
            setTimeout(() => {
                if (popup.parentNode) {
                    popup.parentNode.removeChild(popup);
                }
            }, 300);
        }, duration);
    }

    // SQLエディタ上にエラーオーバーレイを表示
    showErrorOverlay(message, duration = 5000) {
        console.log('showErrorOverlay called with message:', message); // デバッグログ
        
        // 既存のエラーオーバーレイを削除
        this.clearErrorOverlay();

        // Monaco Editorのコンテナを取得
        const editorContainer = document.getElementById('monaco-editor-container');
        if (!editorContainer) {
            console.error('monaco-editor-container not found'); // デバッグログ
            // 代替手段: ポップアップ通知で表示
            this.showPopupNotification(message, 'error', duration);
            return;
        }

        console.log('Editor container found:', editorContainer); // デバッグログ

        // エラーオーバーレイを作成
        const overlay = document.createElement('div');
        overlay.className = 'error-overlay';
        overlay.id = 'error-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(239, 68, 68, 0.1);
            border: 2px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(2px);
        `;

        const overlayContent = document.createElement('div');
        overlayContent.className = 'error-overlay-content';
        overlayContent.style.cssText = `
            background: rgba(239, 68, 68, 0.95);
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 90%;
            text-align: center;
            font-weight: 500;
            font-size: 14px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            position: relative;
        `;
        overlayContent.innerHTML = `
            <button type="button" class="error-close-btn" style="
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: background-color 0.2s;
            " onmouseover="this.style.backgroundColor='rgba(255,255,255,0.2)'" onmouseout="this.style.backgroundColor='transparent'">
                ×
            </button>
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${this.escapeHtml(message)}
        `;

        // ×ボタンのクリックイベントを追加
        const closeBtn = overlayContent.querySelector('.error-close-btn');
        closeBtn.addEventListener('click', () => {
            this.clearErrorOverlay();
        });

        overlay.appendChild(overlayContent);
        editorContainer.appendChild(overlay);
        
        console.log('Error overlay added to DOM, overlay element:', overlay); // デバッグログ
        console.log('Editor container children after adding overlay:', editorContainer.children.length); // デバッグログ

        // 指定時間後に自動で削除
        setTimeout(() => {
            this.clearErrorOverlay();
        }, duration);
    }

    // エラーオーバーレイをクリア
    clearErrorOverlay() {
        const overlay = document.getElementById('error-overlay');
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
            console.log('Error overlay removed'); // デバッグログ
        } else {
            console.log('No error overlay found to remove'); // デバッグログ
        }
    }

    showError(message) {
        console.log('showError called with message:', message); // デバッグログ
        
        // 1. まずポップアップ通知で表示（確実に表示される）
        this.showPopupNotification(message, 'error', 3000);
        
        // 2. コンソールにも出力
        console.error('Error message:', message);
        
        // 3. SQLエディタ上にエラーオーバーレイを表示
        this.showErrorOverlay(message, 3000);
    }

    showSuccess(message) {
        // ポップアップ通知を使用
        this.showPopupNotification(message, 'success', 3000);
    }

    showWarning(message) {
        this.showPopupNotification(message, 'warning', 4000);
    }

    showInfo(message) {
        this.showPopupNotification(message, 'info', 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    sortData(column) {
        if (!this.currentResults || !this.currentResults.data) return;

        const data = [...this.currentResults.data];
        
        // ソート方向を決定
        if (this.currentSortColumn === column) {
            this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSortColumn = column;
            this.currentSortDirection = 'asc';
        }

        // データをソート
        data.sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];
            
            if (aVal === null && bVal === null) return 0;
            if (aVal === null) return 1;
            if (bVal === null) return -1;
            
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return this.currentSortDirection === 'desc' ? -comparison : comparison;
        });

        // 結果を更新して再表示
        this.currentResults.data = data;
        this.redrawTable();
        this.updateSortIcons();
    }

    updateSortIcons() {
        const headers = document.querySelectorAll('.sortable-header');
        headers.forEach(header => {
            const icon = header.querySelector('.sort-icon');
            const column = header.dataset.column;
            
            if (column === this.currentSortColumn) {
                icon.textContent = this.currentSortDirection === 'asc' ? '↑' : '↓';
            } else {
                icon.textContent = '↕';
            }
        });
    }

    applyFilter() {
        if (!this.currentResults || !this.currentResults.data) return;

        const dataTable = document.getElementById('dataTable');
        if (!dataTable) return;

        const rows = dataTable.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const rowText = Array.from(cells).map(cell => cell.textContent.toLowerCase()).join(' ');
            const isVisible = rowText.includes(this.filterValue);
            row.style.display = isVisible ? '' : 'none';
        });
    }

    redrawTable() {
        const dataTable = document.getElementById('dataTable');
        if (!dataTable) return;

        dataTable.innerHTML = '';
        
        if (!this.currentResults || !this.currentResults.data || this.currentResults.data.length === 0) {
            dataTable.innerHTML = '<p class="text-muted">結果がありません</p>';
            return;
        }

        // テーブルを再作成
        const table = document.createElement('table');
        table.className = 'table table-striped table-hover';
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // ヘッダー行を作成
        this.currentResults.columns.forEach(column => {
            const th = document.createElement('th');
            th.className = 'sortable-header';
            th.dataset.column = column;
            th.innerHTML = `
                ${column}
                <span class="sort-icon">↕</span>
            `;
            th.addEventListener('click', () => this.sortData(column));
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // データ行を作成
        const tbody = document.createElement('tbody');
        this.currentResults.data.forEach(row => {
            const tr = document.createElement('tr');
            this.currentResults.columns.forEach(column => {
                const td = document.createElement('td');
                td.textContent = row[column] !== null ? row[column] : '';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        dataTable.appendChild(table);
        
        // ソートアイコンを更新
        this.updateSortIcons();
    }
}

// グローバルインスタンスを作成
let app;

// DOM読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', () => {
    app = new SQLWebApp();
});

// グローバル関数（後方互換性のため）
function toggleSchema(schemaId) {
    if (app) {
        app.toggleSchema(schemaId);
    }
}
 
 