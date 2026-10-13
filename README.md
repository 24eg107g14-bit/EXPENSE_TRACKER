# Pocketbook — Expense Tracker

> A full-stack personal-finance web application. Track income and expenses, set category budgets, and visualise your spending — all scoped securely to your own account.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Complete Project Structure](#2-complete-project-structure)
3. [Technology Stack](#3-technology-stack)
4. [Features](#4-features)
   - [Authentication & Security](#41-authentication--security)
   - [Dashboard](#42-dashboard)
   - [Transactions](#43-transactions)
   - [Budgets](#44-budgets)
   - [Categories](#45-categories)
   - [Frontend SPA](#46-frontend-spa)
5. [Database Schema](#5-database-schema)
6. [API Reference](#6-api-reference)
7. [Environment Variables](#7-environment-variables)
8. [Prerequisites](#8-prerequisites)
9. [Setup & Running](#9-setup--running)
   - [1 — Database](#step-1--database)
   - [2 — Backend](#step-2--backend)
   - [3 — Frontend](#step-3--frontend)
10. [Running Tests](#10-running-tests)
11. [Configuration Reference](#11-configuration-reference)
12. [Git Workflow](#12-git-workflow)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Project Overview

Pocketbook is a multi-user expense-tracking application with a **Spring Boot REST API** backend and a **vanilla JavaScript SPA** frontend. Every piece of data (transactions, budgets, dashboard figures) is always scoped to the authenticated user — you can only ever see and modify your own records.

---

## 2. Complete Project Structure

```
pocketbook/                                  ← git root
│
├── .env.example                             ← copy → .env, fill credentials
├── .gitignore
├── README.md
│
├── backend/                                 ← Spring Boot Maven project
│   ├── pom.xml
│   └── src/
│       ├── main/
│       │   ├── java/com/expensetracker/
│       │   │   │
│       │   │   ├── ExpenseTrackerApplication.java   ← @SpringBootApplication entry point
│       │   │   │
│       │   │   ├── config/
│       │   │   │   └── SecurityConfig.java          ← JWT, BCrypt, CORS, stateless sessions
│       │   │   │
│       │   │   ├── controller/
│       │   │   │   ├── ApiExceptionHandler.java     ← global error → JSON {message, errors}
│       │   │   │   ├── AuthController.java          ← POST /api/auth/register, /login
│       │   │   │   ├── BudgetController.java        ← GET/POST/DELETE /api/budgets
│       │   │   │   ├── DashboardController.java     ← GET /api/dashboard, /api/categories
│       │   │   │   └── TransactionController.java   ← CRUD /api/transactions
│       │   │   │
│       │   │   ├── dto/
│       │   │   │   └── Dto.java                     ← all request/response records
│       │   │   │       ├── RegisterRequest          name, email, password (validated)
│       │   │   │       ├── LoginRequest             email, password
│       │   │   │       ├── AuthResponse             token, name, email
│       │   │   │       ├── TransactionRequest       type, amount, category, date, description
│       │   │   │       ├── TransactionResponse      id + all fields
│       │   │   │       ├── BudgetRequest            category, limitAmount, startDate, endDate
│       │   │   │       ├── BudgetResponse           id + fields + spent/remaining/percent/exceeded
│       │   │   │       ├── CategorySpend            category, total, percent
│       │   │   │       └── DashboardResponse        income, expenses, balance, spending[], recent[]
│       │   │   │
│       │   │   ├── model/
│       │   │   │   ├── Budget.java                  ← @Entity  table: budgets
│       │   │   │   ├── Categories.java              ← static list of 12 category names
│       │   │   │   ├── Transaction.java             ← @Entity  table: transactions (indexed)
│       │   │   │   ├── TransactionType.java         ← enum: INCOME | EXPENSE
│       │   │   │   └── User.java                    ← @Entity  table: users
│       │   │   │
│       │   │   ├── repository/
│       │   │   │   ├── BudgetRepository.java        ← JpaRepository + ownership queries
│       │   │   │   ├── CategoryTotal.java           ← projection: category + total
│       │   │   │   ├── TransactionRepository.java   ← JPQL aggregation + period totals
│       │   │   │   └── UserRepository.java          ← findByEmail, existsByEmail
│       │   │   │
│       │   │   └── service/
│       │   │       ├── BudgetService.java           ← save, delete, status calculation
│       │   │       ├── TokenService.java            ← HS256 JWT issue (NimbusJWT)
│       │   │       ├── TransactionService.java      ← CRUD + dashboard aggregation
│       │   │       └── UserService.java             ← register (BCrypt), authenticate
│       │   │
│       │   └── resources/
│       │       └── application.properties           ← all config via env vars
│       │
│       └── test/
│           └── java/com/expensetracker/
│               └── ExpenseTrackerApplicationTests.java  ← context-loads smoke test (H2)
│
└── frontend/                                ← static SPA, no build step
    ├── index.html                           ← single HTML shell
    ├── css/
    │   └── style.css                        ← full responsive stylesheet
    └── js/
        ├── config.js                        ← API_URL + CURRENCY (edit this)
        ├── api.js                           ← fetch wrapper, session, ApiError
        └── app.js                           ← router + all page views (210 lines)
```

---

## 3. Technology Stack

### Backend

| Layer | Technology |
|---|---|
| Language | Java 21 (bytecode target; runs on JDK 26) |
| Framework | Spring Boot 3.3.5 |
| Web | Spring MVC (`@RestController`) |
| Security | Spring Security 6 — stateless, BCrypt passwords, HS256 JWT |
| JWT | Nimbus JOSE / Spring OAuth2 Resource Server |
| Persistence | Spring Data JPA + Hibernate 6.5 |
| Database | MySQL 8.0 (auto-creates schema on first run) |
| Validation | Jakarta Bean Validation (`@NotBlank`, `@Positive`, `@Digits`, `@Email`, `@Size`) |
| Build | Apache Maven 3.10 |
| Test | JUnit 5, Spring Boot Test, Spring Security Test, H2 (in-memory, test scope) |

### Frontend

| Layer | Technology |
|---|---|
| Language | Vanilla JavaScript (ES2020, no transpiler) |
| Markup | HTML5 |
| Styling | CSS3 with CSS custom properties (variables), CSS Grid, `clamp()`, media queries |
| Routing | Hash-based client-side router (`hashchange` event) |
| HTTP | `fetch` API with `Authorization: Bearer` header |
| State | `localStorage` session (token + name + email) |
| Build step | **None** — open directly in a browser |

---

## 4. Features

### 4.1 Authentication & Security

- **Register** — create an account with name, email, and password (8–72 characters).
- **Login** — authenticate with email + password; receive a signed JWT.
- **Passwords** are hashed with BCrypt before storage. Plain-text passwords are never stored.
- **JWT tokens** are signed with HMAC-SHA256. The secret is never hard-coded; it is read from the `JWT_SECRET` environment variable (minimum 32 characters). Tokens expire after 12 hours (configurable).
- **Stateless sessions** — no server-side session state; every request carries a `Bearer` token.
- **Per-user data isolation** — every query filters by the authenticated user. Accessing another user's resource returns `404 Not Found`, not a forbidden error (ownership leak prevention).
- **Duplicate email check** — attempting to register a second account with the same email returns `409 Conflict`.
- **Email is case-insensitive** — stored and looked up in lowercase.
- **CORS** is configured via `CORS_ORIGINS` environment variable (`*` by default for local dev).
- **Global error handler** (`ApiExceptionHandler`) — all validation errors and `ResponseStatusException`s are returned as consistent JSON:
  ```json
  { "message": "Please fix the highlighted fields", "errors": { "email": "Enter a valid email address" } }
  ```

### 4.2 Dashboard

The dashboard fetches two endpoints in parallel and combines the data into one view:

- **Available balance** = total income − total expenses (highlighted in red if negative).
- **Income vs. Spent** — side-by-side totals for the user's entire history.
- **Spending by category** — horizontal bar chart showing each expense category's total, with widths proportional to the highest-spending category (percentage calculated server-side with `RoundingMode.HALF_UP`).
- **Budget overview** — all budgets shown with their spent / limit bars.
- **Recent transactions** — last 5 transactions (by date then by ID, descending).

### 4.3 Transactions

Full CRUD for income and expense records:

- **List** — all transactions for the logged-in user, ordered newest first (by date DESC, then ID DESC).
- **Add** — create a new INCOME or EXPENSE record with amount, category, date, and optional description.
- **Edit** — update any field of an existing transaction; ownership is enforced server-side.
- **Delete** — remove a transaction with a confirmation prompt; ownership is enforced.

**Validation rules (enforced on backend + visible in UI):**

| Field | Rules |
|---|---|
| Type | Required; must be `INCOME` or `EXPENSE` |
| Amount | Required; positive; max 2 decimal places; max 10 integer digits |
| Category | Required; max 50 characters |
| Date | Required; ISO date format `YYYY-MM-DD` |
| Description | Optional; max 255 characters; blank is stored as `null` |

**DB detail:** the `transactions` table has a compound index `(user_id, txn_date)` for efficient per-user chronological queries.

### 4.4 Budgets

- **Create a budget** — set a spending limit for a category over a custom date range (start date → end date).
- **Date validation** — end date must be on or after start date (checked in the controller before saving).
- **Live status** — each budget response includes:
  - `spent` — actual expenses matching the category and date range (calculated with a JPQL aggregate query).
  - `remaining` — `limitAmount − spent` (can be negative if over budget).
  - `percent` — `(spent / limitAmount) × 100`, capped at `100` in the response so the progress bar never overflows.
  - `exceeded` — `true` when `spent > limitAmount`; the UI turns the bar red.
- **Delete a budget** — removes it; ownership enforced.
- **Dashboard integration** — budgets are shown as progress bars on the dashboard.

### 4.5 Categories

A fixed list of 12 categories is served from the backend (`GET /api/categories`) and used to populate all dropdowns in the UI:

`Salary`, `Freelance`, `Food`, `Rent`, `Transport`, `Utilities`, `Shopping`, `Health`, `Entertainment`, `Education`, `Savings`, `Other`

### 4.6 Frontend SPA

- **Hash-based router** — no page reloads. Routes: `#/`, `#/login`, `#/register`, `#/transactions`, `#/transactions/new`, `#/transactions/:id/edit`, `#/budgets`.
- **Auth guard** — unauthenticated users are redirected to `#/login`; logged-in users are redirected away from auth pages.
- **Automatic logout** — a `401` response from any non-auth endpoint clears the session and redirects to `#/login`.
- **XSS prevention** — all user-supplied values rendered in HTML pass through an `esc()` function that encodes `&`, `<`, `>`, `"`, `'`.
- **Form UX** — submit button is disabled during the request; field-level error messages appear inline; a banner message shows API-level errors.
- **Responsive layout** — CSS Grid sidebar collapses to a top bar on screens ≤ 760 px.
- **Reduced-motion support** — progress bar width transition is skipped for users with `prefers-reduced-motion`.
- **Configurable** — `frontend/js/config.js` exposes `API_URL` and `CURRENCY` so you can point the app at any backend and change the currency symbol without editing application code.

---

## 5. Database Schema

Tables are created and updated automatically by Hibernate (`ddl-auto=update`). No manual SQL migrations are required.

```
┌─────────────────────────────┐
│           users             │
├──────────┬──────────────────┤
│ id       │ BIGINT PK AI     │
│ name     │ VARCHAR(80)      │
│ email    │ VARCHAR UNIQUE   │
│ password │ VARCHAR (BCrypt) │
│ created_at│ DATETIME        │
└──────────┴──────────────────┘
        │ 1
        │
        │ *
┌─────────────────────────────────────────┐
│              transactions               │
│  INDEX: idx_tx_user_date (user_id, txn_date) │
├──────────────┬──────────────────────────┤
│ id           │ BIGINT PK AI             │
│ user_id      │ BIGINT FK → users.id     │
│ type         │ VARCHAR(10) INCOME|EXPENSE│
│ amount       │ DECIMAL(12,2)            │
│ category     │ VARCHAR(50)              │
│ txn_date     │ DATE                     │
│ description  │ VARCHAR(255) nullable    │
└──────────────┴──────────────────────────┘

        │ 1
        │
        │ *
┌──────────────────────────────┐
│           budgets            │
├─────────────┬────────────────┤
│ id          │ BIGINT PK AI   │
│ user_id     │ BIGINT FK → users.id │
│ category    │ VARCHAR(50)    │
│ limit_amount│ DECIMAL(12,2)  │
│ start_date  │ DATE           │
│ end_date    │ DATE           │
└─────────────┴────────────────┘
```

---

## 6. API Reference

> Base URL: `http://localhost:8080`
> All endpoints except `/api/auth/**` require the header:
> `Authorization: Bearer <token>`

### Authentication

| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| `POST` | `/api/auth/register` | `{name, email, password}` | `201` `{token, name, email}` | Password min 8 chars |
| `POST` | `/api/auth/login` | `{email, password}` | `200` `{token, name, email}` | Returns fresh JWT |

### Dashboard

| Method | Endpoint | Response |
|--------|----------|----------|
| `GET` | `/api/dashboard` | `{income, expenses, balance, spending:[{category,total,percent}], recent:[TransactionResponse]}` |
| `GET` | `/api/categories` | `["Salary","Freelance","Food",...]` (12 items) |

### Transactions

| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| `GET` | `/api/transactions` | — | `[TransactionResponse]` | Newest first |
| `POST` | `/api/transactions` | `TransactionRequest` | `201 TransactionResponse` | Validated |
| `GET` | `/api/transactions/{id}` | — | `TransactionResponse` | `404` if not yours |
| `PUT` | `/api/transactions/{id}` | `TransactionRequest` | `200 TransactionResponse` | `404` if not yours |
| `DELETE` | `/api/transactions/{id}` | — | `204 No Content` | `404` if not yours |

**TransactionRequest body:**
```json
{
  "type": "EXPENSE",
  "amount": 49.99,
  "category": "Food",
  "date": "2026-10-13",
  "description": "Lunch"
}
```

### Budgets

| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| `GET` | `/api/budgets` | — | `[BudgetResponse]` | Includes live spent/remaining |
| `POST` | `/api/budgets` | `BudgetRequest` | `201 BudgetResponse` | endDate ≥ startDate |
| `DELETE` | `/api/budgets/{id}` | — | `204 No Content` | `404` if not yours |

**BudgetRequest body:**
```json
{
  "category": "Food",
  "limitAmount": 300.00,
  "startDate": "2026-10-01",
  "endDate": "2026-10-31"
}
```

**BudgetResponse includes:**
```json
{
  "id": 1,
  "category": "Food",
  "limitAmount": 300.00,
  "startDate": "2026-10-01",
  "endDate": "2026-10-31",
  "spent": 120.50,
  "remaining": 179.50,
  "percent": 40,
  "exceeded": false
}
```

### Error Responses

All errors are JSON with a consistent shape:

```json
{ "message": "Human-readable description" }
```
```json
{ "message": "Please fix the highlighted fields", "errors": { "amount": "Amount must be greater than zero" } }
```

| HTTP Status | When |
|-------------|------|
| `400 Bad Request` | Validation failure |
| `401 Unauthorized` | Missing / expired / invalid JWT |
| `404 Not Found` | Resource doesn't exist for this user |
| `409 Conflict` | Email already registered |

---

## 7. Environment Variables

Copy `.env.example` to `.env` and fill in your values. Then set them in your PowerShell session before running Maven.

| Variable | Default (dev fallback) | Required in production | Description |
|----------|----------------------|----------------------|-------------|
| `DB_URL` | `jdbc:mysql://localhost:3306/expense_tracker?createDatabaseIfNotExist=true&serverTimezone=UTC` | Recommended | Full JDBC connection URL |
| `DB_USER` | `root` | Yes | MySQL username |
| `DB_PASSWORD` | *(empty string)* | **Yes** | MySQL password |
| `JWT_SECRET` | `dev-only-secret-change-me-please-32chars-min!` | **Yes** | HS256 signing key, minimum 32 characters |
| `CORS_ORIGINS` | `*` | Yes | Comma-separated browser origins, e.g. `http://localhost:5500` |

> **Security note:** The dev fallback for `JWT_SECRET` is intentionally weak and public. Always set a strong, random secret in any non-local environment.

**Generate a secure secret:**
```powershell
[Convert]::ToBase64String((1..48 | %{ [byte](Get-Random -Max 256) }))
```

---

## 8. Prerequisites

| Tool | Version | How to check |
|------|---------|-------------|
| JDK | 26 (runs Java-21-targeted bytecode) | `java -version` |
| Apache Maven | 3.10+ | `mvn --version` |
| MySQL Server | 8.0+ | `mysql --version` |
| Git | Any | `git --version` |
| Python *(optional)* | 3.x | For the `http.server` frontend dev server |

---

## 9. Setup & Running

### Step 1 — Database

Start MySQL and ensure the user has `CREATE` privilege on the `expense_tracker` database. The database and all tables are created automatically on first backend startup.

```sql
-- Optional: create a dedicated user instead of using root
CREATE USER 'pocketbook'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON expense_tracker.* TO 'pocketbook'@'localhost';
FLUSH PRIVILEGES;
```

### Step 2 — Backend

```powershell
# From the project root, enter the backend folder:
Set-Location backend

# Set environment variables in your current PowerShell session:
$env:DB_USER      = "root"
$env:DB_PASSWORD  = "your_mysql_password"
$env:JWT_SECRET   = "your-random-secret-at-least-32-chars-long"
$env:CORS_ORIGINS = "http://localhost:5500"

# Start the API server (listens on http://localhost:8080):
mvn spring-boot:run
```

You should see `Started ExpenseTrackerApplication` in the console.
The `expense_tracker` database schema is created on the first run.

### Step 3 — Frontend

The frontend is a plain static site — no `npm install`, no build step.

**Option A — Python HTTP server (simplest):**
```powershell
Set-Location frontend
python -m http.server 5500
# Open http://localhost:5500 in your browser
```

**Option B — VS Code Live Server:**
Right-click `frontend/index.html` → *Open with Live Server*.

**Option C — Any static server** (nginx, IIS, `npx serve`, etc.)

**Changing the API URL or currency symbol:**
Edit [`frontend/js/config.js`](frontend/js/config.js):
```js
window.CONFIG = {
  API_URL: 'http://localhost:8080',  // ← backend origin
  CURRENCY: '$'                       // ← symbol shown next to amounts
};
```

---

## 10. Running Tests

```powershell
Set-Location backend
mvn test
```

The context-loads smoke test verifies that the entire Spring application context (security, JPA, JWT, CORS, all beans) wires up correctly. It uses **H2 in-memory database**, so **MySQL is not required** to run tests.

Expected output:
```
Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

---

## 11. Configuration Reference

All settings live in [`backend/src/main/resources/application.properties`](backend/src/main/resources/application.properties). Every value reads from an environment variable with a dev fallback.

```properties
spring.application.name=pocketbook-api

# Datasource — override with DB_URL / DB_USER / DB_PASSWORD
spring.datasource.url=${DB_URL:jdbc:mysql://localhost:3306/expense_tracker?createDatabaseIfNotExist=true&serverTimezone=UTC}
spring.datasource.username=${DB_USER:root}
spring.datasource.password=${DB_PASSWORD:}

# Hibernate auto-creates / updates tables; set to validate or none in production
spring.jpa.hibernate.ddl-auto=update
spring.jpa.open-in-view=false
server.error.include-message=always

# JWT — override with JWT_SECRET (min 32 chars) and optionally JWT_HOURS
app.jwt.secret=${JWT_SECRET:dev-only-secret-change-me-please-32chars-min!}
app.jwt.hours=12

# CORS — override with CORS_ORIGINS (comma-separated)
app.cors.allowed-origins=${CORS_ORIGINS:*}
```

---

## 12. Git Workflow

```powershell
# See what has changed
git status

# Stage all changes
git add .

# Commit
git commit -m "describe your change"

# Connect to GitHub (run once):
git remote add origin https://github.com/<your-username>/pocketbook.git
git push -u origin master

# Subsequent pushes:
git push
```

**Commit history:**
```
* fix: target Java 21 bytecode (Spring Boot 3.3.5 ASM incompatible with Java 26 class files)
* Initial commit: full-stack Pocketbook expense tracker
```

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Communications link failure` | MySQL is not running | Start the MySQL service (`services.msc`) |
| `Access denied for user 'root'@'localhost'` | Wrong `DB_USER` or `DB_PASSWORD` | Check your env vars: `echo $env:DB_PASSWORD` |
| `Cannot reach the server` (browser console) | Backend not started | Run `mvn spring-boot:run` in `backend/` |
| CORS error in browser DevTools | Frontend origin not in `CORS_ORIGINS` | Set `$env:CORS_ORIGINS = "http://localhost:5500"` and restart |
| `401 Unauthorized` on every request | JWT secret changed or token expired | Log out, log in again; ensure `JWT_SECRET` is consistent |
| `Unsupported class file major version` | Compiling to Java 26 bytecode — Spring Boot ASM can't read it | `<java.version>21</java.version>` in `pom.xml` (already set) |
| `Failed to delete target/` on `mvn clean` | OneDrive locking files | `Remove-Item -Recurse -Force backend\target`; then retry |
| Port 8080 already in use | Another process | `netstat -ano \| findstr :8080` — kill the listed PID |
| `An account with this email already exists` | Duplicate registration | Log in instead, or use a different email |
| Build downloads nothing / hangs | No internet / proxy | Check your network; Maven resolves dependencies from Maven Central on first build |
