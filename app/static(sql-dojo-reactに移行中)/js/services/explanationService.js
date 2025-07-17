/**
 * アプリ説明機能サービス
 * 説明データの管理、ステップ管理、UI操作を担当
 */
class ExplanationService {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.explanationData = this.initializeExplanationData();
        this.highlightedElements = new Set();
    }

    /**
     * 説明データの初期化
     */
    initializeExplanationData() {
        return {
            main: [
                {
                    id: 'header',
                    title: 'ヘッダー',
                    description: '• キーボードショートカット: 利用可能なショートカット一覧を表示\n• ユーザーページ: SQL履歴、個人テンプレート、パーツ管理\n• 管理者ページ: 管理者専用のページ\n• SQL生成AI: GenAIでSQLを自動生成\n• SQL解析AI: GenAIでSQLを解析・改善\n• ログアウト: ログインページに戻る',
                    target: '.header',
                    highlight: '.header'
                },
                {
                    id: 'sidebar',
                    title: 'サイドバー',
                    description: '• パラメータ入力: SQLにパラメータが含まれる場合、入力欄が自動表示\n• DB情報: テーブルとカラムを確認できる\n• 自動挿入機能: テーブル名、カラム名を押すとエディタに挿入される\n　　　　　　　チェックボックスをチェックした状態で「エディタ反映」ボタンを押すと、エディタに挿入される\n　　　　　　　　　テーブルのみにチェックした場合は、[SELECT * FROM テーブル名] が挿入される\n　　　　　　　　　カラムのみにチェックした場合は、[カラム名1,・・・] が挿入される\n　　　　　　　　　テーブルとカラムにチェックした場合は、[SELECT カラム名,・・・ FROM テーブル名] が挿入される',
                    target: '#sidebar',
                    highlight: '#sidebar'
                },
                {
                    id: 'sql-editor',
                    title: 'SQLエディタ',
                    description: '\n• 整形機能: SQLを自動的に整形して読みやすくする\n• クリア機能: エディタの内容を一括で削除\n• テンプレート: よく使うSQLをテンプレートとして保存・再利用\n• パーツ: SQLの一部をパーツとして保存・再利用',
                    target: '#sql-editor-container',
                    highlight: '#sql-editor-container'
                },
                {
                    id: 'parameters',
                    title: 'パラメータ機能',
                    description: 'SQLクエリにパラメータを設定できます。\n• 自由記入パラメータ: {表示文字} の形式で入力\n• 選択式パラメータ: {表示文字[選択肢①、選択肢②、選択肢③]} の形式で入力\nパラメータを含むSQLを入力すると、サイドバーにパラメータ入力欄が自動表示されます。',
                    target: '#sql-editor-container',
                    highlight: '#sql-editor-container'
                },
                {
                    id: 'results',
                    title: '実行結果',
                    description: '件数表示： クエリの実行結果をテーブル形式で表示\n• 件数表示: 取得したレコード数を表示\n• 実行時間: クエリの実行にかかった時間を表示\n• 並び替え: 結果テーブルの列をクリックして並び替え可能\n• CSVエクスポート: 結果をCSVファイルとしてダウンロード',
                    target: '#results-container',
                    highlight: '#results-container'
                }
            ],
            user: [
                {
                    id: 'sql-history',
                    title: 'SQL履歴',
                    description: '• 発行日時: 各クエリの発行日時を表示\n• SQL分: 実際に実行されたSQLの内容を表示（マウスのカーソルを当てるとSQLが表示される）\n• 処理時間: クエリの実行にかかった時間を表示\n• 操作: 発行したSQLをエディタに挿入',
                    target: '#sql-history-section',
                    highlight: '#sql-history-section'
                },
                {
                    id: 'templates',
                    title: '個人テンプレート管理',
                    description: '• テンプレート保存: よく使用するSQLクエリをテンプレートとして保存\n• テンプレート一覧: 保存したテンプレートの一覧を表示\n• 削除: 不要なテンプレートを削除',
                    target: '#templates-section',
                    highlight: '#templates-section'
                },
                {
                    id: 'parts',
                    title: '個人パーツ管理',
                    description: '• パーツ保存: 頻繁に使用するSQLの一部をパーツとして保存\n• パーツ一覧: 保存したパーツの一覧を表示\n• 削除: 不要なパーツを削除',
                    target: '#parts-section',
                    highlight: '#parts-section'
                }
            ]
        };
    }

    /**
     * 説明機能を開始
     * @param {string} type - 説明タイプ ('main' または 'user')
     */
    start(type = 'main') {
        this.isActive = true;
        this.currentStep = 0;
        this.type = type;
        
        // レイアウトを変更
        this.showExplanationLayout();
        
        // 個別説明アイコンを追加
        this.addExplanationIcons();
        
        // ダミーSQLをエディタに入力（パラメータ説明用）
        this.insertDummySQL();
        
        // 最初のステップを表示
        this.showCurrentStep();
        
        // キーボードショートカットを設定
        this.setupKeyboardShortcuts();
    }

    /**
     * 説明機能を終了
     */
    close() {
        this.isActive = false;
        this.currentStep = 0;
        
        // ハイライトをクリア
        this.clearHighlights();
        
        // 個別説明アイコンを削除
        this.removeExplanationIcons();
        
        // エディタを最大化に戻す
        this.maximizeEditor();
        
        // レイアウトを元に戻す
        this.hideExplanationLayout();
        
        // キーボードショートカットを削除
        this.removeKeyboardShortcuts();

        // 実行結果エリアを非表示に戻す
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    }

    /**
     * 次のステップに進む
     */
    nextStep() {
        if (this.currentStep < this.explanationData[this.type].length - 1) {
            this.currentStep++;
            this.showCurrentStep();
        } else {
            this.close();
        }
    }

    /**
     * 前のステップに戻る
     */
    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showCurrentStep();
        }
    }

    /**
     * 現在のステップを表示
     */
    showCurrentStep() {
        const step = this.explanationData[this.type][this.currentStep];
        if (!step) return;

        // ウィンドウ位置の切り替え
        const floatingWindow = document.getElementById('explanation-floating-window');
        if (floatingWindow) {
            floatingWindow.classList.remove('top', 'bottom');
            if (step.id === 'parts') {
                floatingWindow.classList.add('top');
            } else {
                floatingWindow.classList.add('bottom');
            }
        }

        // ハイライトをクリア
        this.clearHighlights();

        // 新しい要素をハイライト
        this.highlightElement(step.highlight);

        // 説明対象要素までスクロール
        this.scrollToTarget(step.target);

        // エディタの表示制御
        this.controlEditorDisplay(step.id);

        // 実行結果の説明ステップの場合、ダミーデータが表示されていることを確認
        const resultsContainer = document.getElementById('results-container');
        if (step.id === 'results') {
            // 結果エリアを表示
            if (resultsContainer) {
                resultsContainer.style.display = 'block';
            }
            // ダミーデータが表示されていない場合は挿入
            if (resultsContainer && !resultsContainer.querySelector('.result-card')) {
                this.insertDummyResultsAfterAnimation();
            }
        } else {
            // 実行結果以外のステップでは非表示に戻す
            if (resultsContainer) {
                resultsContainer.style.display = 'none';
            }
        }

        // 説明文を更新
        this.updateExplanationContent(step);

        // プログレスを更新
        this.updateProgress();
    }

    /**
     * 要素をハイライト
     * @param {string} selector - ハイライトする要素のセレクタ
     */
    highlightElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('explanation-highlight');
            this.highlightedElements.add(element);
        }
    }

    /**
     * ハイライトをクリア
     */
    clearHighlights() {
        this.highlightedElements.forEach(element => {
            element.classList.remove('explanation-highlight');
        });
        this.highlightedElements.clear();
    }

    /**
     * 説明コンテンツを更新
     * @param {Object} step - 現在のステップ情報
     */
    updateExplanationContent(step) {
        const titleElement = document.getElementById('explanation-title');
        const contentElement = document.getElementById('explanation-content');
        
        if (titleElement) {
            titleElement.textContent = step.title;
        }
        
        if (contentElement) {
            // 改行をHTMLの改行タグに変換
            const formattedDescription = step.description.replace(/\n/g, '<br>');
            contentElement.innerHTML = formattedDescription;
        }
    }

    /**
     * プログレスを更新
     */
    updateProgress() {
        const currentElement = document.getElementById('explanation-current');
        const totalElement = document.getElementById('explanation-total');
        
        if (currentElement) {
            currentElement.textContent = this.currentStep + 1;
        }
        
        if (totalElement) {
            totalElement.textContent = this.explanationData[this.type].length;
        }
    }

    /**
     * 説明レイアウトを表示
     */
    showExplanationLayout() {
        const container = document.getElementById('tutorial-layout-container');
        const mainContent = document.getElementById('tutorial-main-content');
        const floatingWindow = document.getElementById('explanation-floating-window');
        
        if (container) {
            container.classList.add('explanation-active');
        }
        if (mainContent) {
            mainContent.classList.add('explanation-active');
        }
        if (floatingWindow) {
            floatingWindow.style.display = 'flex';
        }
    }

    /**
     * 説明レイアウトを非表示
     */
    hideExplanationLayout() {
        const container = document.getElementById('tutorial-layout-container');
        const mainContent = document.getElementById('tutorial-main-content');
        const floatingWindow = document.getElementById('explanation-floating-window');
        
        if (container) {
            container.classList.remove('explanation-active');
        }
        if (mainContent) {
            mainContent.classList.remove('explanation-active');
        }
        if (floatingWindow) {
            floatingWindow.style.display = 'none';
        }
    }

    /**
     * キーボードショートカットを設定
     */
    setupKeyboardShortcuts() {
        this.keyboardHandler = (event) => {
            if (!this.isActive) return;
            
            switch (event.key) {
                case 'ArrowRight':
                case 'Enter':
                    event.preventDefault();
                    this.nextStep();
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    this.previousStep();
                    break;
                case 'Escape':
                    event.preventDefault();
                    this.close();
                    break;
            }
        };
        
        document.addEventListener('keydown', this.keyboardHandler);
    }

    /**
     * キーボードショートカットを削除
     */
    removeKeyboardShortcuts() {
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
    }

    /**
     * 個別説明を表示
     * @param {string} elementId - 説明対象の要素ID
     */
    showIndividualExplanation(elementId) {
        const step = this.explanationData[this.type].find(s => s.id === elementId);
        if (step) {
            this.highlightElement(step.highlight);
            this.scrollToTarget(step.target);
            
            // エディタの表示制御
            this.controlEditorDisplay(elementId);
            
            // 実行結果の説明の場合、ダミーデータが表示されていることを確認
            const resultsContainer = document.getElementById('results-container');
            if (elementId === 'results') {
                // 結果エリアを表示
                if (resultsContainer) {
                    resultsContainer.style.display = 'block';
                }
                // ダミーデータが表示されていない場合は挿入
                if (resultsContainer && !resultsContainer.querySelector('.result-card')) {
                    this.insertDummyResultsAfterAnimation();
                }
            } else {
                // 実行結果以外の個別説明時は非表示に戻す
                if (resultsContainer) {
                    resultsContainer.style.display = 'none';
                }
            }
            
            this.updateExplanationContent(step);
        }
    }

    /**
     * 個別説明アイコンを追加
     */
    addExplanationIcons() {
        // 個別説明アイコンの追加を無効化
        // const elements = [
        //     { selector: '.header', id: 'header' },
        //     { selector: '#sidebar', id: 'sidebar' },
        //     { selector: '#sql-editor-container', id: 'sql-editor' },
        //     { selector: '#results-container', id: 'results' }
        // ];

        // elements.forEach(element => {
        //     const el = document.querySelector(element.selector);
        //     if (el && !el.querySelector('.explanation-icon')) {
        //         const icon = document.createElement('div');
        //         icon.className = 'explanation-icon';
        //         icon.innerHTML = '?';
        //         icon.onclick = () => this.showIndividualExplanation(element.id);
        //         el.style.position = 'relative';
        //         el.appendChild(icon);
        //     }
        // });
    }

    /**
     * 個別説明アイコンを削除（無効化）
     */
    removeExplanationIcons() {
        // 個別説明アイコンの削除を無効化
        // const icons = document.querySelectorAll('.explanation-icon');
        // icons.forEach(icon => icon.remove());
    }

    /**
     * エディタの表示制御
     * @param {string} stepId - 現在のステップID
     */
    controlEditorDisplay(stepId) {
        if (stepId === 'results') {
            // 実行結果の説明時はエディタを最小化
            this.minimizeEditor();
        } else {
            // それ以外ではエディタを最大化
            this.maximizeEditor();
        }
    }

    /**
     * エディタを最小化
     */
    minimizeEditor() {
        const editorContainer = document.getElementById('sql-editor-container');
        if (editorContainer) {
            editorContainer.classList.add('editor-minimized');
            editorContainer.classList.remove('editor-maximized');
        }
    }

    /**
     * エディタを最大化
     */
    maximizeEditor() {
        const editorContainer = document.getElementById('sql-editor-container');
        if (editorContainer) {
            editorContainer.classList.add('editor-maximized');
            editorContainer.classList.remove('editor-minimized');
        }
    }

    /**
     * 説明対象要素までスクロール
     * @param {string} target - スクロール対象のセレクタ
     */
    scrollToTarget(target) {
        const element = document.querySelector(target);
        if (element) {
            // 要素の位置を取得
            const rect = element.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const targetTop = rect.top + scrollTop;
            
            // スムーズスクロールで要素まで移動
            window.scrollTo({
                top: targetTop - 100, // ヘッダーの高さ分を引く
                behavior: 'smooth'
            });
        }
    }

    /**
     * ダミーSQLをエディタに入力
     */
    insertDummySQL() {
        const dummySQL = `SELECT * FROM employees 
WHERE department = {department:部署名} 
AND status = {status[active,inactive,pending]}
AND salary > {salary:給与下限}`;
        
        // Monaco Editorが利用可能な場合
        if (window.monaco && window.monaco.editor) {
            const editor = window.monaco.editor.getModels()[0];
            if (editor) {
                editor.setValue(dummySQL);
            }
        }
        // CodeMirrorが利用可能な場合
        else if (window.CodeMirror) {
            const editor = document.querySelector('.CodeMirror');
            if (editor && editor.CodeMirror) {
                editor.CodeMirror.setValue(dummySQL);
            }
        }
        
        // ダミー実行結果を表示
        this.insertDummyResults();
    }
    
    /**
     * ダミー実行結果を挿入
     */
    insertDummyResults() {
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            const dummyResults = `
                <div class="result-card">
                    <div class="result-header">
                        <h5><i class="fas fa-table me-2"></i>実行結果</h5>
                        <div class="result-stats">
                            <span class="stat-item"><i class="fas fa-list me-1"></i>3件</span>
                            <span class="stat-item"><i class="fas fa-clock me-1"></i>0.15秒</span>
                        </div>
                    </div>
                    <div class="export-buttons">
                        <button class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-download me-1"></i>CSV出力
                        </button>
                    </div>
                    <div class="table-container">
                        <table class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>名前</th>
                                    <th>部署</th>
                                    <th>給与</th>
                                    <th>ステータス</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>1</td>
                                    <td>田中太郎</td>
                                    <td>営業部</td>
                                    <td>350000</td>
                                    <td>active</td>
                                </tr>
                                <tr>
                                    <td>2</td>
                                    <td>佐藤花子</td>
                                    <td>開発部</td>
                                    <td>420000</td>
                                    <td>active</td>
                                </tr>
                                <tr>
                                    <td>3</td>
                                    <td>鈴木一郎</td>
                                    <td>営業部</td>
                                    <td>380000</td>
                                    <td>inactive</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            resultsContainer.innerHTML = dummyResults;
        }
    }

    /**
     * ダミー実行結果を挿入（アニメーション後に）
     */
    insertDummyResultsAfterAnimation() {
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            const dummyResults = `
                <div class="result-card">
                    <div class="result-header">
                        <h5><i class="fas fa-table me-2"></i>実行結果</h5>
                        <div class="result-stats">
                            <span class="stat-item"><i class="fas fa-list me-1"></i>3件</span>
                            <span class="stat-item"><i class="fas fa-clock me-1"></i>0.15秒</span>
                        </div>
                    </div>
                    <div class="export-buttons">
                        <button class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-download me-1"></i>CSV出力
                        </button>
                    </div>
                    <div class="table-container">
                        <table class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>名前</th>
                                    <th>部署</th>
                                    <th>給与</th>
                                    <th>ステータス</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>1</td>
                                    <td>田中太郎</td>
                                    <td>営業部</td>
                                    <td>350000</td>
                                    <td>active</td>
                                </tr>
                                <tr>
                                    <td>2</td>
                                    <td>佐藤花子</td>
                                    <td>開発部</td>
                                    <td>420000</td>
                                    <td>active</td>
                                </tr>
                                <tr>
                                    <td>3</td>
                                    <td>鈴木一郎</td>
                                    <td>営業部</td>
                                    <td>380000</td>
                                    <td>inactive</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            resultsContainer.innerHTML = dummyResults;
        }
    }
}

// グローバルインスタンスを作成
window.explanationService = new ExplanationService(); 