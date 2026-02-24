# TRAZEX11 Point Calculation

This document explains how points are calculated in the current backend implementation.

## Contest Stock Scoring (Updated)

The contest engine now uses a reusable function:

- File: `utils/calculateStockPoints.js`
- Function: `calculateStockPoints(params)`

### Function Input

```js
calculateStockPoints({
  percentChange,
  previousPercent,
  userAction, // "BUY" | "SELL"
  dayHigh,
  dayLow,
  ltp,
  milestoneFlags, // { m2, m5, m10, m15 }
  dayHighHit,
  dayLowHit
})
```

### Rule 1: Base Movement Scoring

Every 0.1% absolute movement = 1 unit:

$$
movementUnits = \lfloor |percentChange| / 0.1 \rfloor
$$

Direction correctness:

- BUY: `percentChange > 0` => correct, `< 0` => wrong
- SELL: `percentChange < 0` => correct, `> 0` => wrong

Base points:

- Correct direction: `movementUnits * 1`
- Wrong direction: `movementUnits * -0.5`

### Rule 2: Milestone Bonus (First Cross Only)

Milestones and bonus:

- 2% => +10
- 5% => +25
- 10% => +60
- 15% => +120

BUY crossing condition:

- `previousPercent < threshold`
- `percentChange >= threshold`

SELL crossing condition:

- `previousPercent > -threshold`
- `percentChange <= -threshold`

Each milestone is awarded only once using `milestoneFlags`.

### Rule 3: Day High / Day Low Bonus (First Hit Only)

If LTP hits day high first time:

- BUY => +20
- SELL => -10

If LTP hits day low first time:

- SELL => +20
- BUY => -10

First-hit prevention is controlled by `dayHighHit` and `dayLowHit`.

### Final Score Returned

$$
totalPoints = baseMovementPoints + milestoneBonus + dayHighLowBonus
$$

Function return:

```js
{
  totalPoints,
  baseMovementPoints,
  milestoneBonus,
  dayHighLowBonus,
  updatedMilestoneFlags,
  dayHighHit,
  dayLowHit
}
```

### Live Tick Safety (No Double Rewards)

Contest processing stores `lastComputedPoints` in `TeamStockMilestone`.

Per tick:

1. Compute current stock points using `calculateStockPoints(...)`
2. Compute tick delta:

$$
pointsDelta = currentTotalPoints - lastComputedPoints
$$

3. Apply captain/vice multiplier to `pointsDelta`
4. Increment team and leaderboard by this delta
5. Persist `lastComputedPoints`, `previousPercent`, and updated flags

This ensures:

- no duplicate milestone rewards
- first-hit day high/low only once
- correct negative scoring on wrong direction
- stable live updates without overcounting

## 1) Two Separate Point Systems

- **Screener Daily Points** (for stock cards in screener)
  - Service: `services/dailyStockScoringService.js`
  - Fields: `dailyBuyPoints`, `dailySellPoints`, `dailyMilestonesHit`
- **Contest Points** (for teams/leaderboard)
  - Service: `services/stockScoringService.js`
  - Uses team action, captain/vice multiplier, leaderboard ranks

---

## 2) Screener Daily Point Calculation (Main)

## Daily Reset (9:00 AM IST)
Runs once daily from scheduler.

For each active stock:
- `basePrice = previousClose` (if available and > 0), else current `price`
- `dailyBuyPoints = 0`
- `dailySellPoints = 0`
- `dailyMilestonesHit` all flags reset to `false`
- `dailyBaseVolume = volume`
- `lastResetDate = now`

## Live Tick Calculation (Only Changed Stocks)
Only symbols that changed in current tick are processed.

### Step A: Percent Change from basePrice

$$
\text{percentChange} = \frac{(\text{price} - \text{basePrice})}{\text{basePrice}} \times 100
$$

### Step B: Directional Base Points

Rule: **1 point per 0.1% move**

$$
\text{directionalPoints} = \left\lfloor \frac{|\text{percentChange}|}{0.1} \right\rfloor
$$

- If `percentChange > 0`:
  - `buyPoints = directionalPoints`
  - `sellPoints = 0`
- If `percentChange < 0`:
  - `sellPoints = directionalPoints`
  - `buyPoints = 0`

### Step C: Milestone Bonuses (awarded once/day)

On absolute move (`abs(percentChange)`):
- `>= 2%`  -> `+10`
- `>= 5%`  -> `+25`
- `>= 10%` -> `+60`
- `>= 15%` -> `+120`

Bonus is applied to:
- BUY side if movement is positive
- SELL side if movement is negative

Each milestone sets flag in `dailyMilestonesHit` so it cannot be awarded again that day.

### Step D: Persist + Emit

For each changed stock:
- update DB using `bulkWrite`
- write:
  - `dailyBuyPoints`
  - `dailySellPoints`
  - `dailyMilestonesHit`
  - `percentChange`
  - `dailyPreviousPercent`
- emit socket event: `stockUpdate`

---

## 3) Screener Example

Suppose:
- `basePrice = 2697`
- `price = 2588.31`
- `percentChange = -4.03%`
- `dailyPreviousPercent = 0`

1. Movement units = `floor(4.03 / 0.1) = 40`
2. Base directional:
  - SELL correct => `+40`
  - BUY wrong => `-20`
3. Milestone cross:
  - crossed `-2%` first time => `+10` to SELL

Final:
- `dailySellPoints = 40 + 10 = 50`
- `dailyBuyPoints = -20`

---

## 4) Contest Point Calculation (Short Summary)

Contest scoring is separate and uses:
- per-team stock action (BUY/SELL)
- delta movement per tick (not pure day move)
- milestone logic per team-stock
- captain/vice multipliers
- leaderboard updates and prize flow

Main file: `services/stockScoringService.js`

---

## 5) Where This Is Triggered

- Scheduler cycle: `services/liveUpdateScheduler.js`
- Stock updates fetched: `services/stockService.js`
- Daily scoring call: `dailyStockScoringService.calculateDailyPoints(changedStocks, io)`

This ensures only changed stocks are recalculated each tick (no full dataset recalculation).
