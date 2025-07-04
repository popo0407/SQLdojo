## 1\. 最上位原則

| \#     | ルール                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------ |
| **1** | **思考と言語の切り分け** ― AIの内部思考は**英語**、外部への回答・ドキュメントは**日本語**。                                   |
| **2** | **絵文字禁止** ― コード、ドキュメント、コミットメッセージすべてで使用しない。                                                 |
| **3** | **不要な空白を作らない** ― 特に日本語と英語の間に余計な全角・半角スペースを入れない。                                         |
| **4** | **指令を忘れない** ― Agent起動時に`cursor.md`の全体を読み込み、最上位原則を全てチャット上に表示する。                               |

---

### **AI開発エージェントのためのシステム設計・開発憲章**

この憲章は、将来の技術的負債を最小限に抑え、保守性と拡張性に優れたアプリケーションを継続的に開発するための基本原則を定める。AIエージェントは、すべてのコーディング、機能追加、リファクタリングにおいて、以下のルールを最優先で遵守すること。

#### I. 基本設計原則：すべてのコードの礎

1.  **単一責任の原則 (Single Responsibility Principle - SRP) を徹底せよ**
    * **Do**: 1つのクラス、1つの関数には、1つの明確な役割だけを持たせること。
    * **Don't**: API通信、データ処理、UI更新など、複数の役割を1つの巨大なクラス（God Object）に詰め込まないこと。クラスのコードが500行を超えそうな場合は、分割を検討する最初のサインと見なせ。

2.  **関心の分離 (Separation of Concerns - SoC) を維持せよ**
    * **Do**: アプリケーションを明確なレイヤー（層）に分割すること。
        * **フロントエンド**: 構造(HTML)、振る舞い(JavaScript)、見た目(CSS)を完全に分離する。
        * **バックエンド**: API層(Controller)、ビジネスロジック層(Service)、データアクセス層(Repository)を明確に分ける。
    * **Don't**: ビジネスロジックの中にDOM操作や直接的なSQLクエリを記述しないこと。HTMLファイル内に複雑なスクリプトを埋め込まないこと。

3.  **DRY (Don't Repeat Yourself) の原則を遵守せよ**
    * **Do**: 2回以上同じコードブロックが登場した場合、それは共通化のサインである。すぐに関数やクラス、コンポーネントとして切り出し、再利用可能な形にすること。
    * **Don't**: コピー＆ペーストによるコーディングをしないこと。

#### II. フロントエンドの規約：ユーザー体験と保守性の両立

4.  **コンポーネントベースでUIを構築せよ**
    * **Do**: UIを再利用可能な独立した部品（コンポーネント）の集合として設計すること。サイドバー、結果テーブル、ボタン群などは、それぞれが自己完結したコンポーネントであるべき。
    * **Don't**: すべてのUI要素を一つの巨大なHTMLファイルにフラットに記述しないこと。

5.  **状態管理を一元化せよ**
    * **Do**: アプリケーション全体で共有される状態（例: ユーザー情報、APIから取得したデータ）は、単一のストア（StateServiceなど）で管理すること。状態の変更は、必ず定義された手順（ActionやMutation）を経て行う。
    * **Don't**: 状態を各コンポーネントのプロパティとして散在させないこと。コンポーネントは、ストアから状態を受け取って表示することに専念し、直接状態を書き換えないこと。

6.  **DOM操作を抽象化せよ**
    * **Do**: DOMを直接操作するコードは、専用のUIサービスまたはコンポーネント内に閉じ込めること。ビジネスロジックは「データを更新する」ことだけを考え、UIサービスがそのデータ変更を検知して画面を再描画する、というデータ駆動の設計を心掛けること。
    * **Don't**: ビジネスロジックの関数内から `document.getElementById(...)` などを呼び出さないこと。

#### III. バックエンドの規約：堅牢性と拡張性の確保

7.  **依存性注入 (DI) を徹底し、レイヤーを疎結合に保て**
    * **Do**: 上位レイヤーは、下位レイヤーの具体的な実装ではなく、抽象（インターフェースや基底クラス）に依存すること。依存関係は、コンストラクタやFastAPIの`Depends`のようなフレームワークの機能を通じて外部から注入する。
    * **Don't**: Serviceクラスの内部で、Repositoryクラスを直接 `new` (インスタンス化) しないこと。

8.  **サービスの責務を厳格に定義せよ**
    * **Do**:
        * **API層 (Controller/Router)**: HTTPリクエストを受け取り、バリデーションを行い、適切なServiceを呼び出して、結果をHTTPレスポンスとして返すことだけに責任を持つ。
        * **ビジネスロジック層 (Service)**: アプリケーション固有のルールやデータ処理フローを実装する。複数のデータアクセス処理を組み合わせることもある。
        * **データアクセス層 (Repository/DAO)**: データベースや外部APIとの具体的なやり取りのみを担当する。
    * **Don't**: API層にビジネスロジックを書かないこと。Service層にDB接続の詳細を書かないこと。

9.  **モジュールは機能単位で分割せよ**
    * **Do**: `routes.py` が肥大化しないよう、関連するAPIエンドポイントは `APIRouter` を使って機能ごと（例: `user_routes.py`, `template_routes.py`）にファイルを分割すること。ServiceやRepositoryも同様に分割する。
    * **Don't**: すべての機能を単一のファイルに詰め込まないこと。

#### IV. テストと品質の規約：未来の自分を助けるために

10. **テスト容易性を意識して設計せよ**
    * **Do**: 関数はできるだけ副作用のない純粋関数として設計すること。クラスの依存関係は外部から注入できるようにし、テスト時には簡単にモックに差し替えられるように設計すること。
    * **Don't**: テストが困難な、密結合で巨大な関数やクラスを作成しないこと。

11. **テストコードにもDRY原則を適用せよ**
    * **Do**: 複数のテストで共通するセットアップ処理（例: テスト用データの作成、DB接続のモック化）は、テストフレームワークの共通化機能（例: `pytest` の `fixture`）に括り出すこと。
    * **Don't**: すべてのテストケースに同じようなセットアップコードをコピー＆ペーストしないこと。

---
