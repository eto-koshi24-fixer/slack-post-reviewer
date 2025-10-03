@echo off
chcp 65001 > nul
echo ================================
echo Slack Post Reviewer 起動中...
echo ================================
echo.

REM pnpmの確認
pnpm --version > nul 2>&1
if %errorlevel% neq 0 (
    echo エラー: pnpmがインストールされていません。
    echo 先に「初期セットアップ.bat」を実行してください。
    pause
    exit /b 1
)

REM ブラウザを開く（5秒後）
echo ブラウザを5秒後に自動起動します...
start "" cmd /c "timeout /t 5 /nobreak > nul && start https://localhost:3000"

REM アプリケーションを起動
echo.
echo アプリケーションを起動しています...
echo ブラウザで https://localhost:3000 が開きます。
echo.
echo 終了するには Ctrl+C を押してください。
echo ================================
echo.

pnpm run dev
