はい、承知いたしました。
これまでの全手順と、お客様自身で解決されたコードベースの対策、そして新たにご質問いただいた「設定の外部化」と「HTTPS化」に関する説明をすべて統合し、**完全版となるデプロイ手順書**として、改めてマークダウン形式でまとめます。

-----

### **【最終確定版 Ver.2】FastAPI + IIS + NSSM デプロイ手順備忘録**

この手順書は、FastAPIアプリケーションをIISのリバースプロキシ環境下で安定稼働させるための、アプリケーションコードの修正やHTTPS化への対応を含む、完全なガイドです。

#### 1\. サーバー環境の準備

##### 1-1. IISと関連コンポーネントのインストール

1.  「Windows の機能の有効化または無効化」を開きます。
2.  「インターネット インフォメーション サービス」を有効化します。
3.  ツリーを展開し、以下の項目にもチェックを入れてインストールします。
      * `インターネット インフォメーション サービス` -\> `World Wide Web サービス` -\> `アプリケーション開発機能` -\> **`CGI`**
      * `インターネット インフォメーション サービス` -\> `World Wide Web サービス` -\> `正常性と診断` -\> **`トレース`**

##### 1-2. 追加モジュールのインストール

以下のモジュールをダウンロードし、インストールします。

  * **URL Rewrite Module**: [Microsoft公式ダウンロードページ](https://www.iis.net/downloads/microsoft/url-rewrite)
  * **Application Request Routing (ARR)**: [Microsoft公式ダウンロードページ](https://www.iis.net/downloads/microsoft/application-request-routing)

##### 1-3. Python環境の準備

1.  サーバーにPythonをインストールします。
2.  アプリケーションの全ファイルを、サーバー上の公開用フォルダ（例: `C:\inetpub\wwwroot\SQLdojo`）にコピーします。
3.  コマンドプロンプトでそのフォルダに移動し、必要なライブラリをインストールします。
    ```cmd
    pip install -r requirements.txt
    ```

-----

#### 2\. アプリケーションの準備とコード修正

##### 2-1. `.env` ファイルによる設定の外部化（重要）

このアプリケーションでは、サーバーのIPアドレスやURLといった環境依存の情報を、プログラムのコード内に直接書き込む（ハードコーディングする）ことを避けています。すべての環境設定は、アプリケーションのルートフォルダにある **`.env`** ファイルに集約されます。

  * **目的**: セキュリティとメンテナンス性を向上させます。将来サーバーのアドレスが変更になっても、プログラム本体を修正することなく、`.env` ファイルを一行修正するだけで対応が完了します。

  * **設定**: `.env` ファイル（なければ作成）に、ブラウザからアクセスする際の**サーバーの公開URL**を定義します。

    ```ini
    # .env ファイル
    # (他の設定...)
    PUBLIC_SERVER_URL=http://<サーバーの公開IP>:<ポート>
    # 例: PUBLIC_SERVER_URL=http://10.166.96.135:8080
    ```

##### 2-2. アプリケーションコードの修正

上記の`.env`設定をアプリケーションに認識させるため、以下のコード修正を行います。

1.  **`app/config.py` の修正**:
    `Settings` クラスに`PUBLIC_SERVER_URL`を読み込むフィールドを追加します。

    ```python
    class Settings(BaseSettings):
        # ... (他の設定)
        PUBLIC_SERVER_URL: Optional[str] = Field(default=None)
    ```

2.  **`app/main.py` の修正**:
    リクエストを受け取るたびに、URL生成の基準となるサーバー情報を、`.env`で設定した正しい公開URLで上書きするための**カスタムミドルウェア**を実装し、`root`関数も修正します。

    ```python
    # ... (他のimport)
    from starlette.datastructures import URL
    from app.config import settings

    # ... (FastAPIのappインスタンス作成の後)

    @app.middleware("http")
    async def force_url_middleware(request: Request, call_next):
        # ... (ミドルウェアの実装)

    @app.get("/")
    async def root(request: Request):
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "public_server_url": settings.PUBLIC_SERVER_URL}
        )
    ```

3.  **`app/templates/index.html` の修正**:
    テンプレートが`public_server_url`変数を使ってJavaScriptファイルのURLを正しく生成するように修正します。

    ```html
    {% block extra_js %}
        {% if public_server_url %}
            <script src="{{ public_server_url }}/static/js/app.js"></script>
        {% else %}
            <script src="{{ url_for('static', path='js/app.js') }}"></script>
        {% endif %}
    {% endblock %}
    ```

-----

#### 3\. IISの設定

##### 3-1. サイトとアプリケーションプールの作成

1.  IISマネージャーで新しいWebサイト（例: `SQLdojo`）を作成します。
2.  **物理パス**: `C:\inetpub\wwwroot\SQLdojo` を指定します。
3.  **ポート**: `8080` など、外部に公開するHTTP用のポートを指定します。

##### 3-2. `web.config` の作成

アプリケーションのルートフォルダに、以下の内容で`web.config`ファイルを作成します。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="ReverseProxy" stopProcessing="true">
                    <match url="(.*)" />
                    <action type="Rewrite" url="http://127.0.0.1:8001/{R:1}" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
```

##### 3-3. ARRプロキシの有効化

1.  IISマネージャーで**サーバー名のノード**を選択します。
2.  「Application Request Routing Cache」→「Server Proxy Settings...」を開きます。
3.  \*\*「Enable proxy」\*\*にチェックを入れ、「適用」をクリックします。

-----

#### 4\. 権限の設定

##### 4-1. アプリケーションフォルダへの権限付与

1.  アプリケーションのルートフォルダ（`C:\inetpub\wwwroot\SQLdojo`）の「プロパティ」→「セキュリティ」タブを開きます。
2.  `IIS APPPOOL\SQLdojo` というユーザーを追加し（場所の指定に注意）、\*\*「フルコントロール」\*\*を許可します。

-----

#### 5\. Windowsサービスとしての自動起動設定 (NSSM)

##### 5-1. NSSMでサービスを登録・設定

1.  管理者コマンドプロンプトで `nssm install SQLdojo` を実行します。
2.  **`Application` タブ**を以下のように設定します。
      * **Path**: `python.exe`のフルパス（例: `C:\Python39\python.exe`）
      * **Startup directory**: `C:\inetpub\w`
      * **Arguments**: `-m uvicorn app.main:app --host 127.0.0.1 --port 8001`

##### 5-2. サービスの開始

1.  「Install service」をクリックして登録します。
2.  Windowsのサービス管理画面（`services.msc`）から、作成したサービス（`SQLdojo`）を開始します。

-----

#### 6\. 【オプション】HTTPS化への対応

はい、HTTPSで発行することは可能です。
HTTPS化の対応は、主にフロントに立つWebサーバー（今回はIIS）で行うのが一般的で、推奨される構成です。FastAPIアプリケーション側での変更は、ごく僅かで済みます。
HTTPS化を実現するための大まかな手順は以下の通りです。

##### 6-1. SSL証明書の準備

サーバーのドメイン名またはIPアドレスに対応するSSL証明書を入手します。（認証局から発行されたもの、またはテスト用であれば自己署名証明書など）

##### 6-2. IISへの証明書のインストールと「バインド」設定

1.  入手したSSL証明書をWindows Serverにインストールします。
2.  IISマネージャーを開き、対象のWebサイトの「バインド」設定で、新しい「**https**」用のバインドを追加します。
3.  このとき、ポートを **443**（HTTPSの標準ポート）に設定し、インストールしたSSL証明書を選択します。

##### 6-3. ファイアウォールの設定

サーバーのファイアウォールで、HTTPSのポート（例: 443）への外部からのアクセスを許可します。

##### 6-4. FastAPIアプリケーションの設定変更（この作業のみでOKです）

手順は1つだけです。プロジェクトの `.env` ファイルを開き、`PUBLIC_SERVER_URL` のプロトコルを `http` から `https` に変更します。ポート番号もIISのバインド設定に合わせます。

**【修正前】**

```
PUBLIC_SERVER_URL=http://10.166.96.135:8080
```

**【修正後 (例: 443ポートを使う場合)】**

```
PUBLIC_SERVER_URL=https://10.166.96.135:443
```

*(もしポート443を使い、URLからポート番号を省略する場合は `https://10.166.96.135` のように設定します)*

この `.env` ファイルのURLを一行変更するだけで、前回実装したミドルウェアが自動的に `https` であることを認識し、アプリケーション全体で生成されるURLが正しくHTTPSに対応します。アプリケーションのPythonコードを再度変更する必要はありません。