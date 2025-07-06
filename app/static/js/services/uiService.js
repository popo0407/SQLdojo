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
        this.applyToEditorBtn = null;
        
        // 通知用のオーバーレイ要素
        this.notificationOverlay = null;
        this.errorOverlay = null;
        
            // メタデータ選択状態の管理
    this.selectedTable = null;
    this.selectedColumns = new Set();
    
    // プレースホルダー入力欄の管理
    this.placeholderContainer = null;
    this.placeholderInputs = new Map();
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
        this.applyToEditorBtn = document.getElementById('apply-to-editor-btn');
        
        // プレースホルダー入力欄のコンテナを初期化
        this.placeholderContainer = document.getElementById('placeholder-inputs');
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
     * ポップアップ通知を表示 - 改善版
     * @param {string} message - 表示するメッセージ
     * @param {string} type - 通知タイプ（info, success, warning, error）
     * @param {number} duration - 表示時間（ミリ秒）
     */
    showPopupNotification(message, type = 'info', duration = 4000) {
        // 既存の通知を削除
        this.clearNotificationOverlay();
        
        // メッセージがオブジェクトの場合は文字列に変換
        let displayMessage = message;
        if (typeof message === 'object' && message !== null) {
            if (message.message) {
                displayMessage = message.message;
            } else if (message.detail) {
                displayMessage = message.detail;
            } else {
                displayMessage = JSON.stringify(message);
            }
        } else if (typeof message !== 'string') {
            displayMessage = String(message);
        }
        
        // 通知タイプに応じたタイトルとアイコンを設定
        const notificationConfig = this.getNotificationConfig(type);
        
        // 新しい通知を作成
        const notification = document.createElement('div');
        notification.className = `popup-notification popup-${type}`;
        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-icon">
                    <i class="fas fa-${notificationConfig.icon}"></i>
                </div>
                <div class="notification-text">
                    <div class="notification-title">${notificationConfig.title}</div>
                    <div class="notification-message">${this.escapeHtml(displayMessage)}</div>
                </div>
                <button type="button" class="notification-close" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 即座に消去するためのイベントリスナーを追加
        const closeButton = notification.querySelector('.notification-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                notification.remove();
            });
        }

        // フェードアウトアニメーション
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 200);
        }, duration);
    }

    /**
     * 通知タイプに応じた設定を取得
     * @param {string} type - 通知タイプ
     * @returns {Object} 通知設定
     */
    getNotificationConfig(type) {
        const configs = {
            success: {
                title: '成功',
                icon: 'check-circle'
            },
            error: {
                title: 'エラー',
                icon: 'exclamation-triangle'
            },
            warning: {
                title: '警告',
                icon: 'exclamation-circle'
            },
            info: {
                title: '情報',
                icon: 'info-circle'
            }
        };
        
        return configs[type] || configs.info;
    }

    /**
     * エラーオーバーレイを表示 - 改善版
     * @param {string} message - エラーメッセージ
     * @param {number} duration - 表示時間（ミリ秒）
     */
    showErrorOverlay(message, duration = 6000) {
        this.clearErrorOverlay();
        
        this.errorOverlay = document.createElement('div');
        this.errorOverlay.className = 'error-overlay';
        this.errorOverlay.innerHTML = `
            <div class="error-popup">
                <div class="error-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>エラーが発生しました</span>
                </div>
                <div class="error-content">
                    ${this.escapeHtml(message)}
                </div>
                <div class="error-footer">
                    <button type="button" class="btn btn-danger" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-times me-2"></i>閉じる
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.errorOverlay);
        
        // 自動で閉じる
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
     * プレースホルダー入力欄を更新
     * @param {Array} placeholders - プレースホルダー情報の配列
     */
    updatePlaceholderInputs(placeholders) {
        if (!this.placeholderContainer) return;
        
        console.log('プレースホルダー入力欄更新:', placeholders);
        
        // 既存の入力欄をクリア
        this.placeholderContainer.innerHTML = '';
        this.placeholderInputs.clear();
        
        if (placeholders.length === 0) {
            this.placeholderContainer.style.display = 'none';
            return;
        }
        
        // プレースホルダー入力欄を表示
        this.placeholderContainer.style.display = 'block';
        
        // ヘッダーを追加
        const header = document.createElement('div');
        header.className = 'placeholder-header';
        header.innerHTML = '<h6 class="mb-2"><i class="fas fa-edit me-2"></i>パラメータ入力</h6>';
        this.placeholderContainer.appendChild(header);
        
        // 各プレースホルダーに対応する入力欄を作成
        placeholders.forEach((placeholder, index) => {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'placeholder-input-group mb-2';
            
            const label = document.createElement('label');
            label.className = 'form-label small mb-1';
            label.textContent = placeholder.displayName;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control form-control-sm';
            input.placeholder = `${placeholder.tableName}.${placeholder.columnName}`;
            input.dataset.tableName = placeholder.tableName;
            input.dataset.columnName = placeholder.columnName;
            input.dataset.displayName = placeholder.displayName;
            
            // 入力値の変更を監視
            input.addEventListener('input', (e) => {
                const key = `${placeholder.tableName}.${placeholder.columnName}`;
                this.placeholderInputs.set(key, e.target.value);
                console.log('プレースホルダー値更新:', key, e.target.value);
            });
            
            inputGroup.appendChild(label);
            inputGroup.appendChild(input);
            this.placeholderContainer.appendChild(inputGroup);
            
            // 入力欄をマップに保存
            const key = `${placeholder.tableName}.${placeholder.columnName}`;
            this.placeholderInputs.set(key, '');
        });
    }

    /**
     * プレースホルダー入力値を取得
     * @returns {Object} プレースホルダーと値のマッピング
     */
    getPlaceholderValues() {
        const values = {};
        this.placeholderInputs.forEach((value, key) => {
            values[key] = value;
        });
        return values;
    }

    /**
     * プレースホルダー入力欄をクリア
     */
    clearPlaceholderInputs() {
        if (this.placeholderContainer) {
            this.placeholderContainer.innerHTML = '';
            this.placeholderContainer.style.display = 'none';
        }
        this.placeholderInputs.clear();
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
        
        // テーブルの基本構造を常に描画
        let tableHTML = '<table class="table table-striped table-hover">';
        
        // ヘッダー行
        tableHTML += '<thead><tr>';
        columns.forEach(column => {
            // ソートアイコンの隣にフィルターアイコンを追加
            tableHTML += `
                <th class="sortable" data-column="${column}" style="cursor: pointer;">
                    ${this.escapeHtml(column)}
                    <i class="fas fa-sort sort-icon"></i>
                    <i class="fas fa-filter filter-icon" data-column="${column}" style="cursor: pointer; margin-left: 8px; color: #6c757d;"></i>
                </th>`;
        });
        tableHTML += '</tr></thead>';
        
        // データ行
        tableHTML += '<tbody>';
        if (data.length > 0) {
        data.forEach(row => {
            tableHTML += '<tr>';
            columns.forEach(column => {
                const value = row[column];
                tableHTML += `<td>${this.escapeHtml(value !== null && value !== undefined ? String(value) : '')}</td>`;
            });
            tableHTML += '</tr>';
        });
        } else {
            // データがない場合でもテーブル構造は残し、メッセージ行を追加
            tableHTML += `
                <tr>
                    <td colspan="${columns.length}" class="text-center text-muted p-4">
                        一致するデータが見つかりません。フィルター条件を見直してください。
                    </td>
                </tr>`;
        }
        tableHTML += '</tbody></table>';

        this.dataTableContainer.innerHTML = tableHTML;
        
        // フィルターアイコンの状態を更新
        this.updateFilterIcons();
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
    async buildMetadataTree(allMetadata) {
        if (!this.metadataTree) return;
        this.metadataTree.innerHTML = '';
        
        // メタデータが空の場合はエラーメッセージを表示
        if (!allMetadata || !Array.isArray(allMetadata) || allMetadata.length === 0) {
            this.metadataTree.innerHTML = '<p class="text-muted p-2">メタデータが見つかりません。<br>右上の更新ボタンを押してください。</p>';
            return;
        }

        try {
            // ユーザー情報と表示設定を取得
            const userInfo = await this.getUserInfo();
            const visibilitySettings = await this.getVisibilitySettings();
            
            // スキーマレベルを隠すべきかどうかを判定
            const shouldHideSchemaLevel = this.shouldHideSchemaLevel(userInfo.role, visibilitySettings);
            
            if (shouldHideSchemaLevel) {
                // スキーマレベルを隠した表示
                await this.buildMetadataTreeWithoutSchema(allMetadata);
            } else {
                // 通常の3階層表示
                this.buildMetadataTreeWithSchema(allMetadata);
            }
        } catch (error) {
            console.error('メタデータツリー構築エラー:', error);
            // エラーが発生した場合は通常の表示にフォールバック
            this.buildMetadataTreeWithSchema(allMetadata);
        }
    }

    /**
     * ユーザー情報を取得
     * @returns {Promise<Object>} ユーザー情報
     */
    async getUserInfo() {
        try {
            const response = await fetch('/api/v1/users/me');
            if (response.ok) {
                const user = await response.json();
                return { role: user.role || 'DEFAULT' };
            }
        } catch (error) {
            console.error('ユーザー情報取得エラー:', error);
        }
        return { role: 'DEFAULT' };
    }

    /**
     * 表示設定を取得
     * @returns {Promise<Object>} 表示設定
     */
    async getVisibilitySettings() {
        try {
            const response = await fetch('/api/v1/visibility-settings');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('表示設定取得エラー:', error);
        }
        return {};
    }

    /**
     * スキーマレベルを隠すべきかどうかを判定
     * @param {string} userRole - ユーザーのロール
     * @param {Object} settings - 表示設定
     * @returns {boolean} スキーマレベルを隠すべきかどうか
     */
    shouldHideSchemaLevel(userRole, settings) {
        // スキーマレベルの設定をチェック
        for (const [objectName, roleSettings] of Object.entries(settings)) {
            // スキーマ名のみのオブジェクト（テーブル名が含まれていない）をチェック
            if (!objectName.includes('.')) {
                const roleSetting = roleSettings[userRole] ?? roleSettings['DEFAULT'] ?? true;
                if (!roleSetting) {
                    return true; // スキーマが非表示の場合はスキーマレベルを隠す
                }
            }
        }
        return false;
    }

    /**
     * スキーマレベルを隠したメタデータツリーを構築
     * @param {Array} allMetadata - 全メタデータ
     */
    buildMetadataTreeWithoutSchema(allMetadata) {
        // 全テーブルを一つのリストにまとめる
        const allTables = [];
        allMetadata.forEach(schema => {
            if (schema.tables && Array.isArray(schema.tables)) {
                schema.tables.forEach(table => {
                    // スキーマ情報をテーブルに追加
                    const tableWithSchema = {
                        ...table,
                        schema_name: schema.name,
                        schema_comment: schema.comment
                    };
                    allTables.push(tableWithSchema);
                });
            }
        });

        // フィルタリングは一切行わず、全て表示
        if (allTables.length === 0) {
            this.metadataTree.innerHTML = '<p class="text-muted p-2">表示可能なテーブルが見つかりません。<br>管理者に表示設定を確認してください。</p>';
            return;
        }

        // テーブルリストのulを作成し、list-styleをnoneに
        const tableList = document.createElement('ul');
        tableList.className = 'table-list';
        tableList.style.listStyle = 'none';
        tableList.style.margin = '0';
        tableList.style.padding = '0';

        allTables.forEach(table => {
            const tableItem = document.createElement('li');
            tableItem.style.listStyle = 'none';
            const tableHeader = document.createElement('div');
            tableHeader.className = 'table-link d-flex align-items-center p-1 rounded-1';
            tableHeader.style.cursor = 'pointer';
            const tableComment = table.comment || '';
            // テーブル名のみ表示（クリック可能、チェックボックス付き）
            tableHeader.innerHTML = `
                <i class="fas fa-chevron-right fa-fw me-2 toggle-icon"></i>
                <i class="fas ${table.table_type === 'VIEW' ? 'fa-eye' : 'fa-table'} fa-fw me-1 text-secondary"></i>
                <span class="table-name-clickable" title="${tableComment}" data-table="${table.name}" data-schema="${table.schema_name}">${table.name}</span>
                ${tableComment ? `<small class="text-muted ms-2">${tableComment}</small>` : ''}
                <div class="ms-auto">
                    <input type="checkbox" class="table-checkbox" data-table="${table.name}" data-schema="${table.schema_name}">
                </div>
            `;
            tableHeader.classList.add('collapsed');

            const columnList = document.createElement('ul');
            columnList.className = 'column-list list-unstyled ps-4 mt-1 collapsed';
            columnList.style.listStyle = 'none';
            if (table.columns && Array.isArray(table.columns)) {
                table.columns.forEach(column => {
                    const columnItem = document.createElement('li');
                    columnItem.className = 'column-item d-flex justify-content-between align-items-center p-1';
                    columnItem.style.listStyle = 'none';
                    const columnComment = column.comment || '';
                    const columnContent = `
                        <span class="column-name-clickable text-body-secondary" title="${columnComment}" data-column="${column.name}" data-table="${table.name}" data-schema="${table.schema_name}">${column.name}</span>
                        ${columnComment ? `<small class="text-muted ms-2">${columnComment}</small>` : ''}
                        <span class="column-type text-muted small ms-auto me-2">${column.data_type}</span>
                        <input type="checkbox" class="column-checkbox" data-column="${column.name}" data-table="${table.name}" data-schema="${table.schema_name}">
                    `;
                    columnItem.innerHTML = columnContent;
                    columnList.appendChild(columnItem);
                });
            }

            tableHeader.addEventListener('click', (e) => {
                // チェックボックスがクリックされた場合はテーブル開閉処理をスキップ
                if (e.target.classList.contains('table-checkbox')) {
                    return;
                }
                
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
        // サイドバーに追加
        this.metadataTree.innerHTML = '';
        this.metadataTree.appendChild(tableList);
        
        // イベントハンドラーを設定（少し遅延させて確実に設定）
        setTimeout(() => {
            this.setupMetadataEventHandlers();
        }, 100);
    }

    /**
     * 通常の3階層メタデータツリーを構築
     * @param {Array} allMetadata - 全メタデータ
     */
    buildMetadataTreeWithSchema(allMetadata) {
        allMetadata.forEach(schema => {
            const schemaItem = document.createElement('div');
            schemaItem.className = 'schema-item mb-1';
            const schemaHeader = document.createElement('div');
            schemaHeader.className = 'schema-header d-flex align-items-center p-2 rounded-1';
            schemaHeader.style.cursor = 'pointer';
            const schemaComment = schema.comment || '';
            schemaHeader.innerHTML = `
                <i class="fas fa-chevron-right fa-fw me-2 toggle-icon"></i>
                <i class="fas fa-database fa-fw me-1 text-secondary"></i>
                <span class="fw-bold" title="${schemaComment}">${schema.name}</span>
                ${schemaComment ? `<small class="text-muted ms-2">${schemaComment}</small>` : ''}
            `;
            schemaHeader.classList.add('collapsed');
            const schemaContent = document.createElement('div');
            schemaContent.className = 'schema-content collapsed';
            const tableList = document.createElement('ul');
            tableList.className = 'list-unstyled ps-3';
            if (schema.tables && Array.isArray(schema.tables)) {
                schema.tables.forEach(table => {
                    const tableItem = document.createElement('li');
                    const tableHeader = document.createElement('div');
                    tableHeader.className = 'table-link d-flex align-items-center p-1 rounded-1';
                    tableHeader.style.cursor = 'pointer';
                    const tableComment = table.comment || '';
                    tableHeader.innerHTML = `
                        <i class="fas fa-chevron-right fa-fw me-2 toggle-icon"></i>
                        <i class="fas ${table.table_type === 'VIEW' ? 'fa-eye' : 'fa-table'} fa-fw me-1 text-secondary"></i>
                        <span class="table-name-clickable" title="${tableComment}" data-table="${table.name}" data-schema="${schema.name}">${table.name}</span>
                        ${tableComment ? `<small class="text-muted ms-2">${tableComment}</small>` : ''}
                        <div class="ms-auto">
                            <input type="checkbox" class="table-checkbox" data-table="${table.name}" data-schema="${schema.name}">
                        </div>
                    `;
                    tableHeader.classList.add('collapsed');
                    const columnList = document.createElement('ul');
                    columnList.className = 'column-list list-unstyled ps-4 mt-1 collapsed';
                    if (table.columns && Array.isArray(table.columns)) {
                        table.columns.forEach(column => {
                            const columnItem = document.createElement('li');
                            columnItem.className = 'column-item d-flex justify-content-between align-items-center p-1';
                            const columnComment = column.comment || '';
                            const leftGroup = `
                                <div>
                                <span class="column-name-clickable text-body-secondary" title="${columnComment}" data-column="${column.name}" data-table="${table.name}" data-schema="${schema.name}">${column.name}</span>
                                    ${columnComment ? `<small class="text-muted ms-2">${columnComment}</small>` : ''}
                                </div>
                            `;
                            const rightGroup = `
                                <input type="checkbox" class="column-checkbox me-2" data-column="${column.name}" data-table="${table.name}" data-schema="${schema.name}">
                                <span class="column-type text-muted small">${column.data_type}</span>
                            `;
                            const columnContent = leftGroup + rightGroup;
                            columnItem.innerHTML = columnContent;
                            columnList.appendChild(columnItem);
                        });
                    }
                    tableHeader.addEventListener('click', (e) => {
                        // チェックボックスがクリックされた場合はテーブル開閉処理をスキップ
                        if (e.target.classList.contains('table-checkbox')) {
                            return;
                        }
                        
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
        
        // イベントハンドラーを設定（少し遅延させて確実に設定）
        setTimeout(() => {
            this.setupMetadataEventHandlers();
        }, 100);
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
        const headers = document.querySelectorAll('#dataTable th.sortable');
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

    /**
     * メタデータツリーのイベントハンドラーを設定
     */
    setupMetadataEventHandlers() {
        if (!this.metadataTree) return;

        // テーブル名クリックイベント
        this.metadataTree.addEventListener('click', (e) => {
            const tableNameClickable = e.target.closest('.table-name-clickable');
            const columnNameClickable = e.target.closest('.column-name-clickable');

            if (tableNameClickable) {
                e.preventDefault();
                e.stopPropagation();
                this.handleTableNameClick(tableNameClickable);
            } else if (columnNameClickable) {
                e.preventDefault();
                e.stopPropagation();
                this.handleColumnNameClick(columnNameClickable);
            }
        });

        // チェックボックスのイベント（changeイベントを使用）
        this.metadataTree.addEventListener('change', (e) => {
            if (e.target.classList.contains('table-checkbox')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.handleTableCheckboxChange(e.target);
            } else if (e.target.classList.contains('column-checkbox')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.handleColumnCheckboxChange(e.target);
            }
        });

        // エディタに反映ボタンのイベント
        if (this.applyToEditorBtn) {
            this.applyToEditorBtn.addEventListener('click', () => {
                this.applySelectionToEditor();
            });
        }
    }

    /**
     * テーブル名クリック時の処理
     * @param {Element} element - クリックされた要素
     */
    handleTableNameClick(element) {
        const tableName = element.dataset.table;
        
        // エディタにテーブル名を挿入（スキーマ情報は除外）
        if (window.appController && window.appController.getEditorService()) {
            window.appController.getEditorService().insertText(tableName);
        }
    }

    /**
     * カラム名クリック時の処理
     * @param {Element} element - クリックされた要素
     */
    handleColumnNameClick(element) {
        const columnName = element.dataset.column;
        
        // エディタにカラム名を挿入
        if (window.appController && window.appController.getEditorService()) {
            window.appController.getEditorService().insertText(columnName);
        }
    }

    /**
     * テーブルチェックボックス変更時の処理
     * @param {Element} checkbox - チェックボックス要素
     */
    handleTableCheckboxChange(checkbox) {
        const tableName = checkbox.dataset.table;
        const schemaName = checkbox.dataset.schema;
        const isChecked = checkbox.checked;

        if (isChecked) {
            // 他のすべてのチェックを外す
            this.clearAllSelections();
            this.selectedTable = { name: tableName, schema: schemaName };
            // チェックボックスを再度チェック（clearAllSelectionsで外れるため）
            setTimeout(() => {
                checkbox.checked = true;
            }, 0);
            
            // テーブルを必ず展開する
            this.expandTable(tableName, schemaName);
        } else {
            this.selectedTable = null;
            // チェックを外してもテーブルは閉じない（開閉状態は維持）
        }

        this.updateApplyButtonVisibility();
    }

    /**
     * カラムチェックボックス変更時の処理
     * @param {Element} checkbox - チェックボックス要素
     */
    handleColumnCheckboxChange(checkbox) {
        const columnName = checkbox.dataset.column;
        const tableName = checkbox.dataset.table;
        const schemaName = checkbox.dataset.schema;
        const isChecked = checkbox.checked;

        if (isChecked) {
            // 同じテーブル以外のチェックを外す
            this.clearOtherTableSelections(tableName, schemaName);
            const columnKey = `${schemaName}.${tableName}.${columnName}`;
            this.selectedColumns.add(columnKey);
            // チェックボックスを再度チェック（clearOtherTableSelectionsで外れる可能性があるため）
            setTimeout(() => {
                checkbox.checked = true;
            }, 0);
        } else {
            const columnKey = `${schemaName}.${tableName}.${columnName}`;
            this.selectedColumns.delete(columnKey);
        }

        this.updateApplyButtonVisibility();
    }

    /**
     * すべての選択をクリア
     */
    clearAllSelections() {
        // すべてのチェックボックスを外す
        const allCheckboxes = document.querySelectorAll('.table-checkbox, .column-checkbox');
        allCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        // 選択状態をクリア
        this.selectedTable = null;
        this.selectedColumns.clear();
    }

    /**
     * 指定されたテーブル以外の選択をクリア
     * @param {string} tableName - 保持するテーブル名
     * @param {string} schemaName - 保持するスキーマ名
     */
    clearOtherTableSelections(tableName, schemaName) {
        // 他のテーブルのチェックボックスを外す
        const otherTableCheckboxes = document.querySelectorAll('.table-checkbox');
        otherTableCheckboxes.forEach(checkbox => {
            const checkboxTable = checkbox.dataset.table;
            const checkboxSchema = checkbox.dataset.schema;
            if (checkboxTable !== tableName || checkboxSchema !== schemaName) {
                checkbox.checked = false;
            }
        });

        // 他のテーブルのカラムチェックボックスを外す
        const otherColumnCheckboxes = document.querySelectorAll('.column-checkbox');
        otherColumnCheckboxes.forEach(checkbox => {
            const checkboxTable = checkbox.dataset.table;
            const checkboxSchema = checkbox.dataset.schema;
            if (checkboxTable !== tableName || checkboxSchema !== schemaName) {
                checkbox.checked = false;
            }
        });

        // 選択状態をクリア（指定されたテーブル以外）
        if (this.selectedTable && (this.selectedTable.name !== tableName || this.selectedTable.schema !== schemaName)) {
            this.selectedTable = null;
        }

        // 他のテーブルのカラム選択をクリア
        const keysToRemove = [];
        this.selectedColumns.forEach(columnKey => {
            const [schema, table, column] = columnKey.split('.');
            if (table !== tableName || schema !== schemaName) {
                keysToRemove.push(columnKey);
            }
        });
        keysToRemove.forEach(key => this.selectedColumns.delete(key));
    }

    /**
     * テーブルを展開する
     * @param {string} tableName - テーブル名
     * @param {string} schemaName - スキーマ名
     */
    expandTable(tableName, schemaName) {
        // テーブルヘッダーを探す
        const tableHeaders = document.querySelectorAll('.table-link');
        tableHeaders.forEach(header => {
            const headerTable = header.querySelector('[data-table]');
            const headerSchema = header.querySelector('[data-schema]');
            
            if (headerTable && headerSchema && 
                headerTable.dataset.table === tableName && 
                headerSchema.dataset.schema === schemaName) {
                
                // テーブルが閉じている場合は展開する
                if (header.classList.contains('collapsed')) {
                    const columnList = header.nextElementSibling;
                    if (columnList && columnList.classList.contains('column-list')) {
                        header.classList.remove('collapsed');
                        columnList.classList.remove('collapsed');
                        const icon = header.querySelector('.toggle-icon');
                        if (icon) {
                            icon.classList.remove('fa-chevron-right');
                            icon.classList.add('fa-chevron-down');
                        }
                    }
                }
            }
        });
    }

    /**
     * エディタに反映ボタンの表示/非表示を更新
     */
    updateApplyButtonVisibility() {
        if (!this.applyToEditorBtn) return;

        const hasSelection = this.selectedTable || this.selectedColumns.size > 0;
        this.applyToEditorBtn.style.display = hasSelection ? 'inline-block' : 'none';
    }

    /**
     * 選択された内容をエディタに反映
     */
    applySelectionToEditor() {
        if (!window.appController || !window.appController.getEditorService()) {
            console.error('エディタサービスが見つかりません');
            return;
        }

        const editorService = window.appController.getEditorService();
        let insertText = '';

        if (this.selectedTable) {
            // テーブルが選択されている場合（スキーマ情報は除外）
            const tableName = this.selectedTable.name;

            if (this.selectedColumns.size > 0) {
                // カラムも選択されている場合
                const columnNames = Array.from(this.selectedColumns)
                    .filter(columnKey => {
                        const [schema, table, column] = columnKey.split('.');
                        return table === this.selectedTable.name && schema === this.selectedTable.schema;
                    })
                    .map(columnKey => columnKey.split('.')[2]);
                
                if (columnNames.length > 0) {
                    insertText = `SELECT ${columnNames.join(', ')} FROM ${tableName}`;
                } else {
                    insertText = `SELECT * FROM ${tableName}`;
                }
            } else {
                // テーブルのみ選択されている場合
                insertText = `SELECT * FROM ${tableName}`;
            }
        } else if (this.selectedColumns.size > 0) {
            // カラムのみ選択されている場合
            const columnNames = Array.from(this.selectedColumns).map(columnKey => columnKey.split('.')[2]);
            insertText = columnNames.join(', ');
        }

        if (insertText) {
            editorService.insertText(insertText);
            // 成功メッセージは表示しない（ユーザーが見た目で反映成功がわかるため）
        }
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

    /**
     * フィルター用のポップアップを動的に生成して表示する
     * @param {string} column - 対象のカラム名
     * @param {HTMLElement} targetIcon - クリックされたアイコン要素
     * @param {Array<string>} uniqueValues - 表示するユニークな値のリスト
     * @param {Array<string>} selectedValues - 現在選択されている値のリスト
     */
    showFilterPopup(column, targetIcon, uniqueValues, selectedValues) {
        this.clearFilterPopup();
        const popup = document.createElement('div');
        popup.className = 'filter-popup';
        popup.id = 'filter-popup-active';
        let optionsHTML = uniqueValues.map(value => `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${this.escapeHtml(value)}" id="filter-${column}-${value}" 
                       data-column="${column}" ${selectedValues.includes(String(value)) ? 'checked' : ''}>
                <label class="form-check-label" for="filter-${column}-${value}">
                    ${this.escapeHtml(value)}
                </label>
            </div>
        `).join('');
        popup.innerHTML = `
            <div class="filter-popup-header">
                <strong>${column}</strong> でフィルター
            </div>
            <div class="filter-popup-content">
                ${optionsHTML}
            </div>
            <div class="filter-popup-footer">
                <button class="btn btn-primary btn-sm" id="apply-filter-btn">適用</button>
                <button class="btn btn-warning btn-sm" id="clear-filter-btn">クリア</button>
                <button class="btn btn-secondary btn-sm" id="close-filter-btn">閉じる</button>
            </div>
        `;
        document.body.appendChild(popup);
        // アイコンの隣にポップアップを配置
        const rect = targetIcon.getBoundingClientRect();
        popup.style.left = `${rect.left}px`;
        popup.style.top = `${rect.bottom + window.scrollY}px`;
    }

    /**
     * 表示されているフィルターポップアップを削除する
     */
    clearFilterPopup() {
        const existingPopup = document.getElementById('filter-popup-active');
        if (existingPopup) {
            existingPopup.remove();
        }
    }

    /**
     * フィルターアイコンの状態を更新する
     */
    updateFilterIcons() {
        const filterIcons = document.querySelectorAll('.filter-icon');
        filterIcons.forEach(icon => {
            const column = icon.dataset.column;
            // グローバルなstateServiceにアクセス
            if (window.appController && window.appController.getStateService()) {
                const filters = window.appController.getStateService().getFilters();
                if (filters[column] && filters[column].length > 0) {
                    icon.classList.add('active');
                } else {
                    icon.classList.remove('active');
                }
            }
        });
    }
} 