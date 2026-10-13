# Pocketbook 1-click PowerShell launcher
$root = $PSScriptRoot

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "           Starting Pocketbook Application         " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Load .env
Write-Host "1. Loading .env..." -ForegroundColor Yellow
Get-Content "$root\.env" | Where-Object { $_ -match '^\s*[^#].*=.*' } | ForEach-Object {
    $parts = $_ -split '=', 2
    [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), 'Process')
}

# Start Backend in new window
Write-Host "2. Launching Backend (http://localhost:8080)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; `$env:DB_USER='$env:DB_USER'; `$env:DB_PASSWORD='$env:DB_PASSWORD'; `$env:JWT_SECRET='$env:JWT_SECRET'; `$env:CORS_ORIGINS='$env:CORS_ORIGINS'; mvn spring-boot:run"

# Start Frontend in new window
Write-Host "3. Launching Frontend (http://localhost:5500)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; py -m http.server 5500"

# Open browser
Start-Sleep -Seconds 4
Start-Process "http://localhost:5500"

Write-Host "===================================================" -ForegroundColor Green
Write-Host "Pocketbook is up and running!" -ForegroundColor Green
Write-Host "- Frontend: http://localhost:5500" -ForegroundColor Green
Write-Host "- Backend:  http://localhost:8080" -ForegroundColor Green
Write-Host "- Swagger:  http://localhost:8080/swagger-ui.html" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
