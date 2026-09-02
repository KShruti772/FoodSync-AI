# FoodSync AI

> **Real-Time Food Waste Redistribution Platform**  
> *Connecting surplus food providers with local recipient organizations in real time.*

[![Repository](https://img.shields.io/badge/GitHub-KShruti772%2FFoodSync--AI-blue.svg)](https://github.com/KShruti772/FoodSync-AI)
[![Status](https://img.shields.io/badge/Architecture-Frozen%20%26%20Finalized-success.svg)](https://github.com/KShruti772/FoodSync-AI)

---

## 📌 Problem Statement

Every day, commercial food providers (restaurants, caterers, grocery stores, and event organizers) produce surplus, edible food that goes to waste due to the lack of rapid, reliable redistribution channels. Concurrently, nearby recipient organizations (shelters, food banks, orphanages) struggle with food insecurity.

## 💡 Our Solution

FoodSync AI provides an intelligent, automated food redistribution system that validates surplus listings, executes deterministic multi-factor compatibility & urgency ranking, notifies the best-matched nearby organizations, coordinates logistics, and quantifies social and environmental impact.

---

## 🏗️ System Architecture & Workflow

```mermaid
flowchart LR
    A[Food Provider\nSurplus Food] --> B[FoodSync Platform\nDeterministic Heuristic Ranking]
    B --> C[Recipient Organization\nMatch Accept & Pickup]
    C --> D[Impact Logging\nMeals & CO2 Rescued]
```

### Official Finalized Stack:
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend**: Python + FastAPI + Pydantic + SQLAlchemy 2.x + Alembic
- **Primary Database**: PostgreSQL 15+
- **Authentication**: Argon2id + Short-lived JWT (24h)
- **Testing**: Pytest + HTTPX (Backend), Vitest (Frontend), Playwright (E2E)

---

## 📚 Project Documentation & Implementation Contracts

All features and development workflows are governed by these authoritative contracts in `docs/`:

| Document | Purpose |
| :--- | :--- |
| 📖 **[Project Overview](file:///Users/shrutikondabathula/SIH26117/FoodSync-AI/docs/PROJECT_OVERVIEW.md)** | Problem statement, standard terminology, user roles, redistribution lifecycle, and MVP vs Phase 2 scope. |
| 🏛️ **[System Architecture](file:///Users/shrutikondabathula/SIH26117/FoodSync-AI/docs/ARCHITECTURE.md)** | Multi-tier architecture, layer responsibilities, system design vs methodology, and state machine. |
| 🛠️ **[Development Guide](file:///Users/shrutikondabathula/SIH26117/FoodSync-AI/docs/DEVELOPMENT_GUIDE.md)** | Directory layout, code ownership, naming conventions, layer boundaries, and "Do Not" rules. |
| 📡 **[API Contract](file:///Users/shrutikondabathula/SIH26117/FoodSync-AI/docs/API_CONTRACT.md)** | Standard REST `/api/v1` contracts, Pydantic schemas, privacy masking, error codes, and examples. |
| 🗄️ **[Database Schema](file:///Users/shrutikondabathula/SIH26117/FoodSync-AI/docs/DATABASE_SCHEMA.md)** | PostgreSQL relational schema, ER diagram, field types, constraints, indexes, and relationships. |
| 🧠 **[AI Matching Engine](file:///Users/shrutikondabathula/SIH26117/FoodSync-AI/docs/AI_MATCHING.md)** | Deterministic multi-factor heuristic scoring formula, Haversine distance, tie-breaking, and test cases. |
| 🎨 **[UI Guidelines](file:///Users/shrutikondabathula/SIH26117/FoodSync-AI/docs/UI_GUIDELINES.md)** | Tailwind design tokens, typography, component catalog, user journeys, and privacy reveal rules. |
| 🧪 **[Testing Guide](file:///Users/shrutikondabathula/SIH26117/FoodSync-AI/docs/TESTING_GUIDE.md)** | Pytest + HTTPX test strategy, mandatory security/concurrency/privacy test matrices, and commands. |
| 🔒 **[Security Guidelines](file:///Users/shrutikondabathula/SIH26117/FoodSync-AI/docs/SECURITY_GUIDELINES.md)** | Argon2id hashing, admin registration protection, Pydantic validation, RBAC, double-claim prevention, and CORS. |
| 👥 **[Team Workflow](file:///Users/shrutikondabathula/SIH26117/FoodSync-AI/docs/TEAM_WORKFLOW.md)** | Git branching, shared `main` rules, PR review policy, doc synchronization, and daily commands. |

---

## 👥 Team & Role Distribution

| Teammate | Role | Primary Assigned Branch |
| :--- | :--- | :--- |
| **Shruti** | **Team Lead / AI & Architecture** | `feature/ai-matching` |
| **Lokeshwari** | **Database & API** | `feature/database` |
| **Vishwajeet** | **UI/UX & Testing** | `feature/ui-testing` |
| **Atharva** | **Frontend Developer** | `feature/frontend` |
| **Akanksha** | **Backend Developer** | `feature/backend` |
| **All Team** | **Integration / Staging** | `main` *(Protected)* |

---

## 📂 Planned Repository Structure

```
FoodSync-AI/
├── docs/                              # Frozen architecture & implementation contracts
├── frontend/                          # [PLANNED] Next.js + Tailwind CSS client
├── backend/                           # [PLANNED] FastAPI REST API, SQLAlchemy models & services
│   └── tests/                         # [PLANNED] Pytest unit and integration test suites
├── e2e/                               # [PLANNED] Playwright browser test suites
├── .env.example                       # Template for environment configuration
├── .gitignore                         # Version control exclusions
└── README.md                          # Root project overview & navigation
```

---

## 🚦 Project Status

> [!IMPORTANT]
> **Architecture is frozen; no blocking architectural decisions remain.**  
> Ready for module implementation on feature branches.