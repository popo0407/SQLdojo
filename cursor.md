## **AI 開発エージェントのためのシステム設計・開発憲章**

この憲章は、将来の技術的負債を最小限に抑え、保守性と拡張性に優れたアプリケーションを継続的に開発するための基本原則を定める。AI エージェントは、すべてのコーディング、機能追加、リファクタリングにおいて、以下のルールを最優先で遵守すること。

### **最上位原則**

- AI の内部思考は**英語**、AI 同士の会話、外部への回答・ドキュメントは**日本語**。
- 開発憲章の全文を確認し開発憲章に従って処理をすること
- 不明点がある場合は、作業開始前に必ず確認を取ること。
- Agent 起動時に`cursor.md`の全体を読み込み、最上位原則を全てチャット上に表示する。
- すべてのタスクが完了したら、以下の原則に反していないかチェックし、確認を取った上で README.md の更新と github への add commit push をすること。
- すべてのタスク完了時には、発生したバグや問題点を振り返り、「なぜ発生したか」「開発憲章に従っていれば防げたか」を必ず自己レビューすること。必要に応じて憲章自体の改善案を検討し、次回以降の品質向上に活かすこと。

### **リスクベースアプローチ：開発速度と品質のバランス**

すべての変更に同じ厳格さを求めるのではなく、変更の**影響範囲とリスク**に応じて手続きの重みを変えることで、開発速度と品質のバランスを最適化する。

#### **高リスク変更：憲章の全ルールを厳密適用**

- **対象**: コアロジック、共有モジュール、設定ファイル、認証システム、データベーススキーマなど、広範囲に影響する変更
- **適用ルール**: 憲章の全ルール（特に影響範囲分析、テスト駆動、段階的移行、ドキュメント更新）を厳密に適用
- **プロセス**: 事前の影響範囲分析、テスト作成、段階的移行計画、詳細なドキュメント更新が必須

#### **中リスク変更：基本原則のみ遵守**

- **対象**: 既存機能のバグ修正、単一 API エンドポイント内のロジック改善、既存サービスの機能拡張など
- **適用ルール**: 「本番機能の保護」「テストの徹底」「差分レビュー」の基本原則を遵守
- **プロセス**: 影響範囲の確認、関連テストの実行、ドキュメント更新が必須

#### **低リスク変更：軽量プロセス**

- **対象**: UI の文言修正、CSS の微調整、コメントの追加、軽微なログ出力の変更など、ロジックに影響しない変更
- **適用ルール**: 基本的な品質チェックのみ
- **プロセス**: `git status`と`git diff`で変更範囲を確認し、セルフレビュー後に直接コミット。PR は不要、もしくは事後報告でも可

### **開発プロセス標準化：品質と効率の両立**

高リスク、中リスクの開発作業は以下の 6 ステッププロセスに従って実行すること：

1. **指示の分析と計画**: 要求を詳細に分析し、実装方針と影響範囲を明確化する
2. **事前協議**: 開発憲章を準拠した実装方針を検討する
   1. consultation.md ファイルを削除
   2. consultation.md ファイルを作成
   3. consultation.md ファイルに以下を記載：
      - 現在の状況
      - 改善要求
      - 検討すべき改善点
      - 実装方針の検討
      - ユーザーに確認すべき不足情報
   4. 新しいターミナルセッションを開始
   5. echo "確認してください"　を実行
   6. consultation.md ファイルの中のユーザーに確認すべき不足情報に記載された内容を復唱。ここにユーザー回答が記載されている
3. **方針決定**: ユーザーからの回答を考慮して改善方針を決定する
4. **段階的実装**: 小さな単位で実装し、各段階でテストを行う
5. **問題特定と修正**: テストで発見した問題を体系的に分析し、ログで検証して根本原因を特定して修正する
6. **振り返りと改善**: 完了後は発生した問題を分析し、憲章の改善案を検討する

このプロセスにより、品質の一貫性を保ちながら開発速度を最適化する。

---

### I. 基本設計原則：すべてのコードの礎

1.  **単一責任の原則 (Single Responsibility Principle - SRP) を徹底せよ**

    - **Do**: 1 つのクラス、1 つの関数には、1 つの明確な役割だけを持たせること。
    - **Don't**: API 通信、データ処理、UI 更新など、複数の役割を 1 つの巨大なクラス（God Object）に詰め込まないこと。クラスのコードが 500 行を超える場合、それは責務が多すぎる兆候である。

2.  **関心の分離 (Separation of Concerns - SoC) を意識せよ**

    - **Do**: アプリケーションを、プレゼンテーション層（UI）、ビジネスロジック層（Service）、データアクセス層（Repository）といった、関心事の異なるレイヤーに明確に分割すること。
    - **Don't**: データベースへのクエリ（データアクセス層）を、HTML テンプレートを描画するコード（プレゼンテーション層）の中に直接記述しないこと。

3.  **繰り返しを避ける (Don't Repeat Yourself - DRY) ことを心掛けよ**

    - **Do**: 複数の場所で同じコードブロックが出現した場合、それを共通の関数やクラスに括り出し、再利用可能な形にリファクタリングすること。
    - **Don't**: 同じようなコードをコピー＆ペーストで使い回さないこと。それは将来の修正漏れやバグの温床となる。

4.  **設定とロジックを分離せよ**

    - **Do**: データベース接続情報、API キー、環境変数といった設定値は、コードから分離された設定ファイル（例：`.env`, `config.py`）で管理すること。
    - **Don't**: コード内に、本番環境のパスワードや開発環境の URL といった、環境に依存する値をハードコーディングしないこと。

5.  **変更は、関連する全てのコンポーネントで一貫性を保て**
    - **Do**: 一つの機能変更やリファクタリングを行う際は、その影響が及ぶすべての範囲（ロジック、データベーススキーマ、API 定義、テストコード）を特定し、一度のコミットで全ての整合性が取れた状態にすること。
    - **Don't**: アプリケーションロジックだけを先に変更し、データベーススキーマやテストコードの修正を後回しにしないこと。それは不整合な状態を生み出し、エラーの直接的な原因となる。

### II. フロントエンドの規約：ユーザー体験と保守性の両立

5.  **コンポーネントベースで UI を構築せよ**

    - **Do**: UI を再利用可能な独立した部品（コンポーネント）の集合として設計すること。サイドバー、結果テーブル、ボタン群などは、それぞれが自己完結したコンポーネントであるべき。
    - **Don't**: すべての UI 要素を一つの巨大な HTML ファイルにフラットに記述しないこと。

6.  **状態管理を一元化せよ**

    - **Do**: アプリケーション全体で共有される状態（例: ユーザー情報、API から取得したデータ）は、単一のストア（StateService など）で管理すること。状態の変更は、必ず定義された手順（Action や Mutation）を経て行う。
    - **Don't**: 状態を各コンポーネントのプロパティとして散在させないこと。コンポーネントは、ストアから状態を受け取って表示することに専念し、直接状態を書き換えないこと。

7.  **UI の状態管理をコンポーネントに閉じてカプセル化せよ**

    - **Do**: UI の表示状態（例：モーダルの開閉、タブの選択状態）は、可能な限りその UI を管理するコンポーネントの内部状態として保持すること。
    - **Don't**: グローバルなスコープに、あらゆる UI の状態を持つ巨大な JavaScript オブジェクトを作成しないこと。それは状態の変更追跡を困難にする。

8.  **ビジネスロジックと DOM 操作を分離せよ**

    - **Do**: DOM を直接操作するコードは、専用の UI サービスまたはコンポーネント内に閉じ込めること。ビジネスロジックは「データを更新する」ことだけを考え、UI サービスがそのデータ変更を検知して画面を再描画する、というデータ駆動の設計を心掛けること。
    - **Don't**: ビジネスロジックの関数内から `document.getElementById(...)` などを呼び出さないこと。

9.  **クライアントサイド・キャッシュを積極的に活用し、体感速度とサーバー負荷を改善せよ**

    - **Do**: 頻繁に参照されるがリアルタイム性が必須ではないデータ（例：操作履歴、マスターデータ）は、`sessionStorage`や`localStorage`といったブラウザのキャッシュ機能を活用すること。ページ読み込み時はまずキャッシュから表示し、ユーザーの明示的な操作（例：「更新」ボタン）によってサーバーから最新データを取得するアーキテクチャを基本とせよ。
    - **Don't**: ユーザー体験を損なうほど頻繁に、サーバーへのデータ取得リクエストを自動的に発行しないこと。

10. **ユーザビリティを最優先に設計せよ**
    - **Do**:
      - エラーメッセージは具体的で分かりやすく、解決方法を含めること（例：「WHERE 句が必要です。大量データの取得を防ぐため、条件を指定してください。例: WHERE column_name = 'value'」）
      - 成功メッセージは、ユーザーが見た目で成功がわかる場合は表示しないこと（SQL 実行、テンプレート反映など）
      - 通知の色は目に優しく、エラーは淡い色を使用すること
      - 通知は即座に消去できるようにし、不要な遅延を避けること
      - ユーザーの操作結果は視覚的に明確にフィードバックすること
    - **Don't**:
      - 技術的なエラーメッセージをそのまま表示しないこと
      - 不要な成功メッセージでユーザーを煩わせないこと
      - 目に痛い色や過度に目立つ通知を使用しないこと
      - 通知の消去に時間がかかりすぎる実装を避けること

### III. バックエンドの規約：堅牢性と拡張性の確保

11. **依存性注入 (DI) を徹底し、レイヤーを疎結合に保て**

    - **Do**: 上位レイヤーは、下位レイヤーの具体的な実装ではなく、抽象（インターフェースや基底クラス）に依存すること。依存関係は、コンストラクタや FastAPI の`Depends`のようなフレームワークの機能を通じて外部から注入する。
    - **Don't**: Service クラスの内部で、Repository クラスを直接 `new` (インスタンス化) しないこと。

12. **サービスの責務を厳格に定義せよ**

    - **Do**:
      - **API 層 (Controller/Router)**: HTTP リクエストを受け取り、バリデーションを行い、適切な Service を呼び出して、結果を HTTP レスポンスとして返すことだけに責任を持つ。
      - **ビジネスロジック層 (Service)**: アプリケーション固有のルールやデータ処理フローを実装する。複数のデータアクセス処理を組み合わせることもある。
      - **データアクセス層 (Repository/DAO)**: データベースや外部 API との具体的なやり取りのみを担当する。
    - **Don't**: API 層にビジネスロジックを書かないこと。Service 層に DB 接続の詳細を書かないこと。

13. **モジュールは機能単位で分割せよ**

    - **Do**: `routes.py` が肥大化しないよう、関連する API エンドポイントは `APIRouter` を使って機能ごと（例: `user_routes.py`, `template_routes.py`）にファイルを分割すること。Service や Repository も同様に分割する。
    - **Don't**: すべての機能を単一のファイルに詰め込まないこと。

14. **複数の責務を束ねる統括サービス（Facade）で、ビジネスロジックを抽象化せよ**

    - **Do**: 「システム全体をリフレッシュする」のように、ビジネス上の一つの操作が複数の下位サービス（例：`UserService`, `MetadataService`）の呼び出しを必要とする場合、それらを統括する上位のサービス（例：`AdminService`）を設けること。API 層はこの統括サービスにのみ依存させ、ロジックの複雑性を隠蔽し、拡張性を確保せよ。
    - **Don't**: API のルート関数内で、複数のサービスクラスを呼び出して複雑な処理フローを組み立てないこと。その処理フロー自体が、統括サービスが担うべきビジネスロジックである。

15. **ログは階層と目的を意識し、意図を持って記録せよ**
    - **Do**: ログのレベル（INFO, DEBUG 等）を、その情報が誰にとって、いつ必要かに基づいて使い分けること。
      - **INFO**: ユーザーの操作や API リクエストなど、ビジネスレベルの大きな処理単位の開始と完了を示すために使う。原則として、その処理を統括する最上位のサービス（統括サービス）が、要約された最終結果を記録する。
      - **DEBUG**: 開発者が処理の流れを追跡するための、システム内部の具体的なステップや途中経過を示すために使う。下位のサービスやデータアクセス層はこちらを主に使用する。
    - **Don't**: あらゆる階層から無秩序に INFO レベルのログを出力しないこと。それはログの可読性を著しく低下させ、本当に重要な情報を見失う原因となる。関数は処理結果（件数など）をログに出すのではなく、戻り値として返し、ログに出力するかの判断は呼び出し元に委ねること。

### IV. テストと品質の規約：未来の自分を助けるために

16. **テスト容易性を意識して設計せよ**

    - **Do**: 関数はできるだけ副作用のない純粋関数として設計すること。クラスの依存関係は外部から注入できるようにし、テスト時には簡単にモックに差し替えられるように設計すること。
    - **Don't**: テストが困難な、密結合で巨大な関数やクラスを作成しないこと。

17. **テストコードにも DRY 原則を適用せよ**

    - **Do**: 複数のテストで共通するセットアップ処理（例: テスト用データの作成、DB 接続のモック化）は、テストフレームワークの共通化機能（例: `pytest` の `fixture`）に括り出すこと。
    - **Don't**: すべてのテストケースに同じようなセットアップコードをコピー＆ペーストしないこと。

18. **例外・エラー時の安全なフォールバックとユーザー確認**
    - **Do**: 設定が壊れている・DB が空など異常系でも安全なデフォルト動作（例：全員に見せる or 全員に見せない）を保証すること。
    - **Do**: エラーや例外時の動作が明確でない場合は、必ずユーザーに確認・問いかけて方針を決めること。
    - **Don't**: 異常系で勝手に危険なデフォルト（例：全データ公開など）にせず、必ずユーザーの意図を確認すること。

#### V. リファクタリングの規約：安全なコード進化のために

19. **本番機能の絶対保護を最優先とせよ**

    - **Do**: リファクタリングは、既存の本番機能の動作を完全に維持したまま行うこと。モックや仮実装は、テストコード内に厳密に隔離すること。
    - **Don't**: リファクタリングの過程で、本番コードを直接コメントアウトしたり、削除したり、モックに差し替えたりしないこと。承認なく本番の振る舞いを変更しないこと。

20. **テストによる振る舞いの保証を徹底せよ**

    - **Do**: リファクタリング対象の振る舞いを検証するテストを事前に作成・確認すること。リファクタリング後は、そのテストがすべて成功することを必ず検証すること。
    - **Don't**: 感覚や手動確認だけに頼らないこと。テストがない状態で、振る舞いが維持されていると楽観的に判断しないこと。

21. **影響範囲の徹底的な特定と管理を怠るな**

    - **Do**: 変更に着手する前に、クラス、関数、変数など、変更対象が参照されている箇所をすべて（テストコードも含め）洗い出すこと。洗い出したすべての箇所を矛盾なく修正すること。
    - **Don't**: 一箇所だけ見て修正を完了したと判断しないこと。import 文や型アノテーションの修正漏れがないか確認を怠らないこと。

22. **変更は小さく、段階的に進めよ**

    - **Do**: 大きなリファクタリングは、意味のある小さな単位に分割し、コミットやプルリクエストを分けること。各ステップで動作確認とレビューを実施すること。
    - **Don't**: 数百行にわたる変更を一度のコミットに含めないこと。それはレビューの質を低下させ、問題の切り分けを困難にする。

23. **後方互換性を意識した段階的移行を計画せよ**

    - **Do**: 既存の機能（API、クラス等）を置き換える際は、まず新しい機能を追加し、両者が並行稼働する期間を設けること。すべての呼び出し元が新しい機能へ移行したことを確認した上で、古い機能を削除すること。
    - **Don't**: 呼び出し元の修正が完了する前に、既存の機能をいきなり削除・変更しないこと。

24. **設定変更は環境の互換性を維持せよ**

    - **Do**: 設定クラスや環境変数を変更する際は、既存の `.env` ファイルでもシステムがエラーなく起動するように、エイリアスやデフォルト値、`extra="ignore"`などを活用して互換性を保つこと。
    - **Don't**: 新しい環境変数名を必須とし、古い環境の起動を妨げるような変更をいきなり加えないこと。`env.example`の更新を忘れないこと。

25. **変更の意図と結果を明確に記録せよ**

    - **Do**: なぜそのリファクタリングが必要だったのか、どのような変更を行ったのかを、コミットメッセージやプルリクエスト、関連ドキュメントに明確に記述すること。
    - **Don't**: 「修正」「リファクタリング」といった曖昧なメッセージだけで変更を記録しないこと。未来の開発者が意図を理解できないような記録を残さないこと。

26. **異常発生時は即座にロールバックせよ**
    - **Do**: リファクタリング中に予期せぬエラーが発生した場合や、テストが失敗した場合は、即座に作業を中断し、変更を元に戻す（ロールバックする）こと。原因究明はその後に落ち着いて行うこと。
    - **Don't**: 問題が発生した状態で、場当たり的な修正を重ねて突き進まないこと。不安定な状態を放置しないこと。

---

# ショートカットエイリアス

- `/ask`: ユーザーがポリシーに関する相談を求めている場合。多角的な分析を含む積極的な回答を提供してください。明確な指示がない限り、相談中にタスクを実行しないでください。
- `/plan`: 作業計画を明確かつ詳細に概説し、相違点がないことを確認してください。合意に達した後にのみ実行に移ってください。
- `/debug`: バグの根本原因を特定します。5〜7 つの可能性のある原因をリストアップし、1〜2 つに絞り込みます。修正を適用する前に、ログを使用して仮説を検証してください。
- `/cmt`: コードの意図を明確にするために、適切なコメントとドキュメントを追加します。既存のコード形式に従ってください。
- `/log`: 適切なログレベルを考慮し、必要な情報のみを記録します。ログは簡潔に設計し、冗長性を避けてください。既存のコード形式に従ってください。
