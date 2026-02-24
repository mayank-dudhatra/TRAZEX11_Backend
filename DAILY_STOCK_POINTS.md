# Daily Stock Points System - Documentation

## Overview
The Daily Stock Points System calculates and displays real-time "Fantasy Points" for stocks in the Screener section. These points are independent of contest scoring and help users evaluate stock performance for the day.

## Architecture

### Backend Components

#### 1. Stock Model Updates (`models/Stock.js`)
Added fields to track daily scoring:
- `basePrice`: Stock price at 9:00 AM (daily reset)
- `buyPoints`: Accumulated BUY points for the day
- `sellPoints`: Accumulated SELL points for the day
- `dailyMilestones`: Object tracking achieved milestones
  - `m2`, `m5`, `m10`, `m15`: Percentage milestones
  - `dayHigh`, `dayLow`: Extreme price bonuses
  - `volume2x`, `volume3x`: Volume spike bonuses
- `dailyBaseVolume`: EMA volume for spike detection
- `lastDailyReset`: Timestamp of last reset

#### 2. Daily Stock Scoring Service (`services/dailyStockScoringService.js`)
Core service that implements:

**Scoring Rules:**
- **Directional Points**: ±1 point per 0.1% change from basePrice
- **Milestone Bonuses** (awarded once per day):
  - 2% milestone → +10 points
  - 5% milestone → +25 points
  - 10% milestone → +60 points
  - 15% milestone → +120 points
- **Day High Bonus**: +20 points (BUY only)
- **Day Low Bonus**: +10 points (SELL only)
- **Volume Spike Bonuses**:
  - 2x average volume → +5 points
  - 3x average volume → +10 points

**Key Methods:**
- `resetDailyScores()`: Resets all stocks at 9:00 AM
- `calculateDailyPoints(updatedSymbols)`: Calculates points for updated stocks
- `getStockScoreBreakdown(symbol)`: Returns detailed scoring breakdown

#### 3. Live Update Scheduler (`services/liveUpdateScheduler.js`)
Enhanced with:
- Daily reset cron job at 9:00 AM IST
- Automatic daily points calculation after each stock update
- Integration with existing contest scoring system

#### 4. Admin API Endpoints (`routes/admin.js`)
New endpoints for testing/monitoring:
- `POST /api/admin/stocks/reset-daily-points`: Manual reset trigger
- `GET /api/admin/stocks/:symbol/score-breakdown`: Detailed score info

### Frontend Components

#### Screener Updates (`components/Screener/ScreenerCard.jsx`)
Enhanced display showing:
- **BUY Points** (green card with achieved milestones)
- **SELL Points** (red card with achieved milestones)
- **Milestone badges**: 2%, 5%, 10%, 15%, Day High/Low, Volume spikes
- **Live updates** via Socket.io with highlight animation

## Setup Instructions

### 1. Install Dependencies
```bash
cd Backend
npm install
```

The following packages are now required:
- `node-cron`: ^3.0.3
- `moment-timezone`: ^0.5.45

### 2. Start the Backend
```bash
npm run dev
```

On startup, you'll see:
```
🚀 Starting live update scheduler...
✅ Daily reset cron job scheduled for 9:00 AM IST
✅ Live update scheduler started (interval: 5000ms)
```

### 3. Manual Reset (For Testing)
To test without waiting for 9:00 AM:

**Using PowerShell:**
```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_ADMIN_TOKEN"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:3001/api/admin/stocks/reset-daily-points" -Method POST -Headers $headers
```

**Using curl:**
```bash
curl -X POST http://localhost:3001/api/admin/stocks/reset-daily-points \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 4. View Stock Score Breakdown
```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_ADMIN_TOKEN"
}

Invoke-RestMethod -Uri "http://localhost:3001/api/admin/stocks/RELIANCE.NS/score-breakdown" -Headers $headers
```

Example response:
```json
{
  "success": true,
  "data": {
    "symbol": "RELIANCE.NS",
    "name": "Reliance Industries",
    "basePrice": 2450.50,
    "currentPrice": 2478.30,
    "percentChange": "1.13",
    "directionalPoints": 11,
    "buyPoints": 11,
    "sellPoints": 0,
    "milestones": {
      "m2": false,
      "m5": false,
      "m10": false,
      "m15": false,
      "dayHigh": false,
      "dayLow": false,
      "volume2x": false,
      "volume3x": false
    },
    "volume": 12453678,
    "baseVolume": 10234567,
    "volumeRatio": "1.22"
  }
}
```

## How It Works

### Daily Cycle

**9:00 AM IST:**
1. Cron job triggers `resetDailyScores()`
2. For all active stocks:
   - Set `basePrice = currentPrice`
   - Set `dailyBaseVolume = currentVolume`
   - Reset `buyPoints = 0`, `sellPoints = 0`
   - Reset all milestone flags to false

**During Market Hours (9:15 AM - 3:30 PM):**
1. Stock prices update every 5 seconds
2. `calculateDailyPoints()` is called for changed stocks
3. For each stock:
   - Calculate percent change from basePrice
   - Calculate directional points (±1 per 0.1%)
   - Check and award milestone bonuses (only once per day)
   - Check day high/low bonuses
   - Check volume spike bonuses
   - Update EMA volume
4. Points broadcast via Socket.io to frontend
5. Screener displays updated points with flash animation

### Scoring Examples

**Example 1: Stock up 2.3%**
- Base Price: ₹1000
- Current Price: ₹1023
- Percent Change: +2.3%
- Directional Points: 23 (2.3% / 0.1%)
- Milestone Bonus: +10 (2% achieved)
- **Total BUY Points: 33**
- **Total SELL Points: 0**

**Example 2: Stock hits day high at +5.5%**
- Directional Points: 55
- Milestone Bonuses: +10 (2%) + 25 (5%) = +35
- Day High Bonus: +20
- **Total BUY Points: 110**

**Example 3: Stock down 3.2% with 2.5x volume**
- Directional Points: 32
- Milestone Bonuses: +10 (2%) + 25 (5% not hit but 3% counts as 2%)
- Volume Spike: +5 (2x)
- **Total SELL Points: 47**
- **Total BUY Points: 0**

## Frontend Display

The Screener now shows two prominent cards for each stock:

### BUY Points Card (Green)
- Large point value display
- Milestone badges: 2%, 5%, 10%, 15%
- Day High badge (yellow)
- Volume spike badges (blue/purple)

### SELL Points Card (Red)
- Large point value display
- Milestone badges: 2%, 5%, 10%, 15%
- Day Low badge (yellow)
- Volume spike badges (blue/purple)

### Live Updates
- Flash animation (emerald ring) when points update
- Real-time via Socket.io
- Debounced search maintains performance

## Testing Checklist

- [ ] Backend starts with daily reset cron scheduled
- [ ] Manual reset API works (`/api/admin/stocks/reset-daily-points`)
- [ ] Stock score breakdown API works
- [ ] Points calculate correctly for positive movement
- [ ] Points calculate correctly for negative movement
- [ ] Milestone bonuses award only once per day
- [ ] Day high/low bonuses work
- [ ] Volume spike bonuses work
- [ ] Frontend displays buyPoints and sellPoints
- [ ] Milestone badges appear when achieved
- [ ] Flash animation works on point updates
- [ ] Search functionality works
- [ ] Reset at 9:00 AM works automatically

## Monitoring

Check backend logs for:
```
[DailyReset] Triggered at 2026-02-18 09:00:00 IST
[DailyStockScoring] Resetting daily scores at 09:00:00
[DailyStockScoring] Reset completed for 150 stocks
[DailyStockScoring] Updated 45 stocks
```

## Troubleshooting

### Points not updating
1. Check if basePrice is set: `GET /api/admin/stocks/SYMBOL/score-breakdown`
2. Trigger manual reset if needed
3. Check backend logs for errors

### Daily reset not happening
1. Verify cron job is scheduled (check startup logs)
2. Check timezone is Asia/Kolkata
3. Restart backend if needed

### Milestones re-awarding
1. This should not happen - milestones are one-time per day
2. Check milestone flags in breakdown API
3. Verify reset happened today

### Frontend not showing points
1. Check if buyPoints/sellPoints exist in API response
2. Verify Socket.io connection
3. Check browser console for errors

## Performance Considerations

- EMA volume calculation prevents database lookups
- Bulk updates for efficiency
- Milestone flags prevent redundant calculations
- Frontend uses debounced search (300ms)
- useMemo for filtered stocks

## Future Enhancements

- [ ] Historical daily points tracking
- [ ] Top performers of the day leaderboard
- [ ] Daily points trends chart
- [ ] SMS/Email alerts for milestone achievements
- [ ] Custom alerts for point thresholds
- [ ] Export daily points data

---

**Last Updated:** February 18, 2026
**Author:** TRAZEX11 Development Team
