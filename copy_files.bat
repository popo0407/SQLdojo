@echo off
setlocal

:: バッチファイルがあるディレクトリを取得
set "CURRENT_DIR=%~dp0"

:: 出力先ディレクトリ（一つ上の階層に "SQLdojo_copy" フォルダを作成）
set "OUTPUT_DIR=%CURRENT_DIR%..\SQLdojo_copy"

:: コピー元ディレクトリ
set "SOURCE_DIR=%CURRENT_DIR%"

echo SQLdojo_copy フォルダにファイルをコピー中...
echo 出力先: %OUTPUT_DIR%

:: 出力ディレクトリが存在する場合は削除
if exist "%OUTPUT_DIR%" (
    echo 既存の SQLdojo_copy フォルダを削除中...
    rmdir /s /q "%OUTPUT_DIR%"
)

:: 出力ディレクトリを作成
mkdir "%OUTPUT_DIR%"

:: xcopy を使用してファイルをコピー（.gitignore パターンに基づいて除外）
:: 必要なファイルのみをコピー（除外フォルダを指定）
xcopy "%SOURCE_DIR%\*" "%OUTPUT_DIR%\" /E /I /Y /EXCLUDE:exclusions.txt

:: 追加で個別ファイルを削除（念のため）
echo 追加クリーンアップ中...
del /s /q "%OUTPUT_DIR%\*.pyc" 2>nul
del /s /q "%OUTPUT_DIR%\*.log" 2>nul
del /s /q "%OUTPUT_DIR%\*.db" 2>nul
del /s /q "%OUTPUT_DIR%\*.db-journal" 2>nul
del /q "%OUTPUT_DIR%\.env*" 2>nul

:: xcopy の終了コードを確認
if %errorlevel% equ 0 (
    echo.
    echo ✓ ファイルのコピーが完了しました！
    echo 出力先: %OUTPUT_DIR%
    echo.
    echo 除外されたファイル/フォルダ:
    echo - node_modules/, __pycache__/, .git/, logs/ などのキャッシュフォルダ
    echo - *.pyc, *.log, *.db などのビルド成果物・ログファイル
    echo - .env, app.log などの環境・ログファイル
) else (
    echo.
    echo ✗ コピー中にエラーが発生しました
    echo エラーコード: %errorlevel%
)

pause
