# Trazex Backend API Test Script
# This PowerShell script helps you test all the API endpoints

$baseUrl = "http://localhost:3001/api"

Write-Host "Trazex Backend API Test Script" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

# Test 1: Health Check
Write-Host "`n1. Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
    Write-Host "Health Check: $($health.message)" -ForegroundColor Green
} catch {
    Write-Host "Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Admin Login
Write-Host "`n2. Testing Admin Login..." -ForegroundColor Yellow
try {
    $adminBody = @{
        email = 'trazex11admin@gmail.com'
        password = 'trazex11@98admin'
    } | ConvertTo-Json
    
    $adminLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $adminBody -ContentType 'application/json'
    Write-Host "Admin Login: $($adminLogin.message)" -ForegroundColor Green
    $adminToken = $adminLogin.token
    Write-Host "   Admin Token: $($adminToken.Substring(0, 20))..." -ForegroundColor Cyan
} catch {
    Write-Host "Admin Login Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: User Signup
Write-Host "`n3. Testing User Signup..." -ForegroundColor Yellow
try {
    $userBody = @{
        username = 'testuser'
        email = 'test@example.com'
        password = 'TestPass123'
    } | ConvertTo-Json
    
    $signup = Invoke-RestMethod -Uri "$baseUrl/auth/signup" -Method POST -Body $userBody -ContentType 'application/json'
    Write-Host "User Signup: $($signup.message)" -ForegroundColor Green
    $userToken = $signup.token
    Write-Host "   User Token: $($userToken.Substring(0, 20))..." -ForegroundColor Cyan
} catch {
    Write-Host "User Signup Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: User Login
Write-Host "`n4. Testing User Login..." -ForegroundColor Yellow
try {
    $userLoginBody = @{
        email = 'test@example.com'
        password = 'TestPass123'
    } | ConvertTo-Json
    
    $userLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $userLoginBody -ContentType 'application/json'
    Write-Host "User Login: $($userLogin.message)" -ForegroundColor Green
} catch {
    Write-Host "User Login Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Admin Dashboard (if admin token exists)
if ($adminToken) {
    Write-Host "`n5. Testing Admin Dashboard..." -ForegroundColor Yellow
    try {
        $headers = @{
            'Authorization' = "Bearer $adminToken"
        }
        $dashboard = Invoke-RestMethod -Uri "$baseUrl/admin/dashboard" -Method GET -Headers $headers
        Write-Host "Admin Dashboard: Retrieved statistics successfully" -ForegroundColor Green
        Write-Host "   Total Users: $($dashboard.stats.totalUsers)" -ForegroundColor Cyan
    } catch {
        Write-Host "Admin Dashboard Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 6: User Profile (if user token exists)
if ($userToken) {
    Write-Host "`n6. Testing User Profile..." -ForegroundColor Yellow
    try {
        $headers = @{
            'Authorization' = "Bearer $userToken"
        }
        $profile = Invoke-RestMethod -Uri "$baseUrl/user/profile" -Method GET -Headers $headers
        Write-Host "User Profile: Retrieved successfully" -ForegroundColor Green
        Write-Host "   Username: $($profile.user.username)" -ForegroundColor Cyan
    } catch {
        Write-Host "User Profile Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nAPI Testing Complete!" -ForegroundColor Green

# Instructions
Write-Host "`nQuick Start Information:" -ForegroundColor Yellow
Write-Host "API Base URL: http://localhost:3001/api" -ForegroundColor Cyan
Write-Host "Documentation: See README.md for complete API docs" -ForegroundColor Cyan
Write-Host "Admin Login: trazex11admin@gmail.com" -ForegroundColor Cyan