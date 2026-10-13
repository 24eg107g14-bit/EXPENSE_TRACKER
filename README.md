# Pocketbook — Expense Tracker

A full-stack personal-finance app with a Spring Boot REST API backend and a vanilla JS single-page frontend.

## Architecture

```
pocketbook/
├── backend/                          Spring Boot 3.3.5 REST API (port 8080)
│   ├── pom.xml
│   └── src/
│       ├── main/
│       │   ├── java/com/expensetracker/
│       │   │   ├── config/           SecurityConfig (JWT, CORS, BCrypt)
│       │   │   ├── controller/       AuthController, TransactionController,
│       │   │   │                     BudgetController, DashboardController,
│       │   │   │                     ApiExceptionHandler
│       │   │   ├── dto/              Request / response records (Dto.java)
│       │   │   ├── model/            JPA entities (User, Transaction, Budget, …)
│       │   │   ├── repository/       Spring Data JPA repositories
│       │   │   ├── service/          BudgetService, TransactionService,
│       │   │   │                     UserService, TokenService
│       │   │   └── ExpenseTrackerApplication.java
│       │   └── resources/
│       │       └── application.properties
│       └── test/
│           └── java/com/expensetracker/
│               └── ExpenseTrackerApplicationTests.java
│
├── frontend/                         Vanilla HTML / CSS / JS SPA (no build step)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── config.js   ← change API_URL / CURRENCY here
│       ├── api.js      fetch wrapper + session management
│       └── app.js      router + views (dashboard, transactions, budgets)
│
├── .env.example        ← copy to .env and fill in your credentials
├── .gitignore
└── README.md
```

## Prerequisites

| Tool | Minimum version | Notes |
|------|-----------------|-------|
| Java | 26 | JDK (not JRE) |
| Maven | 3.10 | `mvn --version` to check |
| MySQL | 8.0 | Community Edition is fine |
| Git | any | |

A browser + any static-file server (or just `python -m http.server`) for the frontend.

## Environment variables

The backend reads the following variables at startup. Copy `.env.example` to `.env` and fill in your values, then set them in your shell before running Maven.

| Variable | Default (dev only) | Description |
|----------|-------------------|-------------|
| `DB_URL` | `jdbc:mysql://localhost:3306/expense_tracker?createDatabaseIfNotExist=true&serverTimezone=UTC` | Full JDBC URL |
| `DB_USER` | `root` | MySQL username |
| `DB_PASSWORD` | *(empty)* | MySQL password — **always set this** |
| `JWT_SECRET` | `dev-only-secret-change-me-please-32chars-min!` | HS256 signing key, ≥ 32 chars |
| `CORS_ORIGINS` | `*` | Comma-separated allowed browser origins |

> **Never commit real credentials.** `.env` is git-ignored. The defaults are for local development only.

Generate a secure JWT secret:
```powershell
[Convert]::ToBase64String((1..48 | %{ [byte](Get-Random -Max 256) }))
```

## Database setup

MySQL creates the `expense_tracker` database and all tables automatically on first run (`spring.jpa.hibernate.ddl-auto=update`). You only need a running MySQL server with a user that has `CREATE` privileges.

```sql
-- Run once in MySQL if you want a dedicated user instead of root:
CREATE USER 'pocketbook'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON expense_tracker.* TO 'pocketbook'@'localhost';
FLUSH PRIVILEGES;
```

## Running the backend

```powershell
# From the project root:
cd backend

# Set environment variables in your PowerShell session:
$env:DB_USER     = "root"
$env:DB_PASSWORD = "your_mysql_password"
$env:JWT_SECRET  = "replace-with-your-generated-secret-at-least-32-chars"
$env:CORS_ORIGINS = "http://localhost:5500"

# Start the API server (http://localhost:8080):
mvn spring-boot:run
```

The first startup creates the database schema automatically.

## Running the frontend

The frontend is a static SPA — no build step required.

**Option A — Python (simplest):**
```powershell
cd frontend
python -m http.server 5500
# Open http://localhost:5500 in your browser
```

**Option B — VS Code Live Server:**
Right-click `frontend/index.html` → *Open with Live Server*.

**Option C — Any static file server** (nginx, `npx serve`, IIS, etc.)

### Configuring the API URL

Edit [`frontend/js/config.js`](frontend/js/config.js):
```js
window.CONFIG = {
  API_URL: 'http://localhost:8080',  // ← backend URL
  CURRENCY: '$'                       // ← symbol shown next to amounts
};
```

## Running tests

```powershell
cd backend
mvn test
```

The smoke test uses H2 (in-memory) so **MySQL is not required** to run tests.

## API reference

All endpoints except `/api/auth/**` require an `Authorization: Bearer <token>` header. The token is returned by login/register.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | No | Create account → returns token |
| `POST` | `/api/auth/login` | No | Log in → returns token |
| `GET` | `/api/dashboard` | Yes | Balance, income, expenses, category breakdown, recent transactions |
| `GET` | `/api/categories` | Yes | List of category names |
| `GET` | `/api/transactions` | Yes | All transactions for the logged-in user |
| `POST` | `/api/transactions` | Yes | Add a transaction |
| `GET` | `/api/transactions/{id}` | Yes | Get one transaction |
| `PUT` | `/api/transactions/{id}` | Yes | Edit a transaction |
| `DELETE` | `/api/transactions/{id}` | Yes | Delete a transaction |
| `GET` | `/api/budgets` | Yes | Budgets with spent / remaining |
| `POST` | `/api/budgets` | Yes | Create a budget |
| `DELETE` | `/api/budgets/{id}` | Yes | Delete a budget |

Every query is automatically scoped to the authenticated user.

## Git workflow

```powershell
# Check status
git status

# Stage and commit
git add .
git commit -m "your message"

# Push to GitHub (set your remote once):
git remote add origin https://github.com/<your-username>/pocketbook.git
git push -u origin main
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Communications link failure` | MySQL not running | Start MySQL service |
| `Access denied for user` | Wrong `DB_USER` / `DB_PASSWORD` | Check env vars |
| `Cannot reach the server` (browser) | Backend not started | Run `mvn spring-boot:run` |
| `CORS error` in browser | `CORS_ORIGINS` doesn't include the frontend URL | Set `$env:CORS_ORIGINS = "http://localhost:5500"` |
| `401 Unauthorized` on all requests | JWT secret mismatch or expired token | Log out and log in again; ensure `JWT_SECRET` hasn't changed |
| Build fails with `java.version` error | Wrong JDK on PATH | Ensure `java -version` shows 26+ |
| Port 8080 already in use | Another process | `netstat -ano \| findstr :8080`, then kill the PID |
