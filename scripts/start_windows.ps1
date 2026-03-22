$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

docker compose up -d --build

Write-Output "Server started at http://localhost:8000"
