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
        this.init();
    }

    init() {
        this.initMonacoEditor();
        this.bindEvents();
        this.initResizer(); 
        this.initHorizontalResizer();
        this.loadConnectionStatus();
        this.loadMetadataTree(); // 初回ロード (キャッシュ利用)
    }

    async initMonacoEditor() {
        // Monaco Editorの初期化
        require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
        
        require(['vs/editor/editor.main'], () => {
            this.sqlEditor = monaco.editor.create(document.getElementById('monaco-editor-container'), {
                value: 'SELECT * FROM table_name LIMIT 100;',
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
                const textUntilPosition = model.getValueInRange({
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column
                });

                try {
                    const response = await fetch(`${this.apiBase}/sql/suggest`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            sql: textUntilPosition,
                            position: textUntilPosition.length,
                            context: null
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const result = await response.json();
                    
                    // Monaco Editorの補完アイテム形式に変換
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

        this.sqlEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyV, () => {
            this.validateSQL();
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
        replaceBtn('formatBtn', () => this.formatSQL());
        replaceBtn('validateBtn', () => this.validateSQL());
        replaceBtn('exportCsvBtn', () => this.exportData('csv'));

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
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', stopResize);
        });
    }

    // 水平リサイザー機能（エディタと結果表示エリアの高さ調整）
    initHorizontalResizer() {
        const horizontalResizer = document.getElementById('horizontal-resizer');
        const sqlEditorContainer = document.getElementById('sql-editor-container');
        const resultsContainer = document.getElementById('results-container');
        
        if (!horizontalResizer || !sqlEditorContainer || !resultsContainer) return;

        let isResizing = false;

        const handleMouseMove = (e) => {
            if (!isResizing) return;
            const containerHeight = sqlEditorContainer.parentElement.offsetHeight;
            const newHeight = e.clientY - sqlEditorContainer.offsetTop;
            const minHeight = 100;
            const maxHeight = containerHeight - 100;
            
            if (newHeight >= minHeight && newHeight <= maxHeight) {
                sqlEditorContainer.style.height = newHeight + 'px';
                // Monaco Editorのレイアウトを更新
                if (this.sqlEditor) {
                    this.sqlEditor.layout();
                }
            }
        };

        const stopResize = () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopResize);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };

        horizontalResizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isResizing = true;
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', stopResize);
        });
    }

    // 接続状態を動的に更新
    updateConnectionStatus(isConnected) {
        const statusIndicator = document.getElementById('connection-status');
        const statusText = document.getElementById('connection-text');
        
        if (statusIndicator && statusText) {
            if (isConnected) {
                statusIndicator.className = 'status-indicator status-connected';
                statusText.textContent = '接続済み';
            } else {
                statusIndicator.className = 'status-indicator status-disconnected';
                statusText.textContent = '未接続';
            }
        }
    }

    async loadConnectionStatus() {
        try {
            const response = await fetch(`${this.apiBase}/connection/status`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const status = await response.json();
            
            // connectedフラグを確認（APIから返される）
            const isConnected = status.connected === true;
            this.updateConnectionStatus(isConnected);
            
        } catch (error) {
            console.error('接続状態の取得に失敗:', error);
            this.updateConnectionStatus(false);
        }
    }

    async loadMetadataTree() {
        const metadataTree = document.getElementById('metadata-tree');
        if (!metadataTree) return;

        // 全メタデータ（スキーマ、テーブル、カラム含む）を取得
        const endpoint = `${this.apiBase}/metadata/initial`;
        
        metadataTree.innerHTML = `<div class="loading">読み込み中...</div>`;

        try {
            const response = await fetch(endpoint, { method: 'GET' });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 全メタデータ（スキーマ、テーブル、カラム含む）を受け取る
            const allMetadata = await response.json();
            this.allMetadata = allMetadata; // プロパティに保存

            // メタデータツリーを構築
            this.buildMetadataTree(allMetadata);
            
        } catch (error) {
            console.error('メタデータ読み込みエラー:', error);
            metadataTree.innerHTML = `<div class="error-message">メタデータの読み込みに失敗しました: ${error.message}</div>`;
        }
    }

    async refreshMetadata() {
        const metadataTree = document.getElementById('metadata-tree');
        if (!metadataTree) return;

        metadataTree.innerHTML = `<div class="loading">更新中...</div>`;

        try {
            const response = await fetch(`${this.apiBase}/metadata/refresh`, { 
                method: 'POST' 
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const allMetadata = await response.json();
            this.allMetadata = allMetadata; // プロパティに保存

            // メタデータツリーを再構築
            this.buildMetadataTree(allMetadata);
            
        } catch (error) {
            console.error('メタデータ更新エラー:', error);
            metadataTree.innerHTML = `<div class="error-message">メタデータの更新に失敗しました: ${error.message}</div>`;
        }
    }

    buildMetadataTree(allMetadata) {
        const metadataTree = document.getElementById('metadata-tree');
        if (!metadataTree) return;

        let html = '';
        
        for (const schemaData of allMetadata) {
            const schemaName = schemaData.name;
            const tables = schemaData.tables || [];
            
            html += `
                <div class="schema-item">
                    <a href="#" class="schema-link" onclick="window.sqlWebApp.toggleSchema('${schemaName}', this)">
                        <i class="fas fa-folder toggle-icon"></i>
                        <i class="fas fa-database me-2"></i>
                        ${schemaName}
                        <span class="badge bg-secondary ms-2">${tables.length}</span>
                    </a>
                    <ul class="table-list" id="tables-${schemaName}" style="display: none;">
            `;
            
            for (const tableData of tables) {
                const tableName = tableData.name;
                const tableType = tableData.table_type;
                const iconClass = tableType === 'VIEW' ? 'fas fa-eye' : 'fas fa-table';
                
                html += `
                    <li>
                        <a href="#" class="table-link" onclick="window.sqlWebApp.toggleTable('${schemaName}', '${tableName}', this)">
                            <i class="fas fa-chevron-right toggle-icon"></i>
                            <i class="${iconClass} me-2"></i>
                            ${tableName}
                            <span class="badge bg-info ms-2">${tableType}</span>
                        </a>
                        <ul class="column-list" id="columns-${schemaName}-${tableName}" style="display: none;"></ul>
                    </li>
                `;
            }
            
            html += `
                    </ul>
                </div>
            `;
        }
        
        metadataTree.innerHTML = html;
    }

    toggleSchema(schemaName, schemaItem) {
        const tableList = document.getElementById(`tables-${schemaName}`);
        if (!tableList) return;

        const isCollapsed = tableList.style.display === 'none';
        tableList.style.display = isCollapsed ? 'block' : 'none';
        schemaItem.classList.toggle('collapsed', !isCollapsed);
    }

    buildTableList(tables, schemaItem) {
        let html = '';
        for (const table of tables) {
            const iconClass = table.table_type === 'VIEW' ? 'fas fa-eye' : 'fas fa-table';
            html += `
                <li>
                    <a href="#" class="table-link" onclick="window.sqlWebApp.toggleTable('${table.schema_name}', '${table.name}', this)">
                        <i class="fas fa-chevron-right toggle-icon"></i>
                        <i class="${iconClass} me-2"></i>
                        ${table.name}
                        <span class="badge bg-info ms-2">${table.table_type}</span>
                    </a>
                    <ul class="column-list" id="columns-${table.schema_name}-${table.name}" style="display: none;"></ul>
                </li>
            `;
        }
        return html;
    }

    async toggleTable(schemaName, tableName, tableItem) {
        const columnList = document.getElementById(`columns-${schemaName}-${tableName}`);
        if (!columnList) return;

        const isCollapsed = columnList.style.display === 'none';
        
        if (isCollapsed && columnList.children.length === 0) {
            // カラム情報を取得
            const columns = this.getColumnsFromMetadata(schemaName, tableName);
            if (columns.length > 0) {
                this.buildColumnList(columns, columnList);
            } else {
                // メタデータにカラム情報がない場合はAPIから取得
                try {
                    const response = await fetch(`${this.apiBase}/metadata/schemas/${schemaName}/tables/${tableName}/columns`);
                    if (response.ok) {
                        const columns = await response.json();
                        this.buildColumnList(columns, columnList);
                    }
                } catch (error) {
                    console.error('カラム情報取得エラー:', error);
                }
            }
        }

        columnList.style.display = isCollapsed ? 'block' : 'none';
        tableItem.classList.toggle('collapsed', !isCollapsed);
    }

    getColumnsFromMetadata(schemaName, tableName) {
        if (!this.allMetadata) return [];
        
        for (const schemaData of this.allMetadata) {
            if (schemaData.name === schemaName) {
                for (const tableData of schemaData.tables || []) {
                    if (tableData.name === tableName) {
                        return tableData.columns || [];
                    }
                }
            }
        }
        return [];
    }

    buildColumnList(columns, tableItem) {
        let html = '';
        for (const column of columns) {
            html += `
                <li class="column-item">
                    <span class="column-name">${column.name}</span>
                    <span class="column-type">${column.data_type}</span>
                </li>
            `;
        }
        tableItem.innerHTML = html;
    }

    setupDataTable() {
        // データテーブルの設定
        const dataTable = document.getElementById('dataTable');
        if (dataTable) {
            dataTable.innerHTML = '<p class="text-muted">結果がありません</p>';
        }
    }

    setupSorting() {
        // 動的に追加されたテーブルヘッダーにソート機能を追加
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sortable-header')) {
                const header = e.target.closest('.sortable-header');
                const column = header.dataset.column;
                if (column) {
                    this.sortData(column);
                }
            }
        });
    }

    async executeSQL() {
        if (!this.sqlEditor) return;

        const sql = this.sqlEditor.getValue();
        if (!sql.trim()) {
            this.showError('SQLクエリを入力してください。');
            return;
        }

        this.showLoading(true);
        this.clearMessages();

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
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.displayResults(result);
                this.showSuccess(`SQL実行成功: ${result.row_count}件のデータを取得しました。`);
            } else {
                this.showError(`SQL実行エラー: ${result.error_message}`);
            }

        } catch (error) {
            console.error('SQL実行エラー:', error);
            this.showError(`SQL実行エラー: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async validateSQL() {
        if (!this.sqlEditor) return;

        const sql = this.sqlEditor.getValue();
        if (!sql.trim()) {
            this.showError('SQLクエリを入力してください。');
            return;
        }

        this.clearMessages();

        try {
            const response = await fetch(`${this.apiBase}/sql/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sql: sql })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            const validationResult = document.getElementById('validation-result');
            if (validationResult) {
                if (result.is_valid) {
                    validationResult.innerHTML = `
                        <div class="alert alert-success">
                            <i class="fas fa-check-circle me-2"></i>
                            SQLバリデーション成功
                            ${result.suggestions.length > 0 ? `<br><small>提案: ${result.suggestions.join(', ')}</small>` : ''}
                        </div>
                    `;
                } else {
                    validationResult.innerHTML = `
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            SQLバリデーションエラー
                            <ul class="mb-0 mt-2">
                                ${result.errors.map(error => `<li>${error}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }
                validationResult.style.display = 'block';
            }

        } catch (error) {
            console.error('SQLバリデーションエラー:', error);
            this.showError(`SQLバリデーションエラー: ${error.message}`);
        }
    }

    async formatSQL() {
        if (!this.sqlEditor) return;

        const sql = this.sqlEditor.getValue();
        if (!sql.trim()) {
            this.showError('SQLクエリを入力してください。');
            return;
        }

        this.clearMessages();

        try {
            const response = await fetch(`${this.apiBase}/sql/format`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sql: sql })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.sqlEditor.setValue(result.formatted_sql);
                this.showSuccess('SQL整形が完了しました。');
            } else {
                this.showError(`SQL整形エラー: ${result.error_message}`);
            }

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

        this.redrawTable();
    }

    clearResults() {
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
        this.currentResults = null;
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

    showError(message) {
        const messageContainer = document.getElementById('message-container');
        if (messageContainer) {
            messageContainer.innerHTML = `<div class="error-message">${this.escapeHtml(message)}</div>`;
            // 3秒後にメッセージを自動で消す
            setTimeout(() => {
                this.clearMessages();
            }, 3000);
        }
    }

    showSuccess(message) {
        const messageContainer = document.getElementById('message-container');
        if (messageContainer) {
            messageContainer.innerHTML = `<div class="success-message">${this.escapeHtml(message)}</div>`;
            // 3秒後にメッセージを自動で消す
            setTimeout(() => {
                this.clearMessages();
            }, 3000);
        }
    }

    clearMessages() {
        const messageContainer = document.getElementById('message-container');
        if (messageContainer) {
            messageContainer.innerHTML = '';
        }
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
        
        this.currentResults.columns.forEach(column => {
            const th = document.createElement('th');
            th.className = 'sortable-header';
            th.dataset.column = column;
            th.innerHTML = `
                ${column}
                <span class="sort-icon">↕</span>
            `;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        this.currentResults.data.forEach(row => {
            const tr = document.createElement('tr');
            this.currentResults.columns.forEach(column => {
                const td = document.createElement('td');
                td.textContent = row[column] !== null ? String(row[column]) : '';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        dataTable.appendChild(table);
        
        // 並び替え機能を再設定
        this.setupSorting();
        this.updateSortIcons();
    }
}

// グローバル関数
function toggleSchema(schemaId) {
    const schemaElement = document.getElementById(schemaId);
    if (schemaElement) {
        schemaElement.classList.toggle('collapsed');
    }
}

// DOMContentLoadedイベント
document.addEventListener('DOMContentLoaded', function() {
    // SQLWebAppインスタンスを作成
    window.sqlWebApp = new SQLWebApp();
});
 
 