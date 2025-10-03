@echo off
chcp 65001 > nul
echo ================================
echo Slack Post Reviewer 初期セットアップ2
echo SSL証明書の生成
echo ================================
echo.

REM mkcertのバージョン確認
echo mkcertのバージョンを確認中...
mkcert -version > nul 2>&1
if %errorlevel% neq 0 (
    echo エラー: mkcertが見つかりません。
    echo.
    echo 以下のいずれかを確認してください:
    echo 1. PCを再起動しましたか？
    echo 2. 「初期セットアップ.bat」を実行しましたか？
    echo.
    pause
    exit /b 1
)
mkcert -version
echo.

REM SSL証明書の生成
echo [1/2] ローカル認証局をインストール中...
mkcert -install
if %errorlevel% neq 0 (
    echo エラー: ローカル認証局のインストールに失敗しました。
    pause
    exit /b 1
)
echo ローカル認証局のインストールが完了しました。
echo.

echo [2/2] localhost用の証明書を生成中...
if exist "localhost.pem" if exist "localhost-key.pem" (
    echo 証明書は既に存在します。スキップします。
    echo.
) else (
    mkcert localhost
    if %errorlevel% neq 0 (
        echo エラー: 証明書の生成に失敗しました。
        pause
        exit /b 1
    )
    echo 証明書の生成が完了しました。
    echo - localhost.pem
    echo - localhost-key.pem
    echo.
)

echo ================================
echo セットアップが完了しました！
echo ================================
echo.
echo 次のステップ:
echo 1. SharePointから .env.local ファイルをダウンロード
echo 2. ダウンロードした .env.local をこのフォルダに配置
echo 3. 「アプリ起動.bat」をダブルクリックしてアプリを起動
echo.
pause
