/**
 * アプリ説明機能を管理するサービス
 * SQL初心者エンジニア向けの段階的説明を提供
 */
class TutorialService {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.tutorialData = null;
        this.overlay = null;
        this.init();
    }

    /**
     * 初期化処理
     */
    init() {
        this.createOverlay();
        this.bindEvents();
    }

    /**
     * オーバーレイ要素を作成
     */
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'tutorial-overlay';
        this.overlay.className = 'tutorial-overlay';
        this.overlay.innerHTML = `
            <div class="tutorial-dim-overlay" id="tutorial-dim-overlay"></div>
            <div class="tutorial-annotation" id="tutorial-annotation">
                <div class="tutorial-annotation-content">
                    <div class="tutorial-annotation-header">
                        <h5 class="tutorial-annotation-title">
                            <i class="fas fa-graduation-cap me-2"></i>
                            <span id="tutorial-title-text">アプリ説明</span>
                        </h5>
                        <button type="button" class="btn-close tutorial-close" onclick="tutorialService.close()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="tutorial-annotation-body" id="tutorial-step-content">
                        <!-- ステップ内容がここに表示される -->
                    </div>
                    <div class="tutorial-annotation-footer">
                        <div class="tutorial-progress">
                            <span id="tutorial-current-step">1</span> / <span id="tutorial-total-steps">1</span>
                        </div>
                        <div class="tutorial-buttons">
                            <button type="button" class="btn btn-outline-secondary tutorial-btn" id="tutorial-prev-btn" onclick="tutorialService.previousStep()">
                                <i class="fas fa-chevron-left me-1"></i>前へ
                            </button>
                            <button type="button" class="btn btn-primary tutorial-btn" id="tutorial-next-btn" onclick="tutorialService.nextStep()">
                                次へ<i class="fas fa-chevron-right ms-1"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        // オーバーレイを最前面に配置
        document.body.appendChild(this.overlay);
        // z-indexを最優先に設定
        this.overlay.style.zIndex = '999999';
    }

    /**
     * イベントバインド
     */
    bindEvents() {
        // ESCキーでチュートリアルを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                this.close();
            }
        });
    }

    /**
     * メインページ用のチュートリアルデータを取得
     */
    getMainPageTutorialData() {
        return {
            title: "SQLエディタの使い方",
            steps: [
                {
                    title: "ヘッダーの機能",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-bars me-2"></i>ヘッダーの機能</h5>
                            <p>画面上部のヘッダーには便利な機能があります。</p>
                            <div class="tutorial-highlight">
                                <strong>ヘッダーの機能：</strong>
                                <ul>
                                    <li>「アプリ説明」ボタン：このチュートリアルを表示</li>
                                    <li>ユーザー名表示：現在のログインユーザー</li>
                                    <li>ログアウト機能：セッション終了</li>
                                </ul>
                            </div>
                        </div>
                    `,
                    target: ".header",
                    type: null,
                    blink: null
                },
                {
                    title: "データベース情報の活用",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-database me-2"></i>サイドバーの詳細活用</h5>
                            <p>左側のサイドバーで、利用可能なデータベース、スキーマ、テーブル、カラム情報を確認・選択できます。</p>
                            <div class="tutorial-highlight">
                                <strong>使い方：</strong>
                                <ul>
                                    <li>スキーマ展開：スキーマ名をクリックしてテーブル一覧を表示</li>
                                    <li>テーブル展開：テーブル名をクリックしてカラム情報を確認</li>
                                    <li>チェックボックス選択：「エディタに反映」ボタンで選択内容をSQLに自動生成</li>
                                </ul>
                            </div>
                            <div class="tutorial-tip">
                                <i class="fas fa-lightbulb"></i>
                                <strong>ヒント：</strong>テーブルとカラムを同時に選択すると、SELECT文が自動生成されます。
                            </div>
                        </div>
                    `,
                    target: ".sidebar",
                    type: null,
                    blink: null
                },
                {
                    title: "SQLエディタの基本",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-code me-2"></i>SQLエディタの基本</h5>
                            <p>このアプリは、SQL初心者エンジニアが安全にSQLを学習・実行できる環境です。</p>
                            <div class="tutorial-highlight">
                                <strong>主な機能：</strong>
                                <ul>
                                    <li>SQLの自動補完（Ctrl+Space）</li>
                                    <li>構文エラーのチェック</li>
                                    <li>実行結果の視覚的表示</li>
                                    <li>データのCSVエクスポート</li>
                                </ul>
                            </div>
                        </div>
                    `,
                    target: "#sql-editor-container",
                    type: "editor-bottom",
                    blink: null
                },
                {
                    title: "Ctrl+Space予測変換機能",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-keyboard me-2"></i>コード補完機能</h5>
                            <p>SQLエディタでは、<kbd>Ctrl</kbd> + <kbd>Space</kbd>で予測変換機能が使えます。</p>
                            <div class="tutorial-highlight">
                                <strong>予測変換の使い方：</strong>
                                <ul>
                                    <li>SQLを入力中に<kbd>Ctrl</kbd> + <kbd>Space</kbd>を押す</li>
                                    <li>キーワード、関数、テーブル名、カラム名が候補として表示</li>
                                    <li>上下キーで選択、Enterで確定</li>
                                    <li>入力の手間を大幅に削減</li>
                                </ul>
                            </div>
                            <div class="tutorial-tip">
                                <i class="fas fa-lightbulb"></i>
                                <strong>ヒント：</strong>テーブル名やカラム名を正確に覚えていなくても、予測変換で簡単に入力できます。
                            </div>
                        </div>
                    `,
                    target: "#sql-editor-container",
                    type: "editor-bottom",
                    blink: "#monaco-editor-container"
                },
                {
                    title: "SQLの整形とクリア",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-magic me-2"></i>SQLの整形機能</h5>
                            <p>読みやすいSQLにするための機能があります。</p>
                            <div class="tutorial-highlight">
                                <strong>便利な機能：</strong>
                                <ul>
                                    <li><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd>：SQLを自動整形</li>
                                    <li><kbd>Ctrl</kbd> + <kbd>L</kbd>：エディタをクリア</li>
                                    <li>「整形」ボタン：手動で整形</li>
                                    <li>「クリア」ボタン：手動でクリア</li>
                                </ul>
                            </div>
                        </div>
                    `,
                    target: "#sql-editor-container",
                    type: "editor-bottom",
                    blink: "#formatBtn"
                },
                {
                    title: "SQLの実行",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-play me-2"></i>SQLの実行方法</h5>
                            <p>SQLを入力したら、以下の方法で実行できます。</p>
                            <div class="tutorial-highlight">
                                <strong>実行方法：</strong>
                                <ul>
                                    <li><kbd>Ctrl</kbd> + <kbd>Enter</kbd>：キーボードショートカット</li>
                                    <li>「実行」ボタンをクリック</li>
                                    <li>結果は右側のテーブルに表示されます</li>
                                </ul>
                            </div>
                            <div class="tutorial-tip">
                                <i class="fas fa-lightbulb"></i>
                                <strong>ヒント：</strong>大量データを取得する場合は、WHERE句で条件を指定することをお勧めします。
                            </div>
                        </div>
                    `,
                    target: "#sql-editor-container",
                    type: "editor-bottom",
                    blink: "#executeBtn"
                },
                {
                    title: "テンプレート保存機能",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-save me-2"></i>テンプレートの保存</h5>
                            <p>よく使うSQLをテンプレートとして保存できます。</p>
                            <div class="tutorial-highlight">
                                <strong>保存方法：</strong>
                                <ul>
                                    <li>「テンプレート保存」ボタンをクリック</li>
                                    <li>現在のSQLが個人用テンプレートとして保存</li>
                                    <li>テンプレート名は自動生成されます</li>
                                </ul>
                            </div>
                        </div>
                    `,
                    target: "#sql-editor-container",
                    type: "left",
                    blink: "#save-template-btn"
                },
                {
                    title: "テンプレート使用機能",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-folder-open me-2"></i>テンプレートの使用</h5>
                            <p>保存したテンプレートを簡単に呼び出せます。</p>
                            <div class="tutorial-highlight">
                                <strong>使用方法：</strong>
                                <ul>
                                    <li>「テンプレート」ドロップダウンをクリック</li>
                                    <li>保存済みテンプレートを選択</li>
                                    <li>テンプレート名にカーソルを合わせるとSQL全文を確認</li>
                                    <li>不要なテンプレートは削除可能</li>
                                </ul>
                            </div>
                        </div>
                    `,
                    target: "#sql-editor-container",
                    type: "right",
                    blink: "#template-dropdown"
                },
                {
                    title: "SQL実行履歴",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-history me-2"></i>実行結果の確認</h5>
                            <p>SQLを実行すると、下側に結果が表示されます。</p>
                            <div class="tutorial-highlight">
                                <strong>結果の確認方法：</strong>
                                <ul>
                                    <li>実行結果の件数と実行時間を確認</li>
                                    <li>テーブル形式でデータを表示</li>
                                    <li>CSVボタンでデータをエクスポート</li>
                                    <li>大量データの場合は結果制限が適用</li>
                                </ul>
                            </div>
                        </div>
                    `,
                    target: "#results-container",
                    type: "center-bottom",
                    blink: "#results-container"
                },
                {
                    title: "ヘッダーの機能",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-bars me-2"></i>ヘッダーの機能</h5>
                            <p>画面上部のヘッダーには便利な機能があります。</p>
                            <div class="tutorial-highlight">
                                <strong>ヘッダーの機能：</strong>
                                <ul>
                                    <li>「アプリ説明」ボタン：このチュートリアルを表示</li>
                                    <li>ユーザー名表示：現在のログインユーザー</li>
                                    <li>ログアウト機能：セッション終了</li>
                                </ul>
                            </div>
                        </div>
                    `,
                    target: ".header",
                    type: null,
                    blink: null
                },
                {
                    title: "キーボードショートカット",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-keyboard me-2"></i>ショートカット機能</h5>
                            <p>右下のキーボードアイコンをクリックすると、利用可能なショートカットを確認できます。</p>
                            <div class="tutorial-highlight">
                                <strong>主なショートカット：</strong>
                                <ul>
                                    <li><kbd>F1</kbd>：ショートカット一覧表示</li>
                                    <li><kbd>F11</kbd>：全画面切り替え</li>
                                    <li><kbd>Ctrl</kbd> + <kbd>Enter</kbd>：SQL実行</li>
                                    <li><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd>：SQL整形</li>
                                </ul>
                            </div>
                        </div>
                    `,
                    target: ".keyboard-shortcuts",
                    type: null,
                    blink: ".shortcuts-btn"
                },
                {
                    title: "個人テンプレート管理（入力）",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-save me-2"></i>テンプレート保存</h5>
                            <p>よく使うSQLを個人用テンプレートとして保存できます。</p>
                            <div class="tutorial-highlight">
                                <strong>保存方法：</strong>
                                <ul>
                                    <li>SQLエディタにSQLを入力</li>
                                    <li>「テンプレート保存」ボタンをクリック</li>
                                    <li>テンプレート名を入力して保存</li>
                                    <li>後で再利用可能</li>
                                </ul>
                            </div>
                        </div>
                    `,
                    target: "#sql-editor-container",
                    type: "left",
                    blink: "#save-template-btn"
                },
                {
                    title: "個人テンプレート管理（表示）",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-file-code me-2"></i>テンプレート選択</h5>
                            <p>保存したテンプレートを選択して使用できます。</p>
                            <div class="tutorial-highlight">
                                <strong>使用方法：</strong>
                                <ul>
                                    <li>「テンプレート」ドロップダウンをクリック</li>
                                    <li>保存済みテンプレート一覧を表示</li>
                                    <li>テンプレート名にカーソルを合わせて内容確認</li>
                                    <li>テンプレートを選択してエディタに反映</li>
                                </ul>
                            </div>
                        </div>
                    `,
                    target: "#sql-editor-container",
                    type: "right",
                    blink: ".sql-templates"
                },
                {
                    title: "完了",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-check-circle me-2"></i>チュートリアル完了</h5>
                            <p>SQLエディタの基本機能を理解しました！</p>
                            <div class="tutorial-highlight">
                                <strong>次のステップ：</strong>
                                <ul>
                                    <li>サイドバーでテーブルを選択してSQLを生成</li>
                                    <li>SQLを実行して結果を確認</li>
                                    <li>よく使うSQLをテンプレートとして保存</li>
                                    <li>キーボードショートカットを活用</li>
                                </ul>
                            </div>
                        </div>
                    `,
                    target: null,
                    type: null,
                    blink: null
                }
            ]
        };
    }

    /**
     * ユーザーページ用のチュートリアルデータを取得
     */
    getUserPageTutorialData() {
        return {
            title: "ユーザーページの機能",
            steps: [
                {
                    title: "ユーザーページの概要",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-user me-2"></i>ユーザーページの機能</h5>
                            <p>このページでは、SQLの実行履歴を確認したり、個人用のSQLテンプレートを管理したりできます。</p>
                        </div>
                    `,
                    target: null,
                    type: null,
                    blink: null
                },
                {
                    title: "SQL実行履歴の確認",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-history me-2"></i>実行履歴の確認</h5>
                            <p>過去に実行したSQLの履歴（日時、SQL文、処理時間）を確認できます。「更新」ボタンで最新の情報を取得します。</p>
                        </div>
                    `,
                    target: ".user-card:first-child",
                    type: null,
                    blink: null
                },
                {
                    title: "テンプレートの新規登録・編集",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-edit me-2"></i>テンプレートの新規登録・編集</h5>
                            <p>左側のフォームに「テンプレート名」と「SQL」を入力し、</p>
                            <p>「保存」ボタンを押すと、新しいテンプレートを登録できます。</p>
                        </div>
                    `,
                    target: ".user-card:last-child",
                    type: "right",
                    blink: null
                },
                {
                    title: "保存済みテンプレート一覧",
                    content: `
                        <div class="tutorial-step-content">
                            <h5><i class="fas fa-list-alt me-2"></i>保存済みテンプレート一覧</h5>
                            <p>右側には、保存済みのテンプレートが表示されます。</p>
                            <p>ここで内容を確認したり、不要なテンプレートを削除したりできます。</p>
                        </div>
                    `,
                    target: ".user-card:last-child",
                    type: "left",
                    blink: null
                }
            ]
        };
    }

    /**
     * チュートリアルを開始
     * @param {string} pageType - 'main' または 'user'
     */
    start(pageType = 'main') {
        this.isActive = true;
        this.currentStep = 0;
        
        // ページタイプに応じてチュートリアルデータを設定
        if (pageType === 'user') {
            this.tutorialData = this.getUserPageTutorialData();
        } else {
            this.tutorialData = this.getMainPageTutorialData();
        }

        // ダミーデータを追加
        this.addDummyData();

        this.showOverlay();
        this.showStep(0);
    }

    /**
     * チュートリアル用のダミーデータを追加
     */
    addDummyData() {
        // 結果コンテナにダミーデータを表示
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
            
            // 結果情報を更新
            const resultInfo = document.getElementById('result-info');
            if (resultInfo) {
                resultInfo.textContent = '3件';
            }
            
            const executionTime = document.getElementById('execution-time');
            if (executionTime) {
                executionTime.textContent = '0.045秒';
            }
            
            // ダミーテーブルを作成
            const dataTable = document.getElementById('dataTable');
            if (dataTable) {
                dataTable.innerHTML = `
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>名前</th>
                                <th>メール</th>
                                <th>作成日</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>1</td>
                                <td>田中太郎</td>
                                <td>tanaka@example.com</td>
                                <td>2024-01-15</td>
                            </tr>
                            <tr>
                                <td>2</td>
                                <td>佐藤花子</td>
                                <td>sato@example.com</td>
                                <td>2024-01-16</td>
                            </tr>
                            <tr>
                                <td>3</td>
                                <td>鈴木一郎</td>
                                <td>suzuki@example.com</td>
                                <td>2024-01-17</td>
                            </tr>
                        </tbody>
                    </table>
                `;
            }
        }
        
        // 少し遅延させてからダミーデータを表示（DOMの準備を待つ）
        setTimeout(() => {
            const resultsContainer = document.getElementById('results-container');
            if (resultsContainer) {
                resultsContainer.style.display = 'block';
            }
        }, 100);
    }

    /**
     * オーバーレイを表示
     */
    showOverlay() {
        this.overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
        // オーバーレイを最前面に強制配置
        this.overlay.style.zIndex = '999999';
        // 説明枠も最前面に強制配置
        const annotation = document.getElementById('tutorial-annotation');
        if (annotation) {
            annotation.style.zIndex = '999999';
        }
    }

    /**
     * 指定したステップを表示
     * @param {number} stepIndex - ステップインデックス
     */
    showStep(stepIndex) {
        if (!this.tutorialData || stepIndex >= this.tutorialData.steps.length) {
            this.close();
            return;
        }

        this.currentStep = stepIndex;
        const step = this.tutorialData.steps[stepIndex];

        // タイトルとコンテンツを更新
        document.getElementById('tutorial-title-text').textContent = this.tutorialData.title;
        document.getElementById('tutorial-step-content').innerHTML = step.content;

        // プログレスを更新
        document.getElementById('tutorial-current-step').textContent = stepIndex + 1;
        document.getElementById('tutorial-total-steps').textContent = this.tutorialData.steps.length;

        // ボタンの状態を更新
        const prevBtn = document.getElementById('tutorial-prev-btn');
        const nextBtn = document.getElementById('tutorial-next-btn');

        prevBtn.disabled = stepIndex === 0;
        nextBtn.textContent = stepIndex === this.tutorialData.steps.length - 1 ? '完了' : '次へ';
        nextBtn.innerHTML = stepIndex === this.tutorialData.steps.length - 1 ? 
            '完了<i class="fas fa-check ms-1"></i>' : 
            '次へ<i class="fas fa-chevron-right ms-1"></i>';

        // ターゲット要素をハイライト
        this.highlightTarget(step.target, step.blink);
        
        // 説明枠の位置を動的に調整
        this.positionAnnotation(step.target, step.type);
    }

    /**
     * ターゲット要素をハイライト
     * @param {string} targetSelector - ターゲット要素のセレクタ
     * @param {string} blinkSelector - 黄色点滅枠を付与するセレクタ
     */
    highlightTarget(targetSelector, blinkSelector) {
        // 既存のハイライト・点滅を削除
        const existingHighlights = document.querySelectorAll('.tutorial-highlight-target');
        existingHighlights.forEach(el => {
            el.classList.remove('tutorial-highlight-target');
        });
        const existingBlinks = document.querySelectorAll('.tutorial-blink');
        existingBlinks.forEach(el => {
            el.classList.remove('tutorial-blink');
        });

        if (targetSelector) {
            const targetElement = document.querySelector(targetSelector);
            if (targetElement) {
                targetElement.classList.add('tutorial-highlight-target');
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                this.adjustTargetElement(targetElement);
                console.log('ハイライト追加:', targetSelector);
            } else {
                console.log('ターゲット要素が見つかりません:', targetSelector);
            }
        }
        if (blinkSelector) {
            const blinkElement = document.querySelector(blinkSelector);
            if (blinkElement) {
                blinkElement.classList.add('tutorial-blink');
                console.log('黄色点滅枠追加:', blinkSelector);
            } else {
                console.log('点滅要素が見つかりません:', blinkSelector);
            }
        }
    }

    /**
     * 説明対象要素の一時的なスタイル変更
     * @param {HTMLElement} targetElement - ターゲット要素
     */
    adjustTargetElement(targetElement) {
        // 既存の調整を元に戻す
        this.restoreTargetElements();

        // 要素の種類に応じてスタイルを調整
        const elementId = targetElement.id;
        const elementClass = targetElement.className;

        if (elementId === 'results-container') {
            // 実行結果コンテナの場合、一時的に縮小
            targetElement.style.maxHeight = '30vh';
            targetElement.style.overflow = 'hidden';
            targetElement.dataset.tutorialAdjusted = 'true';
        } else if (elementId === 'sql-editor-container') {
            // SQLエディタの場合、一時的に縮小
            targetElement.style.maxHeight = '40vh';
            targetElement.dataset.tutorialAdjusted = 'true';
        } else if (elementClass.includes('sidebar')) {
            // サイドバーの場合、一時的に縮小
            targetElement.style.width = '250px';
            targetElement.dataset.tutorialAdjusted = 'true';
        }
    }

    /**
     * 説明対象要素のスタイルを元に戻す
     */
    restoreTargetElements() {
        const adjustedElements = document.querySelectorAll('[data-tutorial-adjusted="true"]');
        adjustedElements.forEach(el => {
            el.style.maxHeight = '';
            el.style.overflow = '';
            el.style.width = '';
            delete el.dataset.tutorialAdjusted;
        });
    }

    /**
     * 説明枠の位置を動的に調整
     * @param {string} targetSelector - ターゲット要素のセレクタ
     * @param {string} stepType - ステップ種別（"editor-bottom"/"half-bottom"/"left"/"right"/null）
     */
    positionAnnotation(targetSelector, stepType) {
        const annotation = document.getElementById('tutorial-annotation');
        if (!annotation) return;

        // 説明枠の高さを取得
        const annotationHeight = annotation.offsetHeight;
        const viewportHeight = window.innerHeight;
        const margin = 20; // 下端からの余白

        // デフォルトは中央
        let left = '50%';
        let top = '50%';
        let transform = 'translate(-50%, -50%)';

        if (stepType === 'editor-bottom') {
            left = '50%';
            // 説明枠の高さを考慮して画面下端に配置
            top = `${viewportHeight - annotationHeight - margin}px`;
            transform = 'translateX(-50%)';
        } else if (stepType === 'half-bottom') {
            left = '50%';
            top = '75%';
            transform = 'translate(-50%, 0)';
        } else if (stepType === 'center-bottom') {
            left = '50%';
            top = '70%';
            transform = 'translate(-50%, 0)';
        } else if (stepType === 'left') {
            left = '10vw';
            top = '50%';
            transform = 'translate(0, -50%)';
        } else if (stepType === 'right') {
            left = 'calc(100vw - 10vw)';
            top = '50%';
            transform = 'translate(-100%, -50%)';
        } else if (targetSelector) {
            const targetElement = document.querySelector(targetSelector);
            if (targetElement) {
                const targetRect = targetElement.getBoundingClientRect();
                const annotationRect = annotation.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                // 右側にスペースがない場合は左側に配置
                if (targetRect.right + annotationRect.width > viewportWidth - 20) {
                    left = `${Math.max(20, targetRect.left - annotationRect.width - 20)}px`;
                    top = `${Math.max(20, Math.min(viewportHeight - annotationRect.height - 20, targetRect.top))}px`;
                    transform = 'none';
                } else if (targetRect.left - annotationRect.width < 20) {
                    left = `${Math.min(viewportWidth - annotationRect.width - 20, targetRect.right + 20)}px`;
                    top = `${Math.max(20, Math.min(viewportHeight - annotationRect.height - 20, targetRect.top))}px`;
                    transform = 'none';
                }
            }
        }
        annotation.style.left = left;
        annotation.style.top = top;
        annotation.style.transform = transform;
    }

    /**
     * 次のステップに進む
     */
    nextStep() {
        if (this.currentStep < this.tutorialData.steps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.close();
        }
    }

    /**
     * 前のステップに戻る
     */
    previousStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }

    /**
     * チュートリアルを閉じる
     */
    close() {
        this.isActive = false;
        this.overlay.style.display = 'none';
        document.body.style.overflow = '';

        // ハイライトを削除
        const existingHighlights = document.querySelectorAll('.tutorial-highlight-target');
        existingHighlights.forEach(el => {
            el.classList.remove('tutorial-highlight-target');
        });

        // 黄色点滅枠を削除
        const existingBlinks = document.querySelectorAll('.tutorial-blink');
        existingBlinks.forEach(el => {
            el.classList.remove('tutorial-blink');
        });

        // 説明対象要素のスタイルを元に戻す
        this.restoreTargetElements();

        // 靄がけオーバーレイを非表示
        const dimOverlay = document.getElementById('tutorial-dim-overlay');
        if (dimOverlay) {
            dimOverlay.style.display = 'none';
        }
    }
}

// グローバルインスタンスを作成
window.tutorialService = new TutorialService(); 