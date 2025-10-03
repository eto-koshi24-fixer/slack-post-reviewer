# UTF-8で保存されたPowerShellスクリプト
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Clear-Host
Write-Host "================================"
Write-Host "Slack Post Reviewer 起動中..."
Write-Host "================================"
Write-Host ""

# pnpmの確認
try {
    $null = pnpm --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "エラー: pnpmがインストールされていません。"
        Write-Host "先に「初期セットアップ1.bat」を実行してください。"
        pause
        exit 1
    }
} catch {
    Write-Host "エラー: pnpmがインストールされていません。"
    Write-Host "先に「初期セットアップ1.bat」を実行してください。"
    pause
    exit 1
}

# ポート3000を使用中のプロセスを強制終了
Write-Host "ポート3000の使用状況を確認中..."
$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) {
    Write-Host "ポート3000を使用中のプロセス (PID: $process) を終了します..."
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "プロセスを終了しました。"
    Write-Host ""
}

# アプリケーションを起動
Write-Host ""
Write-Host "アプリケーションを起動しています..."
Write-Host "サーバーが起動したらブラウザで https://localhost:3000 が開きます。"
Write-Host ""
Write-Host "終了するには Ctrl+C を押してください。"
Write-Host "================================"
Write-Host ""

# バックグラウンドでpnpm devを実行し、出力を監視
$browserOpened = $false
pnpm dev | ForEach-Object {
    Write-Host $_
    if ($_ -match "Ready on" -and -not $browserOpened) {
        Start-Process "https://localhost:3000"
        $browserOpened = $true
    }
}
