/**
 * UIの更新やユーザーへの通知を担当するサービスクラス
 * DOM操作や画面表示に関するロジックを分離
 */
class UiService {
    constructor() {
        // DOM要素への参照をキャッシュ（初期化時はnull）
        this.loadingIndicator = null;
        this.resultsContainer = null;
        this.resultInfo = null;
        this.executionTime = null;
        this.dataTableContainer = null;
        this.metadataTree = null;
        this.editorContainer = null;
        this.toggleEditorBtn = null;
        this.sortInfo = null;
        
        // 通知用のオーバーレイ要素
        this.notificationOverlay = null;
        this.errorOverlay = null;
    }

    /**
     * DOM要素の参照を初期化
     */
    init() {
        this.loadingIndicator = document.getElementById('sql-loading');
        this.resultsContainer = document.getElementById('results-container');
        this.resultInfo = document.getElementById('result-info');
        this.executionTime = document.getElementById('execution-time');
        this.dataTableContainer = document.getElementById('dataTable');
        this.metadataTree = document.getElementById('metadata-tree');
        this.editorContainer = document.getElementById('sql-editor-container');
        this.toggleEditorBtn = document.getElementById('toggleEditorBtn');
        this.sortInfo = document.getElementById('sortInfo');
    }

    /**
     * ローディング表示の制御
     * @param {boolean} show - 表示するかどうか
     */
    showLoading(show) {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * ポップアップ通知を表示
     * @param {string} message - 表示するメッセージ
     * @param {string} type - 通知タイプ（info, success, warning, error）
     * @param {number} duration - 表示時間（ミリ秒）
     */
    showPopupNotification(message, type = 'info', duration = 3000) {
        // 既存の通知を削除
        this.clearNotificationOverlay();
        
        // 新しい通知オーバーレイを作成
        this.notificationOverlay = document.createElement('div');
        this.notificationOverlay.className = 'notification-overlay';
        this.notificationOverlay.innerHTML = `
            <div class="notification-popup notification-${type}">
                <div class="notification-content">
                    <i class="fas fa-${this.getNotificationIcon(type)} me-2"></i>
                    <span>${this.escapeHtml(message)}</span>
                </div>
                <button type="button" class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(this.notificationOverlay);
        
        // 自動で削除
        setTimeout(() => {
            this.clearNotificationOverlay();
        }, duration);
    }

    /**
     * エラーオーバーレイを表示
     * @param {string} message - エラーメッセージ
     * @param {number} duration - 表示時間（ミリ秒）
     */
    showErrorOverlay(message, duration = 5000) {
        this.clearErrorOverlay();
        
        this.errorOverlay = document.createElement('div');
        this.errorOverlay.className = 'error-overlay';
        this.errorOverlay.innerHTML = `
            <div class="error-popup">
                <div class="error-header">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <span>エラー</span>
                </div>
                <div class="error-content">
                    ${this.escapeHtml(message)}
                </div>
                <div class="error-footer">
                    <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.parentElement.remove()">
                        閉じる
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.errorOverlay);
        
        setTimeout(() => {
            this.clearErrorOverlay();
        }, duration);
    }

    /**
     * エラーオーバーレイをクリア
     */
    clearErrorOverlay() {
        if (this.errorOverlay && this.errorOverlay.parentNode) {
            this.errorOverlay.parentNode.removeChild(this.errorOverlay);
            this.errorOverlay = null;
        }
    }

    /**
     * 通知オーバーレイをクリア
     */
    clearNotificationOverlay() {
        if (this.notificationOverlay && this.notificationOverlay.parentNode) {
            this.notificationOverlay.parentNode.removeChild(this.notificationOverlay);
            this.notificationOverlay = null;
        }
    }

    /**
     * 結果を表示
     * @param {Array} resultData - 結果データ
     * @param {Array} columns - カラム情報
     */
    displayResults(resultData, columns) {
        if (this.resultsContainer) {
            this.resultsContainer.style.display = 'block';
        }
        
        if (this.resultInfo) {
            this.resultInfo.textContent = `${resultData.length}件`;
        }
        
        if (this.dataTableContainer) {
            this.buildDataTable(resultData, columns);
        }
    }

    /**
     * データテーブルを構築
     * @param {Array} data - データ配列
     * @param {Array} columns - カラム配列
     */
    buildDataTable(data, columns) {
        if (!this.dataTableContainer) return;
        
        if (data.length === 0) {
            this.dataTableContainer.innerHTML = '<div class="text-center text-muted p-4">データがありません</div>';
            return;
        }

        let tableHTML = '<table class="table table-striped table-hover">';
        
        // ヘッダー行
        tableHTML += '<thead><tr>';
        columns.forEach(column => {
            tableHTML += `<th class="sortable" data-column="${column}">${this.escapeHtml(column)}</th>`;
        });
        tableHTML += '</tr></thead>';
        
        // データ行
        tableHTML += '<tbody>';
        data.forEach(row => {
            tableHTML += '<tr>';
            columns.forEach(column => {
                const value = row[column];
                tableHTML += `<td>${this.escapeHtml(value !== null && value !== undefined ? String(value) : '')}</td>`;
            });
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody>';
        
        tableHTML += '</table>';
        this.dataTableContainer.innerHTML = tableHTML;
    }

    /**
     * 結果表示エリアをクリア
     */
    clearResults() {
        if (this.resultsContainer) {
            this.resultsContainer.style.display = 'none';
        }
        if (this.dataTableContainer) {
            this.dataTableContainer.innerHTML = '';
        }
        if (this.resultInfo) {
            this.resultInfo.textContent = '0件';
        }
        if (this.executionTime) {
            this.executionTime.textContent = '0.000秒';
        }
    }

    /**
     * メタデータツリーを構築
     * @param {Array} allMetadata - 全メタデータ
     */
    buildMetadataTree(allMetadata) {
        if (!this.metadataTree) return;

        this.metadataTree.innerHTML = '';

        if (!allMetadata || !Array.isArray(allMetadata) || allMetadata.length === 0) {
            this.metadataTree.innerHTML = '<p class="text-muted p-2">メタデータが見つかりません。<br>右上の更新ボタンを押してください。</p>';
            return;
        }

        // allMetadata を直接ループする
        allMetadata.forEach(schema => {
            const schemaItem = document.createElement('div');
            schemaItem.className = 'schema-item mb-1';
            
            const schemaHeader = document.createElement('div');
            schemaHeader.className = 'schema-header d-flex align-items-center p-2 rounded-1';
            schemaHeader.style.cursor = 'pointer';
            
            // スキーマのコメント情報を取得
            const schemaComment = schema.comment || '';
            const schemaTitle = schemaComment ? `${schema.name} - ${schemaComment}` : schema.name;
            
            schemaHeader.innerHTML = `
                <i class="fas fa-chevron-down fa-fw me-2 toggle-icon"></i>
                <i class="fas fa-database fa-fw me-1 text-secondary"></i>
                <span class="fw-bold" title="${schemaComment}">${schema.name}</span>
                ${schemaComment ? `<small class="text-muted ms-2">${schemaComment}</small>` : ''}
            `;
            
            const schemaContent = document.createElement('div');
            schemaContent.className = 'schema-content';
            
            const tableList = document.createElement('ul');
            tableList.className = 'list-unstyled ps-3';
            
            if (schema.tables && Array.isArray(schema.tables)) {
                schema.tables.forEach(table => {
                    const tableItem = document.createElement('li');
                    
                    const tableHeader = document.createElement('div');
                    tableHeader.className = 'table-link d-flex align-items-center p-1 rounded-1';
                    tableHeader.style.cursor = 'pointer';
                    
                    // テーブルのコメント情報を取得
                    const tableComment = table.comment || '';
                    const tableTitle = tableComment ? `${table.name} - ${tableComment}` : table.name;
                    
                    tableHeader.innerHTML = `
                        <i class="fas fa-chevron-down fa-fw me-2 toggle-icon"></i>
                        <i class="fas ${table.table_type === 'VIEW' ? 'fa-eye' : 'fa-table'} fa-fw me-1 text-secondary"></i>
                        <span title="${tableComment}">${table.name}</span>
                        ${tableComment ? `<small class="text-muted ms-2">${tableComment}</small>` : ''}
                    `;

                    const columnList = document.createElement('ul');
                    columnList.className = 'column-list list-unstyled ps-4 mt-1';

                    if (table.columns && Array.isArray(table.columns)) {
                        table.columns.forEach(column => {
                            const columnItem = document.createElement('li');
                            columnItem.className = 'column-item d-flex justify-content-between align-items-center p-1';
                            
                            // カラムのコメント情報を取得
                            const columnComment = column.comment || '';
                            const columnTitle = columnComment ? `${column.name} - ${columnComment}` : column.name;
                            
                            columnItem.innerHTML = `
                                <span class="column-name text-body-secondary" title="${columnComment}">${column.name}</span>
                                <div class="d-flex align-items-center">
                                    <span class="column-type text-muted small me-2">${column.data_type}</span>
                                    ${columnComment ? `<small class="text-muted">${columnComment}</small>` : ''}
                                </div>
                            `;
                            columnList.appendChild(columnItem);
                        });
                    }

                    tableHeader.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const isCollapsed = tableHeader.classList.contains('collapsed');
                        
                        if (isCollapsed) {
                            tableHeader.classList.remove('collapsed');
                            columnList.classList.remove('collapsed');
                            const icon = tableHeader.querySelector('.toggle-icon');
                            icon.classList.remove('fa-chevron-right');
                            icon.classList.add('fa-chevron-down');
                        } else {
                            tableHeader.classList.add('collapsed');
                            columnList.classList.add('collapsed');
                            const icon = tableHeader.querySelector('.toggle-icon');
                            icon.classList.remove('fa-chevron-down');
                            icon.classList.add('fa-chevron-right');
                        }
                    });

                    tableItem.appendChild(tableHeader);
                    tableItem.appendChild(columnList);
                    tableList.appendChild(tableItem);
                });
            }
            
            schemaContent.appendChild(tableList);
            schemaItem.appendChild(schemaHeader);
            schemaItem.appendChild(schemaContent);
            this.metadataTree.appendChild(schemaItem);
            
            // スキーマの展開・折りたたみ
            schemaHeader.addEventListener('click', () => {
                const isCollapsed = schemaHeader.classList.contains('collapsed');
                
                if (isCollapsed) {
                    schemaHeader.classList.remove('collapsed');
                    schemaContent.classList.remove('collapsed');
                    const icon = schemaHeader.querySelector('.toggle-icon');
                    icon.classList.remove('fa-chevron-right');
                    icon.classList.add('fa-chevron-down');
                } else {
                    schemaHeader.classList.add('collapsed');
                    schemaContent.classList.add('collapsed');
                    const icon = schemaHeader.querySelector('.toggle-icon');
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-right');
                }
            });
        });
    }

    /**
     * エディタの最大化・最小化を制御
     * @param {boolean} maximized - 最大化するかどうか
     */
    setEditorMaximized(maximized) {
        if (!this.editorContainer) return;
        
        if (maximized) {
            this.editorContainer.classList.remove('editor-minimized');
            this.editorContainer.classList.add('editor-maximized');
            if (this.resultsContainer) {
                this.resultsContainer.style.display = 'none';
            }
        } else {
            this.editorContainer.classList.remove('editor-maximized');
            this.editorContainer.classList.add('editor-minimized');
            if (this.resultsContainer) {
                this.resultsContainer.style.display = 'block';
            }
        }
        
        this.updateToggleButton(maximized);
    }

    /**
     * トグルボタンの表示を更新
     * @param {boolean} maximized - 現在の最大化状態
     */
    updateToggleButton(maximized) {
        if (!this.toggleEditorBtn) return;
        
        if (maximized) {
            this.toggleEditorBtn.innerHTML = '<i class="fas fa-compress me-1"></i>最小化';
            this.toggleEditorBtn.title = 'エディタを最小化';
        } else {
            this.toggleEditorBtn.innerHTML = '<i class="fas fa-expand me-1"></i>最大化';
            this.toggleEditorBtn.title = 'エディタを最大化';
        }
    }

    /**
     * ソート情報を更新
     * @param {string} column - ソート対象カラム
     * @param {string} direction - ソート方向
     */
    updateSortInfo(column, direction) {
        if (!this.sortInfo) return;
        
        if (column) {
            this.sortInfo.textContent = `${column} (${direction === 'asc' ? '昇順' : '降順'})`;
        } else {
            this.sortInfo.textContent = '並び替えなし';
        }
    }

    /**
     * ソートアイコンを更新
     * @param {string} currentColumn - 現在のソートカラム
     * @param {string} currentDirection - 現在のソート方向
     */
    updateSortIcons(currentColumn, currentDirection) {
        const headers = document.querySelectorAll('.sortable');
        headers.forEach(header => {
            const column = header.dataset.column;
            const icon = header.querySelector('.sort-icon');
            
            if (icon) {
                if (column === currentColumn) {
                    icon.className = `sort-icon fas fa-sort-${currentDirection === 'asc' ? 'up' : 'down'}`;
                } else {
                    icon.className = 'sort-icon fas fa-sort';
                }
            }
        });
    }

    /**
     * Blobをダウンロード
     * @param {Blob} blob - ダウンロードするデータ
     * @param {string} filename - ファイル名
     */
    downloadBlob(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    /**
     * HTMLエスケープ
     * @param {string} text - エスケープするテキスト
     * @returns {string} エスケープされたテキスト
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 通知アイコンを取得
     * @param {string} type - 通知タイプ
     * @returns {string} アイコン名
     */
    getNotificationIcon(type) {
        const icons = {
            'info': 'info-circle',
            'success': 'check-circle',
            'warning': 'exclamation-triangle',
            'error': 'times-circle'
        };
        return icons[type] || 'info-circle';
    }

    // 便利メソッド
    showError(message) {
        this.showPopupNotification(message, 'error');
    }

    showSuccess(message) {
        this.showPopupNotification(message, 'success');
    }

    showWarning(message) {
        this.showPopupNotification(message, 'warning');
    }

    showInfo(message) {
        this.showPopupNotification(message, 'info');
    }
} 