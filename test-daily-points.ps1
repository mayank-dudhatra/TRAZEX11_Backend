# Daily Stock Points - Test Script
# Run this after starting the backend server

Write-Host "=== Daily Stock Points Test Suite ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:3001"
$adminToken = Read-Host "Enter Admin JWT Token"

$headers = @{
    "Authorization" = "Bearer $adminToken"
    "Content-Type" = "application/json"
}

# Test 1: Manual Reset
Write-Host "[Test 1] Triggering manual daily reset..." -ForegroundColor Yellow
try {
    $resetResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/stocks/reset-daily-points" -Method POST -Headers $headers
    Write-Host "✓ Reset successful: $($resetResponse.data.count) stocks reset" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ Reset failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Wait for updates to process
Write-Host "Waiting 10 seconds for stock updates..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test 2: Get Score Breakdown for a few stocks
$testSymbols = @("RELIANCE.NS", "TCS.NS", "INFY.NS")

foreach ($symbol in $testSymbols) {
    Write-Host "[Test 2] Getting score breakdown for $symbol..." -ForegroundColor Yellow
    try {
        $breakdown = Invoke-RestMethod -Uri "$baseUrl/api/admin/stocks/$symbol/score-breakdown" -Headers $headers
        
        if ($breakdown.success) {
            $data = $breakdown.data
            Write-Host "Symbol: $($data.symbol)" -ForegroundColor Cyan
            Write-Host "  Base Price: ₹$($data.basePrice)" -ForegroundColor White
            Write-Host "  Current Price: ₹$($data.currentPrice)" -ForegroundColor White
            Write-Host "  Change: $($data.percentChange)%" -ForegroundColor $(if ([double]$data.percentChange -gt 0) { "Green" } else { "Red" })
            Write-Host "  BUY Points: $($data.buyPoints)" -ForegroundColor Green
            Write-Host "  SELL Points: $($data.sellPoints)" -ForegroundColor Red
            Write-Host "  Volume Ratio: $($data.volumeRatio)x" -ForegroundColor White
            
            $milestones = $data.milestones
            $achieved = @()
            if ($milestones.m2) { $achieved += "2%" }
            if ($milestones.m5) { $achieved += "5%" }
            if ($milestones.m10) { $achieved += "10%" }
            if ($milestones.m15) { $achieved += "15%" }
            if ($milestones.dayHigh) { $achieved += "Day High" }
            if ($milestones.dayLow) { $achieved += "Day Low" }
            if ($milestones.volume2x) { $achieved += "Vol 2x" }
            if ($milestones.volume3x) { $achieved += "Vol 3x" }
            
            if ($achieved.Count -gt 0) {
                Write-Host "  Milestones: $($achieved -join ', ')" -ForegroundColor Yellow
            } else {
                Write-Host "  Milestones: None yet" -ForegroundColor Gray
            }
            
            Write-Host "✓ Breakdown retrieved successfully" -ForegroundColor Green
        }
    } catch {
        Write-Host "✗ Failed to get breakdown: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 3: Get all stocks and show top performers
Write-Host "[Test 3] Getting top BUY and SELL performers..." -ForegroundColor Yellow
try {
    $stocksResponse = Invoke-RestMethod -Uri "$baseUrl/api/stocks?exchange=NSE" -Headers @{
        "Content-Type" = "application/json"
    }
    
    $stocks = $stocksResponse.data
    
    # Top 5 BUY
    $topBuy = $stocks | Sort-Object -Property buyPoints -Descending | Select-Object -First 5
    Write-Host "Top 5 BUY Points:" -ForegroundColor Green
    foreach ($stock in $topBuy) {
        Write-Host "  $($stock.symbol): $($stock.buyPoints) pts ($($stock.percentChange)%)" -ForegroundColor White
    }
    Write-Host ""
    
    # Top 5 SELL
    $topSell = $stocks | Sort-Object -Property sellPoints -Descending | Select-Object -First 5
    Write-Host "Top 5 SELL Points:" -ForegroundColor Red
    foreach ($stock in $topSell) {
        Write-Host "  $($stock.symbol): $($stock.sellPoints) pts ($($stock.percentChange)%)" -ForegroundColor White
    }
    Write-Host ""
    
    Write-Host "✓ Stock data retrieved successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to get stocks: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Suite Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open Screener page in frontend (http://localhost:5173/screener)"
Write-Host "2. Verify BUY/SELL points are displayed"
Write-Host "3. Check milestone badges appear when achieved"
Write-Host "4. Observe flash animation on point updates"
Write-Host ""
