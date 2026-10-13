# Pocketbook — Expense Tracker

> A full-stack personal-finance web application. Track income and expenses, set category budgets, save toward financial goals, and visualise your spending — all scoped securely to your own account.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Complete Project Structure](#2-complete-project-structure)
3. [Technology Stack](#3-technology-stack)
4. [Features](#4-features)
5. [Database Schema](#5-database-schema)
6. [API Reference](#6-api-reference)
7. [Environment Variables](#7-environment-variables)
8. [Prerequisites](#8-prerequisites)
9. [Setup & Running](#9-setup--running)
10. [Running Tests](#10-running-tests)
11. [Configuration Reference](#11-configuration-reference)
12. [Git Workflow](#12-git-workflow)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Project Overview

Pocketbook is a multi-user expense-tracking application with a **Spring Boot 3.3.5 REST API** backend and a **vanilla JavaScript SPA** frontend. Every piece of data is always scoped to the authenticated user — you can only ever see and modify your own records.

**Key highlights:**
- JWT-based stateless authentication (HS256, BCrypt passwords)
- Full transaction CRUD with category/date/type filtering, pagination, and CSV export
- Interactive dashboard: Chart.js bar chart (monthly trends) + doughnut (category breakdown)
- Budget management with live spent/remaining progress bars
- Savings goals with deposit tracking and achievement detection
- Swagger UI at `http://localhost:8080/swagger-ui.html`
- Fully responsive dark-themed UI (desktop, tablet, mobile)

---

## 2. Complete Project Structure

```
pocketbook/                                  ← git root  (5 commits, master branch)
│
├── .env.example                             ← copy → .env and fill credentials
├── .gitignore
├── README.md
│
├── backend/                                 ← Spring Boot 3.3.5 Maven project
│   ├── pom.xml                              ← Spring Boot parent, Java 21 target, springdoc, commons-csv
│   └── src/
│       ├── main/
│       │   ├── java/com/expensetracker/
│       │   │   ├── ExpenseTrackerApplication.java       ← @SpringBootApplication entry point
│       │   │   │
│       │   │   ├── config/
│       │   │   │   └── SecurityConfig.java              ← JWT/OAuth2 Resource Server, BCrypt, CORS, stateless
│       │   │   │
│       │   │   ├── controller/
│       │   │   │   ├── ApiExceptionHandler.java         ← global error → JSON {message, errors}
│       │   │   │   ├── AuthController.java              ← POST /api/auth/register, /login
│       │   │   │   ├── BudgetController.java            ← GET/POST/DELETE /api/budgets
│       │   │   │   ├── DashboardController.java         ← GET /api/dashboard, /api/categories
│       │   │   │   ├── SavingsGoalController.java       ← GET/POST/DELETE /api/goals, POST /api/goals/{id}/deposit
│       │   │   │   └── TransactionController.java       ← CRUD + filter + summary + CSV export
│       │   │   │
│       │   │   ├── dto/
│       │   │   │   └── Dto.java                         ← all records:
│       │   │   │       ├── RegisterRequest / LoginRequest / AuthResponse
│       │   │   │       ├── TransactionRequest / TransactionResponse / TransactionPage
│       │   │   │       ├── MonthlySummary
│       │   │   │       ├── BudgetRequest / BudgetResponse
│       │   │   │       ├── CategorySpend / DashboardResponse
│       │   │   │       ├── SavingsGoalRequest / SavingsGoalResponse
│       │   │   │       └── DepositRequest
│       │   │   │
│       │   │   ├── model/
│       │   │   │   ├── Budget.java          ← @Entity  table: budgets
│       │   │   │   ├── Categories.java      ← static list of 12 category names
│       │   │   │   ├── SavingsGoal.java     ← @Entity  table: savings_goals  ← NEW
│       │   │   │   ├── Transaction.java     ← @Entity  table: transactions (indexed)
│       │   │   │   ├── TransactionType.java ← enum: INCOME | EXPENSE
│       │   │   │   └── User.java            ← @Entity  table: users
│       │   │   │
│       │   │   ├── repository/
│       │   │   │   ├── BudgetRepository.java          ← ownership queries
│       │   │   │   ├── CategoryTotal.java             ← projection: category + total
│       │   │   │   ├── MonthlyTotal.java              ← projection: year, month, type, total  ← NEW
│       │   │   │   ├── SavingsGoalRepository.java     ← ownership queries  ← NEW
│       │   │   │   ├── TransactionRepository.java     ← JPQL aggregation, filtering, monthlySummary, CSV export
│       │   │   │   └── UserRepository.java            ← findByEmail, existsByEmail
│       │   │   │
│       │   │   └── service/
│       │   │       ├── BudgetService.java         ← save, delete, status calculation
│       │   │       ├── SavingsGoalService.java    ← list, save, deposit, delete, % calculation  ← NEW
│       │   │       ├── TokenService.java          ← HS256 JWT issue
│       │   │       ├── TransactionService.java    ← CRUD + dashboard + listFiltered + monthlySummary + exportCsv
│       │   │       └── UserService.java           ← register (BCrypt), authenticate
│       │   │
│       │   └── resources/
│       │       └── application.properties         ← all config via env vars; springdoc paths
│       │
│       └── test/
│           └── java/com/expensetracker/
│               ├── ExpenseTrackerApplicationTests.java    ← context-loads smoke test (H2)
│               └── service/
│                   └── TransactionServiceTest.java        ← 4 Mockito unit tests  ← NEW
│
└── frontend/                                ← static SPA, no build step
    ├── index.html                           ← app shell + auth shell + Chart.js CDN + toast container
    ├── css/
    │   └── style.css                        ← complete redesign — dark theme, grid layout, responsive
    └── js/
        ├── config.js                        ← API_URL + CURRENCY (edit this to point at backend)
        ├── api.js                           ← fetch wrapper, session, all API methods
        └── app.js                           ← hash router + all page views + Chart.js charts
```

---

## 3. Technology Stack

### Backend

| Layer | Technology |
|---|---|
| Language | Java 21 (bytecode target; runs on JDK 26) |
| Framework | Spring Boot 3.3.5 |
| Web | Spring MVC (`@RestController`) |
| Security | Spring Security 6 — stateless, BCrypt, HS256 JWT |
| JWT | Nimbus JOSE / Spring OAuth2 Resource Server |
| Persistence | Spring Data JPA + Hibernate 6.5 |
| Database | MySQL 8.0 (schema auto-created on first run) |
| Validation | Jakarta Bean Validation |
| API Docs | Springdoc OpenAPI 2.6.0 (Swagger UI) |
| CSV Export | Apache Commons CSV 1.11.0 |
| Build | Apache Maven 3.10 |
| Test | JUnit 5, Spring Boot Test, Mockito, H2 (test scope) |

### Frontend

| Layer | Technology |
|---|---|
| Language | Vanilla JavaScript (ES2020) |
| Markup | HTML5 |
| Styling | CSS3 — custom properties, CSS Grid, clamp(), media queries |
| Charts | Chart.js 4.4.4 (CDN) — bar (monthly) + doughnut (category) |
| Routing | Hash-based client-side router |
| HTTP | `fetch` API with `Authorization: Bearer` |
| State | `localStorage` session (token + name + email) |
| Build step | **None** — open directly in a browser or any static server |

---

## 4. Features

### Authentication & Security
- **Register / Login** with name, email, password (8–72 chars, BCrypt hashed)
- **HS256 JWT** tokens, 12-hour expiry, `JWT_SECRET` env var (never hardcoded)
- **Stateless sessions** — no server-side session state
- **Per-user data isolation** — every query filters by the authenticated user; accessing another user's resource returns `404`
- **Auto-logout** on `401` — frontend clears session and redirects to login
- **CORS** configured via `CORS_ORIGINS` env var
- **Global error handler** — all errors return `{ message, errors }` JSON

### Dashboard
- **Balance card** = total income − total expenses (highlighted red if negative)
- **Income / Expenses** stat cards
- **Monthly trends bar chart** — Chart.js grouped bar for all 12 months of the selected year; ◀ ▶ navigation
- **Category spending bars** — horizontal bars, widths proportional to top spender
- **Category doughnut chart** — Chart.js doughnut with legend
- **Recent 5 transactions** — with type icon, category, date, and signed amount

### Transactions
- **Full CRUD** — list, add, edit, delete with ownership enforcement
- **Filter bar** — filter by category, type (INCOME/EXPENSE), from-date, to-date
- **Pagination** — page navigation with total count
- **CSV export** — `⬇ CSV` button downloads `transactions.csv` with active filters applied
- **Sorted** newest-first (date DESC, id DESC) at all times
- **Validation** — amount (positive, ≤2 decimal places), category (required), date (required), description (optional, max 255)
- **Delete confirmation** — `confirm()` before destructive action

### Budgets
- **Create** — category + limit amount + start date + end date
- **Live status** — spent (calculated from matching expenses), remaining, % bar, exceeded flag
- **Progress bars** — green → yellow (≥75%) → red (exceeded)
- **Default dates** — form pre-fills to first/last day of current month
- **Delete** with ownership check

### Savings Goals ← NEW
- **Create** a named goal with target amount, optional target date, optional notes
- **Deposit** — add an amount to `savedAmount` via `+ Add savings` modal
- **Progress bar** — turns green on 100% achievement; `✅ Achieved` badge appears
- **Delete** with ownership check

### Frontend UX
- **Toast notifications** — success/error/info slide in from bottom-right; auto-dismiss after 3.8 s
- **Loading spinners** — shown while any API call is in progress
- **Button loading state** — spinner on submit button while request is in-flight; re-enables on error
- **Empty states** — friendly icons + messages for all zero-data scenarios
- **XSS protection** — all user content passes through `esc()` before rendering
- **Responsive** — sidebar collapses to hamburger on ≤ 760 px; stat grid stacks on ≤ 480 px
- **Reduced-motion** — progress bar transitions and animations disabled for `prefers-reduced-motion`

### API Documentation
- Swagger UI at `http://localhost:8080/swagger-ui.html` (no auth required to view)
- OpenAPI JSON at `http://localhost:8080/v3/api-docs`

---

## 5. Database Schema

Tables are created/updated automatically by Hibernate (`ddl-auto=update`). **No manual SQL needed.**

```
┌─────────────────────────────┐
│           users             │
├──────────┬──────────────────┤
│ id       │ BIGINT PK AUTO   │
│ name     │ VARCHAR(80)      │
│ email    │ VARCHAR UNIQUE   │
│ password │ VARCHAR (BCrypt) │
│ created_at│ DATETIME        │
└──────────┴──────────────────┘
        │ 1
        ├────────────────────────────────────────┐
        │                                        │
        │ *                                      │ *
┌───────────────────────────────────────┐  ┌──────────────────────────────┐
│              transactions             │  │           budgets            │
│  INDEX: idx_tx_user_date(user,date)   │  ├─────────────┬───────────────┤
├──────────────┬────────────────────────┤  │ id          │ BIGINT PK     │
│ id           │ BIGINT PK AUTO         │  │ user_id     │ FK → users    │
│ user_id      │ FK → users             │  │ category    │ VARCHAR(50)   │
│ type         │ VARCHAR(10)            │  │ limit_amount│ DECIMAL(12,2) │
│ amount       │ DECIMAL(12,2)          │  │ start_date  │ DATE          │
│ category     │ VARCHAR(50)            │  │ end_date    │ DATE          │
│ txn_date     │ DATE                   │  └─────────────┴───────────────┘
│ description  │ VARCHAR(255) nullable  │
└──────────────┴────────────────────────┘  ┌──────────────────────────────────┐
                                           │          savings_goals   ← NEW   │
                                           ├─────────────┬────────────────────┤
                                           │ id          │ BIGINT PK AUTO     │
                                           │ user_id     │ FK → users         │
                                           │ name        │ VARCHAR(100)       │
                                           │ target_amount│ DECIMAL(12,2)     │
                                           │ saved_amount │ DECIMAL(12,2)     │
                                           │ target_date  │ DATE nullable     │
                                           │ notes        │ VARCHAR(500) null │
                                           └─────────────┴────────────────────┘
```

---

## 6. API Reference

> Base URL: `http://localhost:8080`
> All endpoints except `/api/auth/**`, `/swagger-ui/**`, `/v3/api-docs/**` require:
> `Authorization: Bearer <token>`

### Authentication

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `POST` | `/api/auth/register` | `{name, email, password}` | `201 {token, name, email}` |
| `POST` | `/api/auth/login` | `{email, password}` | `200 {token, name, email}` |

### Dashboard

| Method | Endpoint | Response |
|--------|----------|----------|
| `GET` | `/api/dashboard` | `{income, expenses, balance, spending:[…], recent:[…]}` |
| `GET` | `/api/categories` | `["Salary","Food",…]` (12 items) |

### Transactions

| Method | Endpoint | Query params | Response |
|--------|----------|-------------|----------|
| `GET` | `/api/transactions` | `category`, `type`, `from`, `to`, `page`, `size` | Array or `TransactionPage` |
| `GET` | `/api/transactions/summary` | `year` (default: current year) | `[{year,month,income,expenses}]` |
| `GET` | `/api/transactions/export` | `category`, `from`, `to` | `text/csv` download |
| `POST` | `/api/transactions` | — | `201 TransactionResponse` |
| `GET` | `/api/transactions/{id}` | — | `TransactionResponse` |
| `PUT` | `/api/transactions/{id}` | — | `200 TransactionResponse` |
| `DELETE` | `/api/transactions/{id}` | — | `204` |

**TransactionRequest:**
```json
{ "type": "EXPENSE", "amount": 49.99, "category": "Food", "date": "2026-10-13", "description": "Lunch" }
```

**TransactionPage response (when filters active):**
```json
{ "content": [...], "page": 0, "size": 20, "totalElements": 150, "totalPages": 8 }
```

### Budgets

| Method | Endpoint | Response |
|--------|----------|----------|
| `GET` | `/api/budgets` | `[BudgetResponse]` — includes live spent/remaining/percent/exceeded |
| `POST` | `/api/budgets` | `201 BudgetResponse` |
| `DELETE` | `/api/budgets/{id}` | `204` |

### Savings Goals

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `GET` | `/api/goals` | — | `[SavingsGoalResponse]` |
| `POST` | `/api/goals` | `{name, targetAmount, targetDate?, notes?}` | `201 SavingsGoalResponse` |
| `POST` | `/api/goals/{id}/deposit` | `{amount}` | `200 SavingsGoalResponse` |
| `DELETE` | `/api/goals/{id}` | — | `204` |

**SavingsGoalResponse includes:** `id, name, targetAmount, savedAmount, targetDate, notes, percent (0–100), achieved`

### Error Responses

```json
{ "message": "Human-readable description" }
{ "message": "Please fix the highlighted fields", "errors": { "amount": "Amount must be greater than zero" } }
```

| Status | When |
|--------|------|
| `400` | Validation failure |
| `401` | Missing / expired JWT |
| `404` | Resource not found for this user |
| `409` | Email already registered |

---

## 7. Environment Variables

Copy `.env.example` to `.env` and fill in values. Set them in PowerShell before running Maven.

| Variable | Dev fallback | Required in prod | Description |
|----------|-------------|------------------|-------------|
| `DB_URL` | `jdbc:mysql://localhost:3306/expense_tracker?createDatabaseIfNotExist=true&serverTimezone=UTC` | Recommended | Full JDBC URL |
| `DB_USER` | `root` | Yes | MySQL username |
| `DB_PASSWORD` | *(empty)* | **Yes** | MySQL password |
| `JWT_SECRET` | `dev-only-secret-change-me-please-32chars-min!` | **Yes** | HS256 signing key, min 32 chars |
| `CORS_ORIGINS` | `*` | Yes | Comma-separated browser origins |

**Generate a secure secret:**
```powershell
[Convert]::ToBase64String((1..48 | %{ [byte](Get-Random -Max 256) }))
```

---

## 8. Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| JDK | 26.0.1 (runs Java-21 bytecode) | `java -version` |
| Maven | 3.10+ | `mvn --version` |
| MySQL | 8.0+ | `mysql --version` |
| Git | Any | `git --version` |
| Python *(optional)* | 3.x | Frontend static server |

---

## 9. Setup & Running

### Step 1 — Database

Start MySQL. The `expense_tracker` database and all 4 tables are created automatically on first backend startup.

```sql
-- Optional: dedicated user instead of root
CREATE USER 'pocketbook'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON expense_tracker.* TO 'pocketbook'@'localhost';
FLUSH PRIVILEGES;
```

### Step 2 — Backend

```powershell
Set-Location backend

$env:DB_USER      = "root"
$env:DB_PASSWORD  = "your_mysql_password"
$env:JWT_SECRET   = "your-random-secret-at-least-32-chars-long"
$env:CORS_ORIGINS = "http://localhost:5500"

mvn spring-boot:run
```

Backend starts at `http://localhost:8080`.
Swagger UI at `http://localhost:8080/swagger-ui.html`.

### Step 3 — Frontend

No `npm install`, no build step.

```powershell
Set-Location frontend
python -m http.server 5500
# Open http://localhost:5500 in your browser
```

Or use VS Code **Live Server** → right-click `frontend/index.html` → *Open with Live Server*.

**Changing the backend URL or currency:**
Edit [`frontend/js/config.js`](frontend/js/config.js):
```js
window.CONFIG = {
  API_URL: 'http://localhost:8080',
  CURRENCY: '₹'    // or '$', '€', etc.
};
```

---

## 10. Running Tests

```powershell
Set-Location backend
mvn test
```

**Test suite (5 tests, 0 failures):**

| Test class | Tests | What it verifies |
|---|---|---|
| `ExpenseTrackerApplicationTests` | 1 | Full Spring context loads with H2 (MySQL not required) |
| `TransactionServiceTest` | 4 | `dashboard()` balance, `nz()` null-safety, `save()` field mapping, `get()` 404 ownership |

---

## 11. Configuration Reference

[`backend/src/main/resources/application.properties`](backend/src/main/resources/application.properties):

```properties
spring.application.name=pocketbook-api

spring.datasource.url=${DB_URL:jdbc:mysql://localhost:3306/expense_tracker?...}
spring.datasource.username=${DB_USER:root}
spring.datasource.password=${DB_PASSWORD:}

spring.jpa.hibernate.ddl-auto=update   # set to validate/none in production
spring.jpa.open-in-view=false
server.error.include-message=always

app.jwt.secret=${JWT_SECRET:dev-only-...}
app.jwt.hours=12                        # token lifetime

app.cors.allowed-origins=${CORS_ORIGINS:*}

springdoc.swagger-ui.path=/swagger-ui.html
springdoc.api-docs.path=/v3/api-docs
```

---

## 12. Git Workflow

```powershell
git status
git add .
git commit -m "your message"

# Connect to GitHub (once):
git remote add origin https://github.com/<your-username>/pocketbook.git
git push -u origin master
```

**Commit history:**
```
1871706  merge: feature/improvements into master — complete Phase A-C upgrade
9b8e127  feat: Phase A-C improvements — charts, filters, pagination, CSV export, savings goals, Swagger UI, unit tests
7b03a07  docs: complete README with full project structure, all features, API reference, schema, and troubleshooting
2e52be4  fix: target Java 21 bytecode (Spring Boot 3.3.5 ASM incompatible with Java 26 class files)
7f664c1  Initial commit: full-stack Pocketbook expense tracker
```

---

## 13. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Communications link failure` | MySQL not running | Start MySQL service (`services.msc`) |
| `Access denied for user 'root'` | Wrong `DB_PASSWORD` | `echo $env:DB_PASSWORD` to verify |
| `Cannot reach the server` (browser) | Backend not started | Run `mvn spring-boot:run` in `backend/` |
| CORS error in DevTools | Frontend origin not in `CORS_ORIGINS` | Set `$env:CORS_ORIGINS = "http://localhost:5500"` and restart backend |
| `401` on every request | JWT expired or wrong secret | Log out → log in; ensure `JWT_SECRET` hasn't changed |
| `Unsupported class file major version` | Java 26 bytecode, Spring ASM can't read it | `<java.version>21</java.version>` in pom.xml (already set) |
| `Failed to delete target/` | OneDrive locking files | `Remove-Item -Recurse -Force backend\target` |
| Port 8080 in use | Another process | `netstat -ano \| findstr :8080` → kill the PID |
| `An account with this email already exists` | Duplicate registration | Log in instead, or use a different email |
| Swagger UI shows no auth | Swagger needs Bearer token for protected endpoints | Use Authorize button → paste your JWT token |
| Charts not rendering | Chart.js CDN blocked | Check network; or download Chart.js and serve locally |
