@echo off
chcp 65001 > nul
echo ================================
echo Slack Post Reviewer 初期セットアップ1
echo ================================
echo.

REM Node.jsのバージョン確認
echo [1/4] Node.jsのバージョンを確認中...
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
echo [2/4] pnpmを確認中...
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
echo [3/4] 依存関係をインストール中...
pnpm install
if %errorlevel% neq 0 (
    echo エラー: 依存関係のインストールに失敗しました。
    pause
    exit /b 1
)
echo.

REM mkcertのインストール確認
echo [4/4] mkcertを確認中...
mkcert -version > nul 2>&1
if %errorlevel% neq 0 (
    echo mkcertがインストールされていません。wingetでインストールします...
    winget install FiloSottile.mkcert
    if %errorlevel% neq 0 (
        echo エラー: mkcertのインストールに失敗しました。
        pause
        exit /b 1
    )
    echo.
    echo ================================
    echo インストールが完了しました
    echo ================================
    echo.
    echo PCを再起動してください。
    echo 再起動後、「初期セットアップ2.bat」を実行してください。
    echo.
    pause
    exit /b 0
) else (
    echo mkcert は既にインストールされています。
    mkcert -version
    echo.
    echo ================================
    echo セットアップが完了しました
    echo ================================
    echo.
    echo 次は「初期セットアップ2.bat」を実行してください。
    echo.
    pause
)
