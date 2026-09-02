# Team Workflow & Git Collaboration — FoodSync AI

> **Status**: Architecture Frozen — Single Source of Truth for Team Git Workflow  
> **Repository**: [KShruti772/FoodSync-AI](https://github.com/KShruti772/FoodSync-AI)  
> **Team Lead**: Shruti

---

## 1. Team Roles & Branch Ownership

FoodSync AI follows a simple, beginner-friendly feature branch workflow. The `main` branch is the **shared, protected integration branch** for the entire team; it is **never** used as an individual developer's personal working branch.

| Teammate | Role | Primary Assigned Branch | Scope & Responsibilities |
| :--- | :--- | :--- | :--- |
| **Shruti** | **Team Lead / AI & Architecture** | `feature/ai-matching` | Heuristic matching engine, system architecture oversight, security & PR reviews |
| **Lokeshwari** | **Database & API** | `feature/database` | PostgreSQL schemas, SQLAlchemy ORM models, Alembic migrations, data repositories |
| **Vishwajeet** | **UI/UX & Testing** | `feature/ui-testing` | Pytest & Vitest test suites, UI/UX consistency, edge case validation |
| **Atharva** | **Frontend Developer** | `feature/frontend` | Next.js App Router pages, Tailwind CSS components, client API integration |
| **Akanksha** | **Backend Developer** | `feature/backend` | FastAPI route controllers, Pydantic schemas, business domain services, auth middleware |
| **All Team** | **Integration / Staging** | `main` *(Protected)* | Stable production-ready codebase; updated exclusively via reviewed Pull Requests |

---

## 2. Git Branching Strategy

```mermaid
gitGraph
    commit id: "Initial Setup"
    branch feature/database
    branch feature/backend
    branch feature/frontend
    branch feature/ai-matching
    branch feature/ui-testing
    
    checkout feature/database
    commit id: "db: define postgres models"
    
    checkout feature/backend
    commit id: "api: add auth & donation routes"
    
    checkout feature/ai-matching
    commit id: "ai: implement scoring math"
    
    checkout main
    merge feature/database id: "PR #1 (Lokeshwari): DB Models"
    
    checkout feature/backend
    merge main id: "Sync with main"
    commit id: "api: link sqlalchemy models"
    
    checkout main
    merge feature/backend id: "PR #2 (Akanksha): Backend API"
```

### Core Collaboration Rules:
1. **Protected `main` Branch**: **NEVER commit or push directly to `main`**. All updates to `main` must occur through reviewed Pull Requests.
2. **Dedicated Feature Branches**: Every teammate works exclusively within their assigned feature branch or a short-lived sub-feature branch (e.g. `feature/frontend-login`).
3. **No Force Pushing**: `git push --force` is strictly banned on `main` and all shared remote branches.
4. **Zero Secrets in Git**: Never commit `.env` files, actual passwords, or JWT secrets. Check `git status` before staging.

---

## 3. Mandatory PR & Merge Criteria

Before any Pull Request is merged into `main`, it must fulfill these criteria:

```mermaid
flowchart TD
    A["1. Open Pull Request\n(Target: main <- Compare: feature/branch)"] --> B{"2. All Automated Tests Pass?\n(pytest && npm run test)"}
    B -- Failed --> FIX["Fix broken tests locally"] --> A
    B -- Passed --> C{"3. API or Schema Changed?"}
    C -- Yes --> D{"Docs Updated in same PR?\n(API_CONTRACT.md / DATABASE_SCHEMA.md)"}
    D -- No --> DOC["Update relevant doc file"] --> A
    D -- Yes --> E{"4. Security-Sensitive Changes?\n(Auth, JWT, RBAC, Privacy)"}
    C -- No --> E
    E -- Yes --> F["Requires Team Lead (Shruti) Approval"]
    E -- No --> G["Peer Review & Approval"]
    F & G --> H["5. Merge PR into main\n(Squash or Merge Commit)"]
```

### Merge Checklist:
- [ ] **Tests Pass**: All unit and integration tests pass locally (`pytest` and `cd frontend && npm run test`).
- [ ] **Documentation Synchronized**: If endpoints or database fields changed, [API_CONTRACT.md](file:///Users/shrutikondabathula/SIH26117/FoodSync-AI/docs/API_CONTRACT.md) and [DATABASE_SCHEMA.md](file:///Users/shrutikondabathula/SIH26117/FoodSync-AI/docs/DATABASE_SCHEMA.md) are updated in the same PR.
- [ ] **Security Review**: Changes affecting authentication, password hashing, JWT tokens, or pickup address privacy require review from **Shruti**.
- [ ] **Clean Git History**: Meaningful commit messages adhering to conventional commit standards.

---

## 4. Daily Developer Git Workflow

### Step 1: Start of Day (Sync with `main`)
Always integrate the latest approved work from teammates before writing new code:
```bash
# 1. Ensure working directory is clean
git status

# 2. Pull the latest main
git switch main
git pull origin main

# 3. Switch to your feature branch and merge latest main
git switch <your-feature-branch>
git merge main
```

### Step 2: Implement & Test Locally
Make small, focused changes inside your designated module folder:
```bash
# Run tests after writing code
pytest backend/tests/unit/
```

### Step 3: Stage & Commit
Review your changes and commit with conventional messages:
```bash
# 1. Review status and diffs
git status
git diff

# 2. Stage only intentional changes (never stage .env)
git add .

# 3. Commit with conventional commit format
git commit -m "feat(matching): add haversine distance calculation"
```

### Step 4: Push & Open Pull Request
```bash
# Push to your remote feature branch
git push origin <your-feature-branch>
```
1. Open a PR at [KShruti772/FoodSync-AI/pulls](https://github.com/KShruti772/FoodSync-AI/pulls).
2. Set Base: `main` $\leftarrow$ Compare: `<your-feature-branch>`.
3. Fill out the PR summary (what was implemented, contract followed, test results).
4. Request review from **Shruti** or the relevant feature partner.

---

## 5. Commit Message Conventions

Use **Conventional Commits** for clear, structured history:

- `feat(scope)`: A new feature or endpoint (e.g. `feat(donation): add quantity validation`)
- `fix(scope)`: A bug fix (e.g. `fix(auth): correct argon2 hashing verification`)
- `docs(scope)`: Documentation updates (e.g. `docs(api): update donation status enum`)
- `test(scope)`: Adding or updating test cases (e.g. `test(claim): add double claim concurrency test`)
- `refactor(scope)`: Restructuring code without changing functionality (e.g. `refactor(repo): extract query filters`)

---

## 6. Merge Conflict Resolution Protocol

When merge conflicts occur during `git merge main`:
1. **Never guess or blindly overwrite a teammate's logic**.
2. Run `git status` to identify conflicting files.
3. Open conflicting files and inspect conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
4. Coordinate directly with the author of the conflicting code.
5. Resolve the conflict, run all tests locally, stage with `git add <file>`, and commit the merge.

---

## 7. Architectural Status

> [!IMPORTANT]
> **Architecture is frozen; no blocking architectural decisions remain.**
