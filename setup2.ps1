# UTF-8で保存されたPowerShellスクリプト
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Clear-Host
Write-Host "================================"
Write-Host "Slack Post Reviewer 初期セットアップ2"
Write-Host "SSL証明書の生成"
Write-Host "================================"
Write-Host ""

# mkcertのバージョン確認
Write-Host "mkcertのバージョンを確認中..."
try {
    $mkcertVersion = mkcert -version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "エラー: mkcertが見つかりません。"
        Write-Host ""
        Write-Host "以下のいずれかを確認してください:"
        Write-Host "1. PCを再起動しましたか？"
        Write-Host "2. 「初期セットアップ1.bat」を実行しましたか？"
        Write-Host ""
        pause
        exit 1
    }
    Write-Host $mkcertVersion
} catch {
    Write-Host "エラー: mkcertが見つかりません。"
    Write-Host ""
    Write-Host "以下のいずれかを確認してください:"
    Write-Host "1. PCを再起動しましたか？"
    Write-Host "2. 「初期セットアップ1.bat」を実行しましたか？"
    Write-Host ""
    pause
    exit 1
}
Write-Host ""

# SSL証明書の生成
Write-Host "1/2 ローカル認証局をインストール中..."
mkcert -install
if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: ローカル認証局のインストールに失敗しました。"
    pause
    exit 1
}
Write-Host "ローカル認証局のインストールが完了しました。"
Write-Host ""

Write-Host "2/2 localhost用の証明書を生成中..."
if ((Test-Path "localhost.pem") -and (Test-Path "localhost-key.pem")) {
    Write-Host "証明書は既に存在します。スキップします。"
    Write-Host ""
} else {
    mkcert localhost
    if ($LASTEXITCODE -ne 0) {
        Write-Host "エラー: 証明書の生成に失敗しました。"
        pause
        exit 1
    }
    Write-Host "証明書の生成が完了しました。"
    Write-Host "- localhost.pem"
    Write-Host "- localhost-key.pem"
    Write-Host ""
}

Write-Host "================================"
Write-Host "セットアップが完了しました！"
Write-Host "================================"
Write-Host ""
Write-Host "次のステップ:"
Write-Host "1. SharePointから .env.local ファイルをダウンロード"
Write-Host "2. ダウンロードした .env.local をこのフォルダに配置"
Write-Host "3. 「アプリ起動.bat」をダブルクリックしてアプリを起動"
Write-Host ""
