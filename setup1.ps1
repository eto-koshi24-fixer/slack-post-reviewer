# UTF-8で保存されたPowerShellスクリプト
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Clear-Host
Write-Host "================================"
Write-Host "Slack Post Reviewer 初期セットアップ1"
Write-Host "================================"
Write-Host ""

# Node.jsのバージョン確認
Write-Host "1/4 Node.jsのバージョンを確認中..."
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Host $nodeVersion
} catch {
    Write-Host "エラー: Node.jsがインストールされていません。"
    Write-Host "https://nodejs.org/ からNode.jsをインストールしてください。"
    pause
    exit 1
}
Write-Host ""

# pnpmのインストール確認
Write-Host "2/4 pnpmを確認中..."
try {
    $pnpmVersion = pnpm --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "pnpmがインストールされていません。インストールを開始します..."
        npm install -g pnpm
        if ($LASTEXITCODE -ne 0) { throw "pnpmのインストールに失敗しました" }
        $pnpmVersion = pnpm --version
    }
    Write-Host $pnpmVersion
} catch {
    Write-Host "エラー: $_"
    pause
    exit 1
}
Write-Host ""

# 依存関係のインストール
Write-Host "3/4 依存関係をインストール中..."
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: 依存関係のインストールに失敗しました。"
    pause
    exit 1
}
Write-Host ""

# mkcertのインストール確認
Write-Host "4/4 mkcertを確認中..."
try {
    $mkcertVersion = mkcert -version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "mkcertがインストールされていません。wingetでインストールします..."
        winget install FiloSottile.mkcert
        if ($LASTEXITCODE -ne 0) { throw "mkcertのインストールに失敗しました" }
        Write-Host ""
        Write-Host "================================"
        Write-Host "インストールが完了しました"
        Write-Host "================================"
        Write-Host ""
        Write-Host "PCを再起動してください。"
        Write-Host "再起動後、「初期セットアップ2.bat」を実行してください。"
        Write-Host ""
        pause
        exit 0
    } else {
        Write-Host "mkcert は既にインストールされています。"
        mkcert -version
        Write-Host ""
        Write-Host "================================"
        Write-Host "セットアップが完了しました"
        Write-Host "================================"
        Write-Host ""
        Write-Host "次は「初期セットアップ2.bat」を実行してください。"
        Write-Host ""
    }
} catch {
    Write-Host "エラー: $_"
    pause
    exit 1
}
