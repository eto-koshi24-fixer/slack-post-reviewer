@echo off
chcp 65001 > nul
echo ================================
echo Slack Post Reviewer 初期セットアップ
echo ================================
echo.

REM Node.jsのバージョン確認
echo [1/3] Node.jsのバージョンを確認中...
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo エラー: Node.jsがインストールされていません。
    echo https://nodejs.org/ からNode.jsをインストールしてください。
    pause
    exit /b 1
)
node --version
echo.

REM pnpmのインストール確認
echo [2/3] pnpmを確認中...
pnpm --version > nul 2>&1
if %errorlevel% neq 0 (
    echo pnpmがインストールされていません。インストールを開始します...
    npm install -g pnpm
    if %errorlevel% neq 0 (
        echo エラー: pnpmのインストールに失敗しました。
        pause
        exit /b 1
    )
)
pnpm --version
echo.

REM 依存関係のインストール
echo [3/3] 依存関係をインストール中...
pnpm install
if %errorlevel% neq 0 (
    echo エラー: 依存関係のインストールに失敗しました。
    pause
    exit /b 1
)
echo.

echo ================================
echo セットアップが完了しました！
echo ================================
echo.
echo 次は「アプリ起動.bat」をダブルクリックして
echo アプリケーションを起動してください。
echo.
pause
