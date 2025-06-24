// Snowsight風SQL Webアプリ JavaScript

class SQLWebApp {
    constructor() {
        this.apiBase = '/api/v1';
        this.currentResults = null;
        this.currentSortColumn = null;
        this.currentSortDirection = 'asc';
        this.filterValue = '';
        this.allMetadata = null; // 全メタデータをここに保持
        this.init();
    }

    init() {
        this.bindEvents();
        this.initResizer(); 
        this.initHorizontalResizer();
        this.loadConnectionStatus();
        this.loadMetadataTree(); // 初回ロード (キャッシュ利用)
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
                // 強制リフレッシュAPIを呼び出す
                this.loadMetadataTree(); 
            });
        }

        // キーボードショートカット
        const sqlEditorElement = document.getElementById('sql-editor');
        if (sqlEditorElement) {
            sqlEditorElement.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    this.executeSQL();
                }
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

        // 【変更】APIエンドポイントを新しいものに
        const endpoint = `${this.apiBase}/metadata/initial`;
        
        metadataTree.innerHTML = `<div class="loading">読み込み中...</div>`;

        try {
            const response = await fetch(endpoint, { method: 'GET' }); // GETリクエストに変更

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // スキーマとテーブル情報のみを受け取る
            const initialMetadata = await response.json();
            this.allMetadata = initialMetadata; // プロパティに保存
            this.buildMetadataTree(this.allMetadata);
            this.updateConnectionStatus(true);

        } catch (error) {
            console.error('メタデータの読み込みに失敗:', error);
            metadataTree.innerHTML = `<div class="error">メタデータの読み込みに失敗しました: ${error.message}</div>`;
            this.updateConnectionStatus(false);
        }
    }

    buildMetadataTree(allMetadata) {
        const metadataTree = document.getElementById('metadata-tree');
        if (!metadataTree) return;
        metadataTree.innerHTML = '';

        if (Array.isArray(allMetadata) && allMetadata.length > 0) {
            const schemaList = document.createElement('ul');
            schemaList.className = 'schema-list';
            allMetadata.forEach(schema => {
                const li = document.createElement('li');
                const schemaLink = document.createElement('div');
                schemaLink.className = 'schema-link collapsed';
                schemaLink.innerHTML = `<span class="toggle-icon">▶</span><span>${schema.name}</span>`;
                schemaLink.onclick = () => this.toggleSchema(schema.name, li);
                li.appendChild(schemaLink);
                schemaList.appendChild(li);
            });
            metadataTree.appendChild(schemaList);
        } else {
            metadataTree.innerHTML = '<p class="text-muted">スキーマ情報がありません。</p>';
        }
    }

    toggleSchema(schemaName, schemaItem) {
        const schemaLink = schemaItem.querySelector('.schema-link');
        const icon = schemaItem.querySelector('.toggle-icon');
        const isCollapsed = schemaLink.classList.contains('collapsed');
        let tableList = schemaItem.querySelector('.table-list');
        
        if (isCollapsed) {
            schemaLink.classList.remove('collapsed');
            icon.textContent = '▼';
            if (!tableList) {
                const schemaData = this.allMetadata.find(s => s.name === schemaName);
                if (schemaData && schemaData.tables) {
                    this.buildTableList(schemaData.tables, schemaItem);
                }
            } else {
                tableList.style.display = 'block';
            }
        } else {
            schemaLink.classList.add('collapsed');
            icon.textContent = '▶';
            if (tableList) tableList.style.display = 'none';
        }
    }

    buildTableList(tables, schemaItem) {
        const tableList = document.createElement('ul');
        tableList.className = 'table-list';
        tables.forEach(table => {
            const li = document.createElement('li');
            const tableLink = document.createElement('div');
            tableLink.className = 'table-link collapsed';
            tableLink.innerHTML = `<span class="toggle-icon">▶</span><span>${table.name}</span>`;
            tableLink.onclick = () => this.toggleTable(table.schema_name, table.name, li);
            li.appendChild(tableLink);
            tableList.appendChild(li);
        });
        schemaItem.appendChild(tableList);
    }

    async toggleTable(schemaName, tableName, tableItem) { // 【変更】async関数に
        const tableLink = tableItem.querySelector('.table-link');
        const icon = tableItem.querySelector('.toggle-icon');
        const isCollapsed = tableLink.classList.contains('collapsed');
        let columnList = tableItem.querySelector('.column-list');

        if (isCollapsed) {
            tableLink.classList.remove('collapsed');
            icon.textContent = '▼';
            if (!columnList) {
                // 【ここから変更】
                // ローディング表示を追加すると親切
                const loadingColumns = document.createElement('ul');
                loadingColumns.className = 'column-list';
                loadingColumns.innerHTML = '<li><div class="column-item"><em>読み込み中...</em></div></li>';
                tableItem.appendChild(loadingColumns);

                try {
                    // カラム情報をAPIで非同期に取得
                    const response = await fetch(`${this.apiBase}/metadata/schemas/${schemaName}/tables/${tableName}/columns`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const columns = await response.json();

                    // 既存のローディング表示を削除
                    tableItem.removeChild(loadingColumns);

                    // 取得したカラム情報でリストを構築
                    this.buildColumnList(columns, tableItem);

                } catch (error) {
                    console.error('カラムの取得に失敗:', error);
                    loadingColumns.innerHTML = '<li><div class="column-item text-danger">取得失敗</div></li>';
                }
                // 【ここまで変更】
            } else {
                columnList.style.display = 'block';
            }
        } else {
            tableLink.classList.add('collapsed');
            icon.textContent = '▶';
            if (columnList) columnList.style.display = 'none';
        }
    }

    buildColumnList(columns, tableItem) {
        const columnList = document.createElement('ul');
        columnList.className = 'column-list';
        columns.forEach(column => {
            const li = document.createElement('li');
            const columnItem = document.createElement('div');
            columnItem.className = 'column-item';
            columnItem.innerHTML = `
                <span class="column-name">${column.name}</span>
                <span class="column-type">${column.data_type}</span>
            `;
            li.appendChild(columnItem);
            columnList.appendChild(li);
        });
        tableItem.appendChild(columnList);
    }

    setupDataTable() {
        // データテーブルの初期化
        const resultsContainer = document.getElementById('resultsContainer');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="data-controls">
                    <div class="filter-section">
                        <input type="text" id="filterInput" placeholder="フィルター..." class="filter-input">
                    </div>
                    <div class="sort-info">
                        <span id="sortInfo">並び替えなし</span>
                    </div>
                </div>
                <div id="dataTable"></div>
            `;
        }
    }

    setupSorting() {
        const headers = document.querySelectorAll('.sortable-header');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                this.sortData(column);
            });
        });
    }

    async executeSQL() {
        const sql = sqlEditor ? sqlEditor.getValue().trim() : document.getElementById('sql-editor').value.trim();

        if (!sql) {
            this.showError('SQLクエリを入力してください');
            return;
        }

        this.showLoading(true);
        this.clearMessages();

        try {
            // 結果制限のチェックボックスの状態を取得
            const limitCheck = document.getElementById('limit-check');
            const limit = limitCheck && limitCheck.checked ? 5000 : 1000;

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

            const result = await response.json();
            console.log('SQL execution result:', result); // デバッグ用

            if (result.success) {
                this.displayResults(result);
                this.showSuccess(`クエリが正常に実行されました (${result.row_count}行)`);
                this.updateConnectionStatus(true); // 成功時に接続状態を更新
            } else {
                const errorMessage = result.error_message || '不明なエラーが発生しました';
                console.error('SQL execution error:', errorMessage);
                this.showError(`SQL実行エラー: ${errorMessage}`);
                this.updateConnectionStatus(false); // エラー時に接続状態を更新
            }
        } catch (error) {
            console.error('SQL execution request error:', error);
            this.showError(`リクエストエラー: ${error.message}`);
            this.updateConnectionStatus(false); // エラー時に接続状態を更新
        } finally {
            this.showLoading(false);
        }
    }

    async validateSQL() {
        const sql = sqlEditor ? sqlEditor.getValue().trim() : document.getElementById('sql-editor').value.trim();

        if (!sql) {
            this.showError('SQLクエリを入力してください');
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

            const result = await response.json();

            if (result.is_valid) {
                this.showSuccess('SQLクエリは有効です');
            } else {
                this.showError(`SQLバリデーションエラー: ${result.errors.join(', ')}`);
            }
        } catch (error) {
            this.showError(`バリデーションエラー: ${error.message}`);
        }
    }

    async formatSQL() {
        const sql = sqlEditor ? sqlEditor.getValue().trim() : document.getElementById('sql-editor').value.trim();

        if (!sql) {
            this.showError('SQLクエリを入力してください');
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

            const result = await response.json();

            if (result.formatted_sql) {
                if (sqlEditor) {
                    sqlEditor.setValue(result.formatted_sql);
                } else {
                    document.getElementById('sql-editor').value = result.formatted_sql;
                }
                this.showSuccess('SQLクエリを整形しました');
            } else {
                this.showError('SQLクエリの整形に失敗しました');
            }
        } catch (error) {
            this.showError(`整形エラー: ${error.message}`);
        }
    }

    clearSQL() {
        if (sqlEditor) {
            sqlEditor.setValue('');
        } else {
            document.getElementById('sql-editor').value = '';
        }
        this.clearResults();
        this.clearMessages();
    }

    displayResults(result) {
        this.currentResults = result;

        // 結果コンテナを表示状態にする
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
        }

        // 実行結果の統計情報を更新
        document.getElementById('result-info').textContent = `${result.row_count}件`;
        document.getElementById('execution-time').textContent = `${result.execution_time.toFixed(3)}秒`;

        this.setupDataTable();
        
        const dataTable = document.getElementById('dataTable');
        if (!dataTable || !result.data || result.data.length === 0) {
            dataTable.innerHTML = '<p class="text-muted">結果がありません</p>';
            return;
        }

        // テーブルヘッダーを作成
        const table = document.createElement('table');
        table.className = 'table table-striped table-hover';
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        result.columns.forEach(column => {
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

        // テーブルボディを作成
        const tbody = document.createElement('tbody');
        result.data.forEach(row => {
            const tr = document.createElement('tr');
            result.columns.forEach(column => {
                const td = document.createElement('td');
                td.textContent = row[column] !== null ? String(row[column]) : '';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        dataTable.appendChild(table);
        
        // 並び替え機能を設定
        this.setupSorting();
    }

    clearResults() {
        this.currentResults = null;
        this.currentSortColumn = null;
        this.currentSortDirection = 'asc';
        const resultsContainer = document.getElementById('resultsContainer');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
    }

    async exportData(format = null) {
        // データではなく、実行されたSQLクエリの存在をチェック
        if (!this.currentResults || !this.currentResults.sql) {
            this.showError('エクスポート対象のクエリがありません。まずクエリを実行してください。');
            return;
        }

        const exportCsvBtn = document.getElementById('exportCsvBtn');
        if (exportCsvBtn) exportCsvBtn.disabled = true;

        this.showSuccess('エクスポート処理を開始しました。データ量に応じて数分かかる場合があります...');

        try {
            // ファイル名を生成
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `export_${timestamp}.${format === 'excel' ? 'xlsx' : format}`;

            // ストリーミングレスポンスを直接ダウンロード
            const response = await fetch(`${this.apiBase}/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sql: this.currentResults.sql, // 実行したSQLを渡す
                    format: format,
                    filename: filename
                })
            });

            if (!response.ok) {
                // エラーレスポンスの場合
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            // ストリーミングレスポンスからBlobを作成
            const blob = await response.blob();
            
            // ファイル名を取得（Content-Dispositionヘッダーから）
            const contentDisposition = response.headers.get('Content-Disposition');
            let finalFilename = filename;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
                if (filenameMatch) {
                    finalFilename = filenameMatch[1];
                }
            }

            // ダウンロードを実行
            this.downloadBlob(blob, finalFilename);
            this.showSuccess(`ダウンロードを開始します: ${finalFilename}`);

        } catch (error) {
            console.error('Export error:', error);
            this.showError(`エクスポートエラー: ${error.message}`);
        } finally {
            // エクスポートボタンを再有効化
            if (exportCsvBtn) exportCsvBtn.disabled = false;
        }
    }

    downloadBlob(blob, filename) {
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadLink.href);
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
    // SQLエディタの初期化
    const sqlEditorElement = document.getElementById('sql-editor');
    if (sqlEditorElement) {
        sqlEditor = CodeMirror.fromTextArea(sqlEditorElement, {
            mode: 'text/x-sql',
            theme: 'monokai',
            lineNumbers: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            styleActiveLine: true,
            indentUnit: 4,
            tabSize: 4,
            lineWrapping: true,
            extraKeys: {
                'Ctrl-Enter': function() { window.sqlWebApp.executeSQL(); },
                'Ctrl-Space': 'autocomplete',
                'Ctrl-Shift-F': function() { window.sqlWebApp.formatSQL(); },
                'Ctrl-L': function() { window.sqlWebApp.clearSQL(); },
                'Ctrl-Shift-V': function() { window.sqlWebApp.validateSQL(); },
                'F11': toggleFullscreen,
                'F1': showKeyboardShortcuts
            }
        });
        
        // エディタのサイズを調整
        sqlEditor.setSize('100%', '100%');
    }
    
    // SQLWebAppインスタンスを作成
    window.sqlWebApp = new SQLWebApp();
});
 
 