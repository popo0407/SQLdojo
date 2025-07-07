/**
 * Monaco Editorの制御を担当するサービスクラス
 * エディタの初期化、制御、イベント関連のロジックを分離
 */
class EditorService {
    constructor(containerId, apiService) {
        this.containerId = containerId;
        this.apiService = apiService; // 補完機能でAPIを叩くため
        this.sqlEditor = null;
        this.isInitialized = false;
    }

    /**
     * Monaco Editorを初期化
     * @returns {Promise} 初期化完了のPromise
     */
    init() {
        return new Promise((resolve) => {
            require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
            require(['vs/editor/editor.main'], () => {
                this._defineCustomTheme();
                this.sqlEditor = monaco.editor.create(document.getElementById(this.containerId), {
                    value: '',
                    language: 'sql',
                    theme: 'customTheme',
                    fontSize: 14,
                    fontFamily: 'Fira Code, JetBrains Mono, Courier New, monospace',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    roundedSelection: false,
                    readOnly: false,
                    cursorStyle: 'line',
                    extraEditorClassName: 'monaco-editor'
                });
                
                this._registerSQLCompletionProvider();
                this._setupEditorShortcuts();
                
                // エディタのサイズを調整
                this.sqlEditor.layout();
                this.isInitialized = true;
                
                resolve(this.sqlEditor);
            });
        });
    }

    /**
     * エディタの値を取得
     * @returns {string} エディタの内容
     */
    getValue() { 
        return this.sqlEditor ? this.sqlEditor.getValue() : ''; 
    }

    /**
     * エディタの値を設定
     * @param {string} text - 設定するテキスト
     */
    setValue(text) { 
        if (this.sqlEditor) {
            this.sqlEditor.setValue(text);
        }
    }

    /**
     * エディタにフォーカス
     */
    focus() { 
        if (this.sqlEditor) {
            this.sqlEditor.focus();
        }
    }

    /**
     * エディタのレイアウトを更新
     */
    layout() { 
        if (this.sqlEditor) {
            this.sqlEditor.layout();
        }
    }

    /**
     * エディタにコマンドを追加
     * @param {number} keybinding - キーバインド
     * @param {Function} handler - ハンドラー関数
     */
    addCommand(keybinding, handler) {
        if (this.sqlEditor) {
            this.sqlEditor.addCommand(keybinding, handler);
        }
    }

    /**
     * カスタムテーマを定義
     */
    _defineCustomTheme() {
        try {
            const rootStyles = getComputedStyle(document.documentElement);
            monaco.editor.defineTheme('customTheme', {
                base: 'vs',
                inherit: true,
                rules: [
                    { token: '', background: rootStyles.getPropertyValue('--card-background').trim().replace('#', '') },
                    { token: '', foreground: rootStyles.getPropertyValue('--text-color').trim().replace('#', '') },
                ],
                colors: {
                    'editor.background': rootStyles.getPropertyValue('--card-background').trim(),
                    'editor.foreground': rootStyles.getPropertyValue('--text-color').trim(),
                    'editorCursor.foreground': rootStyles.getPropertyValue('--accent-color').trim(),
                    'editorLineNumber.foreground': rootStyles.getPropertyValue('--text-muted').trim(),
                    'editor.selectionBackground': rootStyles.getPropertyValue('--secondary-color').trim(),
                    'editorWidget.background': rootStyles.getPropertyValue('--sidebar-background').trim(),
                    'editorWidget.border': rootStyles.getPropertyValue('--border-color').trim(),
                }
            });
        } catch (error) {
            console.error("カスタムテーマの定義に失敗しました。CSS変数が正しく読み込まれているか確認してください。", error);
        }
    }

    /**
     * SQL補完プロバイダーを登録
     */
    _registerSQLCompletionProvider() {
        monaco.languages.registerCompletionItemProvider('sql', {
            provideCompletionItems: async (model, position) => {
                // 変更点：カーソルまでのテキストではなく、エディタの全文を取得
                const fullSql = model.getValue();
                // カーソル位置をオフセット（文字列の先頭からの文字数）に変換
                const offset = model.getOffsetAt(position);

                try {
                    const response = await fetch('/api/v1/sql/suggest', {
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
                        kind: this._getMonacoCompletionItemKind(item.kind),
                        detail: item.detail,         // ← item.detail をそのまま使うように修正
                        documentation: item.documentation, // ← item.documentation をそのまま使うように修正
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

    /**
     * Monaco Editorの補完アイテム種別を取得
     * @param {string} kind - 補完種別
     * @returns {number} Monaco Editorの補完アイテム種別
     */
    _getMonacoCompletionItemKind(kind) {
        const kindMap = {
            'keyword': monaco.languages.CompletionItemKind.Keyword,
            'function': monaco.languages.CompletionItemKind.Function,
            'table': monaco.languages.CompletionItemKind.Class,
            'view': monaco.languages.CompletionItemKind.Class,
            'column': monaco.languages.CompletionItemKind.Field,
            'schema': monaco.languages.CompletionItemKind.Module,
            'snippet': monaco.languages.CompletionItemKind.Snippet
        };
        return kindMap[kind] || monaco.languages.CompletionItemKind.Text;
    }

    /**
     * エディタのショートカットを設定
     */
    _setupEditorShortcuts() {
        if (!this.sqlEditor) return;
        
        // Ctrl+Enter: SQL実行（グローバルイベントで処理）
        // Ctrl+Shift+F: SQL整形（グローバルイベントで処理）
        // Ctrl+L: クリア（グローバルイベントで処理）
        
        // エディタ固有のショートカットをここに追加
        this.sqlEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            // Ctrl+S: 保存（必要に応じて実装）
            console.log('Ctrl+S pressed');
        });
    }

    /**
     * エディタの内容をクリア
     */
    clear() {
        this.setValue('');
    }

    /**
     * エディタの内容を整形
     * @returns {Promise<string>} 整形されたSQL
     */
    async format() {
        const currentValue = this.getValue();
        if (!currentValue.trim()) {
            return currentValue;
        }
        
        try {
            const result = await this.apiService.formatSQL(currentValue);
            if (result.success && result.formatted_sql) {
                this.setValue(result.formatted_sql);
                return result.formatted_sql;
            } else {
                throw new Error(result.error_message || 'SQLの整形に失敗しました');
            }
        } catch (error) {
            console.error('SQL整形エラー:', error);
            throw error;
        }
    }

    /**
     * 特定の位置にテキストを挿入
     * @param {string} text - 挿入するテキスト
     * @param {number} position - 挿入位置（オプション）
     */
    insertText(text, position = null) {
        if (!this.sqlEditor) return;
        
        if (position) {
            const pos = this.sqlEditor.getModel().getPositionAt(position);
            this.sqlEditor.executeEdits('insert', [{
                range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
                text: text
            }]);
        } else {
            // 現在のカーソル位置に挿入
            const selection = this.sqlEditor.getSelection();
            this.sqlEditor.executeEdits('insert', [{
                range: selection,
                text: text
            }]);
        }
    }

    /**
     * エディタの選択範囲を取得
     * @returns {Object|null} 選択範囲
     */
    getSelection() {
        return this.sqlEditor ? this.sqlEditor.getSelection() : null;
    }

    /**
     * エディタの選択範囲を設定
     * @param {Object} selection - 選択範囲
     */
    setSelection(selection) {
        if (this.sqlEditor) {
            this.sqlEditor.setSelection(selection);
        }
    }

    /**
     * エディタが初期化されているかチェック
     * @returns {boolean} 初期化状態
     */
    isReady() {
        return this.isInitialized && this.sqlEditor !== null;
    }

    /**
     * エディタの設定を更新
     * @param {Object} options - 設定オプション
     */
    updateOptions(options) {
        if (this.sqlEditor) {
            this.sqlEditor.updateOptions(options);
        }
    }

    /**
     * SQLからプレースホルダーを解析
     * @param {string} sql - 解析対象のSQL
     * @returns {Array} プレースホルダー情報の配列
     */
    parsePlaceholders(sql) {
        const placeholderRegex = /\{([^}]+)\}/g;
        const placeholders = [];
        let match;

        while ((match = placeholderRegex.exec(sql)) !== null) {
            const fullMatch = match[0]; // {入力欄の説明} または {入力欄の説明[選択肢1,選択肢2,選択肢3]}
            const content = match[1]; // 入力欄の説明 または 入力欄の説明[選択肢1,選択肢2,選択肢3]
            
            // 選択肢があるかどうかを判定（角括弧を使用）
            const choiceMatch = content.match(/^(.+?)\[([^\]]+)\]$/);
            
            if (choiceMatch) {
                // パターン②: {入力欄の説明[選択肢1,選択肢2,選択肢3]}
                const displayName = choiceMatch[1].trim();
                const choices = choiceMatch[2].split(',').map(choice => choice.trim());
                
                placeholders.push({
                    fullMatch: fullMatch,
                    displayName: displayName,
                    choices: choices,
                    isSelect: true,
                    startIndex: match.index,
                    endIndex: match.index + fullMatch.length
                });
            } else {
                // パターン①: {入力欄の説明}
                placeholders.push({
                    fullMatch: fullMatch,
                    displayName: content.trim(),
                    choices: null,
                    isSelect: false,
                    startIndex: match.index,
                    endIndex: match.index + fullMatch.length
                });
            }
        }

        console.log('プレースホルダー解析結果:', placeholders);
        return placeholders;
    }

    /**
     * プレースホルダーを実際の値に置換
     * @param {string} sql - 元のSQL
     * @param {Object} placeholderValues - プレースホルダーと値のマッピング
     * @returns {string} 置換後のSQL
     */
    replacePlaceholders(sql, placeholderValues) {
        let result = sql;
        
        // プレースホルダーを解析
        const placeholders = this.parsePlaceholders(sql);
        
        // 後ろから置換（インデックスがずれるのを防ぐ）
        for (let i = placeholders.length - 1; i >= 0; i--) {
            const placeholder = placeholders[i];
            const key = placeholder.displayName;
            const value = placeholderValues[key];
            
            if (value !== undefined && value !== '') {
                // 値をそのまま代入（処理なし）
                const replacementValue = this.formatValueForSQL(value);
                result = result.substring(0, placeholder.startIndex) + 
                        replacementValue + 
                        result.substring(placeholder.endIndex);
            }
        }
        
        return result;
    }

    /**
     * 値をSQL用にフォーマット（そのまま代入）
     * @param {string} value - 元の値
     * @returns {string} SQL用にフォーマットされた値
     */
    formatValueForSQL(value) {
        if (value === null || value === undefined || value === '') {
            return 'NULL';
        }
        
        // 値をそのまま代入（シングルクォートも含めてそのまま）
        return String(value);
    }
} 