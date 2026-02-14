## API Overview

Base URL: `/api`

Authentication: `Authorization: Bearer <token>`

---

## Authentication

- **POST** `/auth/signup`
	- body: `username`, `email`, `password`
- **POST** `/auth/login`
	- body: `email`, `password`
- **GET** `/auth/profile`
- **POST** `/auth/logout`

---

## Admin

- **GET** `/admin/dashboard`
- **GET** `/admin/users`
	- query: `page`, `limit`
- **GET** `/admin/users/:id`
- **PUT** `/admin/users/:id/status`
	- body: `isActive` (boolean)
- **DELETE** `/admin/users/:id`
- **POST** `/admin/contests`
	- body:
		- `name`
		- `marketType` (NSE/BSE)
		- `contestDurationType` (daily/weekly/monthly)
		- `contestDate`
		- `entryCloseTime`
		- `contestStartTime`
		- `contestEndTime`
		- `entryFee`
		- `totalSpots`
		- `maximumTeamPerUser`
		- `prizePool`
		- `prizeBreakup` (array of `{ rankFrom, rankTo, amount }`)

---

## Contests

- **GET** `/contests?date=YYYY-MM-DD&market=NSE`
	- response grouped by `contestDurationType`
- **POST** `/contests/:contestId/join`
	- body: `teamId`

---

## Teams

- **POST** `/teams`
	- body:
		- `contestId`
		- `stocks` (array of `{ stockSymbol, action }`)
		- `captain` (same shape as stock)
		- `viceCaptain` (same shape as stock)

---

## Leaderboard

- **GET** `/leaderboard/:contestId`

---

## User

- **GET** `/user/profile`
- **PUT** `/user/profile`
	- body: `username`, `email`
- **PUT** `/user/change-password`
	- body: `currentPassword`, `newPassword`
- **DELETE** `/user/account`

---

## Utility

- **GET** `/health`
