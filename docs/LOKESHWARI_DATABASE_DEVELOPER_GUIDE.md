# Lokeshwari's Database Developer Guide — FoodSync AI

> **Status**: Architecture Frozen — Authoritative Handbook for Database Engineering  
> **Target Audience**: Lokeshwari (Database Developer)  
> **Assigned Working Branch**: `feature/database`  
> **Primary Role**: Database Developer (PostgreSQL, SQLAlchemy 2.x, Repositories, Alembic Migrations, Data Integrity)  
> **Primary Repository Codebase Area**: `backend/app/models/`, `backend/app/repositories/`, and `backend/alembic/`  
> **Repository**: [KShruti772/FoodSync-AI](https://github.com/KShruti772/FoodSync-AI)

---

## 🌟 Core Team Principle

> **"Lokeshwari is the custodian of data integrity, schema consistency, relational performance, and persistence in FoodSync AI. She designs and maintains the PostgreSQL schema, SQLAlchemy 2.x ORM models, data access repositories, and Alembic migrations. Shruti leads the team, system architecture, and AI matching engine. Shubham implements the FastAPI backend, API routes, and domain services. Atharva implements the Next.js frontend. Vishwajeet leads UI/UX design specifications and QA testing across all test suites."**

---

## 👥 Final Team Ownership Model

| Teammate | Role | Assigned Branch | Scope & Owned Directories |
| :--- | :--- | :--- | :--- |
| **Shruti** | **Team Lead / AI / Architecture** | `feature/ai-matching` | `backend/app/services/matching/` *(Matching Algorithm & Scoring Logic)*<br>System Architecture, Project Lead, Cross-Layer Coordination |
| **Shubham** | **Backend Developer** | `feature/backend` | `backend/app/api/`<br>`backend/app/core/`<br>`backend/app/schemas/`<br>`backend/app/services/` *(Domain Services except matching engine)*<br>`backend/app/utils/`<br>`backend/app/main.py` |
| **Atharva** | **Frontend Developer** | `feature/frontend` | `frontend/app/`<br>`frontend/components/`<br>`frontend/hooks/`<br>`frontend/lib/`<br>`frontend/services/`<br>*(Next.js App Router, TypeScript & Tailwind CSS)* |
| **Lokeshwari** | **Database Developer** | `feature/database` | `backend/app/models/`<br>`backend/app/repositories/`<br>`backend/alembic/`<br>*(PostgreSQL Relational Schema, SQLAlchemy 2.x Models & Migrations)* |
| **Vishwajeet** | **UI/UX + Testing / QA Lead** | `feature/ui-testing` | `backend/tests/` *(Backend Unit & Integration Tests)*<br>`tests/e2e/` *(Playwright Browser E2E Tests)*<br>`frontend/components/__tests__/` *(Component UI Tests)*<br>`docs/` *(UI/UX Specs, Test Matrices & User Flows)* |

---

# SECTION 1 — Welcome & Role Definition

Welcome to the **FoodSync AI** engineering team, Lokeshwari!

As the **Database Developer**, you are the guardian of the platform's data layer. Every food listing, recipient profile, heuristic match, in-app notification, and impact log depends on the schemas, models, and queries you design.

### Your High-Level Responsibilities:
1. **SQLAlchemy 2.x ORM Models**: Define declarative Python models in `backend/app/models/` mapping directly to PostgreSQL tables.
2. **Data Access Repository Layer**: Build clean, reusable repository classes in `backend/app/repositories/` encapsulating queries and transactions.
3. **Alembic Database Migrations**: Create, review, and maintain versioned database migration scripts in `backend/alembic/`.
4. **Data Integrity & Constraints**: Enforce strict relational integrity using foreign keys, check constraints ($quantity > 0$, valid coordinate bounds), unique constraints, and optimized indexes.
5. **Concurrency & Safe Reservations**: Design row-level locking and atomic transactional patterns to prevent double-reservations.
6. **Data Privacy Support**: Ensure sensitive columns (`pickup_address`, `phone`, `special_instructions`) are stored cleanly and isolated from public leakage.

---

# SECTION 2 — What You Own

Lokeshwari has primary development and implementation ownership over the following directories:

```text
backend/
├── alembic/                           # ⭐ Alembic database migration environment
│   ├── env.py                         # Migration runtime environment configuration
│   ├── script.py.mako                 # Migration revision template
│   └── versions/                      # Version-controlled Python migration scripts
│       └── 001_initial_schema.py      # Core tables creation migration
│
└── app/
    ├── models/                        # ⭐ SQLAlchemy 2.x ORM declarative models
    │   ├── enums.py                   # Python enum types (FoodType, DonationStatus, UserRole)
    │   ├── user.py                    # User model (Authentication, base profiles, roles)
    │   ├── donation.py                # FoodDonation model (Surplus food listings & lifecycle)
    │   ├── recipient.py               # RecipientProfile model (Capacities, dietary preferences)
    │   ├── match.py                   # Match model (Pairings, compatibility scores, factors)
    │   ├── notification.py            # Notification model (In-app user alerts)
    │   └── impact.py                  # ImpactLog model (Rescued meals, CO2 metrics)
    │
    └── repositories/                  # ⭐ Data Access Layer (Repositories)
        ├── base_repo.py               # Generic CRUD repository interface
        ├── user_repo.py               # User query & credential retrieval methods
        ├── donation_repo.py           # Donation queries, status filters, spatial lookups
        ├── recipient_repo.py          # Recipient capacity lookups & radius filters
        ├── match_repo.py              # Match creation, candidate ranking, acceptance queries
        ├── notification_repo.py       # User notification feed & mark-as-read updates
        └── impact_repo.py             # Global and user-level impact aggregations
```

---

# SECTION 3 — What You Do NOT Own

To prevent overlap and maintain clear team boundaries, Lokeshwari does **not** modify or own:

| Area / Directory | Primary Owner | Why Lokeshwari Does NOT Own It |
| :--- | :--- | :--- |
| `backend/app/api/` | **Shubham** (`feature/backend`) | Shubham builds the FastAPI HTTP route handlers and controllers. |
| `backend/app/schemas/` | **Shubham** (`feature/backend`) | Shubham defines Pydantic request/response validation schemas. |
| `backend/app/services/` | **Shubham** (`feature/backend`) | Shubham implements business domain services (calling Lokeshwari's repositories). |
| `backend/app/services/matching/` | **Shruti** (`feature/ai-matching`) | Shruti designs the mathematical scoring algorithm and heuristic weights. |
| `backend/tests/` | **Vishwajeet** (`feature/ui-testing`) | Vishwajeet owns test case authoring and Pytest suites (Lokeshwari helps provide fixtures). |
| `frontend/` | **Atharva** (`feature/frontend`) | Atharva builds the Next.js client. Frontend **never** connects directly to PostgreSQL. |

---

# SECTION 4 — Database Architecture & ERD

FoodSync AI uses a single authoritative relational database schema documented in [`docs/DATABASE_SCHEMA.md`](file:///Users/shrutikondabathula/FoodSync-AI/docs/DATABASE_SCHEMA.md).

### Why PostgreSQL 15+ is the Chosen Database:
- **Relational ACID Transactions**: Essential for atomic match reservations where status updates, match state transitions, and notification dispatch must succeed together or roll back completely.
- **Strict Data Integrity**: Strong column types, check constraints, foreign keys, and unique indexes guarantee no invalid data enters the system.
- **Geospatial & JSONB Capabilities**: PostgreSQL natively supports coordinate math and structured `JSONB` storage for flexible match factors and storage types.
- **Row-Level Locking**: Features like `SELECT ... FOR UPDATE` protect against race conditions when multiple charities attempt to reserve the same surplus meals simultaneously.

```mermaid
erDiagram
    USERS ||--o{ FOOD_DONATIONS : "posts (as provider)"
    USERS ||--o| RECIPIENT_PROFILES : "configures (as recipient)"
    USERS ||--o{ MATCHES : "matched candidate (as recipient)"
    USERS ||--o{ NOTIFICATIONS : "receives"
    FOOD_DONATIONS ||--o{ MATCHES : "generates matches"
    FOOD_DONATIONS ||--o| IMPACT_LOGS : "completed redistribution"
    MATCHES ||--o| IMPACT_LOGS : "accepted match record"
    MATCHES ||--o{ NOTIFICATIONS : "triggers alert"

    USERS {
        string id PK "VARCHAR(36)"
        string email UK "VARCHAR(255)"
        string password_hash "VARCHAR(255) [Argon2id]"
        string role "FOOD_PROVIDER | RECIPIENT | ADMIN"
        string organization_name "VARCHAR(255)"
        string phone "VARCHAR(32) [Private]"
        string address "TEXT [Private]"
        float latitude "DOUBLE PRECISION"
        float longitude "DOUBLE PRECISION"
        boolean is_verified "BOOLEAN"
        timestamp created_at "TIMESTAMPTZ"
        timestamp updated_at "TIMESTAMPTZ"
    }

    FOOD_DONATIONS {
        string id PK "VARCHAR(36)"
        string provider_id FK "VARCHAR(36)"
        string title "VARCHAR(255)"
        string food_type "VEGETARIAN_COOKED | NON_VEGETARIAN_COOKED | PACKAGED_GROCERY | PRODUCE_RAW | BAKERY"
        boolean perishable "BOOLEAN"
        integer quantity_meals "INTEGER"
        timestamp prepared_at "TIMESTAMPTZ"
        timestamp expiry_time "TIMESTAMPTZ"
        string pickup_address "TEXT [Private]"
        float latitude "DOUBLE PRECISION"
        float longitude "DOUBLE PRECISION"
        text special_instructions "TEXT [Private, Nullable]"
        string status "AVAILABLE | RESERVED | COMPLETED | EXPIRED | CANCELLED"
        timestamp created_at "TIMESTAMPTZ"
        timestamp updated_at "TIMESTAMPTZ"
    }

    RECIPIENT_PROFILES {
        string id PK "VARCHAR(36)"
        string user_id FK,UK "VARCHAR(36)"
        string org_type "SHELTER | FOOD_BANK | COMMUNITY_KITCHEN | ORPHANAGE"
        integer daily_capacity_meals "INTEGER"
        jsonb storage_types "JSONB (e.g. ['DRY', 'REFRIGERATED'])"
        string dietary_preferences "ALL | VEGETARIAN_ONLY | VEGAN_ONLY"
        float max_travel_distance_km "DOUBLE PRECISION"
        string operating_hours "VARCHAR(128) [Nullable]"
        timestamp created_at "TIMESTAMPTZ"
        timestamp updated_at "TIMESTAMPTZ"
    }

    MATCHES {
        string id PK "VARCHAR(36)"
        string donation_id FK "VARCHAR(36)"
        string recipient_id FK "VARCHAR(36)"
        float compatibility_score "FLOAT"
        float distance_km "DOUBLE PRECISION"
        jsonb matched_factors "JSONB [Nullable]"
        string status "PROPOSED | NOTIFIED | ACCEPTED | REJECTED | EXPIRED"
        timestamp created_at "TIMESTAMPTZ"
        timestamp updated_at "TIMESTAMPTZ"
    }

    NOTIFICATIONS {
        string id PK "VARCHAR(36)"
        string user_id FK "VARCHAR(36)"
        string match_id FK "VARCHAR(36) [Nullable]"
        string title "VARCHAR(255)"
        text message "TEXT"
        string type "MATCH_ALERT | RESERVATION_CONFIRMATION | EXPIRY_WARNING | SYSTEM"
        boolean is_read "BOOLEAN"
        timestamp created_at "TIMESTAMPTZ"
    }

    IMPACT_LOGS {
        string id PK "VARCHAR(36)"
        string donation_id FK,UK "VARCHAR(36)"
        string match_id FK,UK "VARCHAR(36)"
        integer meals_rescued "INTEGER"
        float food_weight_kg "DOUBLE PRECISION"
        float co2_savings_kg "DOUBLE PRECISION"
        timestamp logged_at "TIMESTAMPTZ"
    }
```

---

# SECTION 5 — PostgreSQL Basics (Beginner Guide)

If you are new to relational databases, here is a simple guide to fundamental concepts:

| Database Term | Plain English Definition | FoodSync AI Example |
| :--- | :--- | :--- |
| **Database** | An organized collection of structured data stored securely on a server. | The `foodsync_db` PostgreSQL database. |
| **Table** | A structured grid containing data of a specific type (like a spreadsheet tab). | `food_donations` table storing all surplus listings. |
| **Row (Record)** | A single entry or item in a table. | One specific donation of 50 packed biryani meals. |
| **Column (Field)** | A specific attribute of data with a defined data type. | `quantity_meals` (Integer), `status` (String). |
| **Primary Key (PK)**| A unique identifier ensuring no two rows are identical. | `id = "don_987abc"` uniquely identifying a donation. |
| **Foreign Key (FK)**| A column linking a row in one table to a row in another table. | `provider_id` in `food_donations` referencing `id` in `users`. |
| **Relationship** | The logical connection between tables (1:1, 1:Many, Many:Many). | One Food Provider has Many Food Donations (1:M). |
| **Constraint** | A rule enforced by the database to reject invalid data. | `CHECK (quantity_meals > 0)` rejects negative meal inputs. |
| **Transaction** | A bundle of SQL steps that either all succeed or all fail together (ACID). | Marking donation `RESERVED` and match `ACCEPTED` in one step. |
| **Index** | A quick-lookup data structure that speeds up search queries. | `CREATE INDEX idx_donations_status ON food_donations(status);` |
| **ORM** | Object-Relational Mapping: lets you interact with database tables using Python classes. | `donation = session.get(FoodDonation, "don_123")` |
| **Migration** | A versioned script that updates the database schema safely over time. | Alembic script adding a new column to PostgreSQL. |
| **Repository** | A Python class containing database queries, keeping SQL out of route handlers. | `DonationRepository.get_active_donations()`. |

---

# SECTION 6 — SQLAlchemy 2.x Architecture

FoodSync AI uses modern **SQLAlchemy 2.0+** with declarative mapping:

```python
# Conceptual example of SQLAlchemy 2.x Declarative Base:
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, DateTime, ForeignKey, CheckConstraint
from datetime import datetime, timezone
import uuid

class Base(DeclarativeBase):
    pass
```

### Core SQLAlchemy Principles in FoodSync:
1. **Explicit Typing**: Use `Mapped[str]`, `Mapped[int]`, `Mapped[datetime]` for clean IDE type inference.
2. **Standard IDs**: All primary keys are strings (`VARCHAR(36)`) generated via UUID4 / CUID.
3. **Timezones**: All timestamp columns strictly use `TIMESTAMPTZ` (UTC) via `DateTime(timezone=True)`.
4. **Session Management**: Repositories accept an active `Session` object injected by FastAPI's `Depends(get_db)`.

---

# SECTION 7 — Database Models Breakdown (`backend/app/models/`)

Below is the authoritative specification for all 6 core MVP models:

### 1. `User` Model (`backend/app/models/user.py`)
- **Table**: `users`
- **Columns**:
  - `id`: `VARCHAR(36)`, Primary Key.
  - `email`: `VARCHAR(255)`, Unique, Not Null, Indexed.
  - `password_hash`: `VARCHAR(255)`, Not Null (Argon2id hash string).
  - `role`: `VARCHAR(32)`, Check Constraint: `role IN ('FOOD_PROVIDER', 'RECIPIENT', 'ADMIN')`.
  - `organization_name`: `VARCHAR(255)`, Not Null.
  - `phone`: `VARCHAR(32)`, Not Null (*Private Sensitive*).
  - `address`: `TEXT`, Not Null (*Private Sensitive*).
  - `latitude`: `DOUBLE PRECISION`, Check Constraint: `latitude BETWEEN -90.0 AND 90.0`.
  - `longitude`: `DOUBLE PRECISION`, Check Constraint: `longitude BETWEEN -180.0 AND 180.0`.
  - `is_verified`: `BOOLEAN`, Default `False`.
  - `created_at`, `updated_at`: `TIMESTAMPTZ`, Default `CURRENT_TIMESTAMP`.

### 2. `FoodDonation` Model (`backend/app/models/donation.py`)
- **Table**: `food_donations`
- **Columns**:
  - `id`: `VARCHAR(36)`, Primary Key.
  - `provider_id`: `VARCHAR(36)`, Foreign Key (`users.id`, `ON DELETE RESTRICT`).
  - `title`: `VARCHAR(255)`, Not Null.
  - `food_type`: `VARCHAR(64)`, Check Constraint (`VEGETARIAN_COOKED`, `NON_VEGETARIAN_COOKED`, `PACKAGED_GROCERY`, `PRODUCE_RAW`, `BAKERY`).
  - `perishable`: `BOOLEAN`, Default `True`.
  - `quantity_meals`: `INTEGER`, Check Constraint: `quantity_meals > 0` (*Harmonized Unit*).
  - `prepared_at`: `TIMESTAMPTZ`, Not Null.
  - `expiry_time`: `TIMESTAMPTZ`, Not Null, Indexed.
  - `pickup_address`: `TEXT`, Not Null (*Private Sensitive*).
  - `latitude`, `longitude`: `DOUBLE PRECISION`, Valid Coordinate Bounds.
  - `special_instructions`: `TEXT`, Nullable (*Private Sensitive*).
  - `status`: `VARCHAR(32)`, Check Constraint (`AVAILABLE`, `RESERVED`, `COMPLETED`, `EXPIRED`, `CANCELLED`), Default `AVAILABLE`, Indexed.
  - `created_at`, `updated_at`: `TIMESTAMPTZ`.

### 3. `RecipientProfile` Model (`backend/app/models/recipient.py`)
- **Table**: `recipient_profiles`
- **Columns**:
  - `id`: `VARCHAR(36)`, Primary Key.
  - `user_id`: `VARCHAR(36)`, Unique, Foreign Key (`users.id`, `ON DELETE CASCADE`).
  - `org_type`: `VARCHAR(64)`, Check Constraint (`SHELTER`, `FOOD_BANK`, `COMMUNITY_KITCHEN`, `ORPHANAGE`).
  - `daily_capacity_meals`: `INTEGER`, Check Constraint: `daily_capacity_meals >= 0` (*Harmonized Unit*).
  - `storage_types`: `JSONB`, Default `'["DRY"]'::jsonb`.
  - `dietary_preferences`: `VARCHAR(64)`, Check Constraint (`ALL`, `VEGETARIAN_ONLY`, `VEGAN_ONLY`), Default `ALL`.
  - `max_travel_distance_km`: `DOUBLE PRECISION`, Default `15.0`, Check: `> 0.0`.
  - `operating_hours`: `VARCHAR(128)`, Nullable.
  - `created_at`, `updated_at`: `TIMESTAMPTZ`.

### 4. `Match` Model (`backend/app/models/match.py`)
- **Table**: `matches`
- **Columns**:
  - `id`: `VARCHAR(36)`, Primary Key.
  - `donation_id`: `VARCHAR(36)`, Foreign Key (`food_donations.id`, `ON DELETE CASCADE`).
  - `recipient_id`: `VARCHAR(36)`, Foreign Key (`users.id`, `ON DELETE CASCADE`).
  - `compatibility_score`: `FLOAT`, Check: `BETWEEN 0.0 AND 1.0`.
  - `distance_km`: `DOUBLE PRECISION`, Check: `>= 0.0`.
  - `matched_factors`: `JSONB`, Nullable (Stores sub-scores: distance, urgency, capacity fit).
  - `status`: `VARCHAR(32)`, Check Constraint (`PROPOSED`, `NOTIFIED`, `ACCEPTED`, `REJECTED`, `EXPIRED`), Default `PROPOSED`.
  - `created_at`, `updated_at`: `TIMESTAMPTZ`.
- **Unique Constraint**: `UNIQUE(donation_id, recipient_id)` *(Prevents duplicate matches).*

### 5. `Notification` Model (`backend/app/models/notification.py`)
- **Table**: `notifications`
- **Columns**:
  - `id`: `VARCHAR(36)`, Primary Key.
  - `user_id`: `VARCHAR(36)`, Foreign Key (`users.id`, `ON DELETE CASCADE`).
  - `match_id`: `VARCHAR(36)`, Foreign Key (`matches.id`, `ON DELETE SET NULL`), Nullable.
  - `title`: `VARCHAR(255)`, Not Null.
  - `message`: `TEXT`, Not Null.
  - `type`: `VARCHAR(64)`, Check Constraint (`MATCH_ALERT`, `RESERVATION_CONFIRMATION`, `EXPIRY_WARNING`, `SYSTEM`).
  - `is_read`: `BOOLEAN`, Default `False`, Indexed with `user_id`.
  - `created_at`: `TIMESTAMPTZ`.

### 6. `ImpactLog` Model (`backend/app/models/impact.py`)
- **Table**: `impact_logs`
- **Columns**:
  - `id`: `VARCHAR(36)`, Primary Key.
  - `donation_id`: `VARCHAR(36)`, Unique, Foreign Key (`food_donations.id`, `ON DELETE RESTRICT`).
  - `match_id`: `VARCHAR(36)`, Unique, Foreign Key (`matches.id`, `ON DELETE RESTRICT`).
  - `meals_rescued`: `INTEGER`, Check: `> 0`.
  - `food_weight_kg`: `DOUBLE PRECISION`, Check: `> 0.0` ($\text{meals} \times 0.5\text{ kg}$).
  - `co2_savings_kg`: `DOUBLE PRECISION`, Check: `>= 0.0` ($\text{weight} \times 2.5\text{ kg}$).
  - `logged_at`: `TIMESTAMPTZ`.

---

# SECTION 8 — Relationships & Cascade Rules

Understanding deletion behavior is vital to preventing orphaned rows and accidental data loss:

```text
┌──────────────────────────────────────┬────────────────────────┬────────────────────────────────────────────┐
│ Parent -> Child Entity               │ Cascade Action         │ Reason / Rule                              │
├──────────────────────────────────────┼────────────────────────┼────────────────────────────────────────────┤
│ User -> RecipientProfile             │ ON DELETE CASCADE      │ Profile belongs 100% to the user account.  │
│ User -> FoodDonations                │ ON DELETE RESTRICT     │ Cannot delete a user with active listings. │
│ FoodDonation -> Matches              │ ON DELETE CASCADE      │ If listing deleted, pending matches vanish.│
│ User -> Matches                      │ ON DELETE CASCADE      │ If recipient deleted, their matches vanish.│
│ User -> Notifications                │ ON DELETE CASCADE      │ Alerts belong strictly to the user.        │
│ Match -> Notifications               │ ON DELETE SET NULL     │ Alert remains visible even if match drops. │
│ FoodDonation -> ImpactLog            │ ON DELETE RESTRICT     │ Completed impact audit records are forever!│
└──────────────────────────────────────┴────────────────────────┴────────────────────────────────────────────┘
```

---

# SECTION 9 — Database Constraints & Indexing Strategy

Lokeshwari ensures high performance and data validity by configuring indexes and constraints:

### 1. Mandatory Indexes
```sql
-- Fast user authentication lookup
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_location ON users(latitude, longitude);

-- Active donation querying & expiry cron checks
CREATE INDEX idx_donations_status ON food_donations(status);
CREATE INDEX idx_donations_provider ON food_donations(provider_id);
CREATE INDEX idx_donations_expiry ON food_donations(expiry_time);
CREATE INDEX idx_donations_location ON food_donations(latitude, longitude);

-- Fast recipient match feed rendering
CREATE INDEX idx_matches_recipient_status ON matches(recipient_id, status);
CREATE INDEX idx_matches_donation_status ON matches(donation_id, status);
CREATE INDEX idx_matches_score ON matches(compatibility_score DESC);

-- Fast unread notification polling
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
```

### 2. Business Check Constraints
- `quantity_meals > 0`: Rejects negative or zero meal amounts at the database level.
- `daily_capacity_meals >= 0`: Rejects negative capacity values.
- `latitude BETWEEN -90.0 AND 90.0` & `longitude BETWEEN -180.0 AND 180.0`: Prevents invalid GPS data.
- `compatibility_score BETWEEN 0.0 AND 1.0`: Enforces normalized score ranges.

---

# SECTION 10 — Repository Pattern (`backend/app/repositories/`)

Shubham's business services will call Lokeshwari's repositories. Here is the standard repository structure:

```python
# Conceptual example: backend/app/repositories/donation_repo.py
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.donation import FoodDonation
from app.models.enums import DonationStatus
from typing import Optional, List

class DonationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, donation_id: str) -> Optional[FoodDonation]:
        return self.db.get(FoodDonation, donation_id)

    def get_by_id_for_update(self, donation_id: str) -> Optional[FoodDonation]:
        """Locks row for reservation transaction (prevents race conditions)."""
        stmt = (
            select(FoodDonation)
            .where(FoodDonation.id == donation_id)
            .with_for_update()
        )
        return self.db.scalars(stmt).first()

    def list_available_donations(self) -> List[FoodDonation]:
        stmt = select(FoodDonation).where(FoodDonation.status == DonationStatus.AVAILABLE)
        return list(self.db.scalars(stmt).all())

    def update_status(self, donation_id: str, new_status: DonationStatus) -> Optional[FoodDonation]:
        donation = self.get_by_id(donation_id)
        if donation:
            donation.status = new_status
            self.db.flush()
        return donation
```

---

# SECTION 11 — Transactions & Concurrency Control

When a recipient accepts a match (`POST /api/v1/matches/{id}/accept`), multiple database operations must happen **atomically**:

```mermaid
sequenceDiagram
    autonumber
    participant Svc as ReservationService (Shubham)
    participant Repo as DonationRepo (Lokeshwari)
    participant DB as PostgreSQL Database

    Svc->>DB: BEGIN Transaction
    Svc->>Repo: get_by_id_for_update(donation_id)
    Repo->>DB: SELECT * FROM food_donations WHERE id = :id FOR UPDATE
    Note over DB: PostgreSQL locks the donation row
    alt Donation status is NOT 'AVAILABLE'
        Svc->>DB: ROLLBACK Transaction
        Svc-->>Svc: Raise 409 Conflict
    else Donation is AVAILABLE
        Svc->>DB: UPDATE food_donations SET status = 'RESERVED'
        Svc->>DB: UPDATE matches SET status = 'ACCEPTED' WHERE id = :match_id
        Svc->>DB: UPDATE matches SET status = 'REJECTED' WHERE donation_id = :donation_id AND id != :match_id
        Svc->>DB: INSERT INTO notifications (...)
        Svc->>DB: COMMIT Transaction
        Note over DB: Row lock released cleanly
    end
```

> [!IMPORTANT]
> **Why Row Locking Matters**: If two charities click "Accept Match" at the exact same millisecond, row locking (`FOR UPDATE`) ensures PostgreSQL evaluates them sequentially. The first transaction reserves the food; the second transaction sees `status != AVAILABLE` and safely aborts.

---

# SECTION 12 — Alembic Migrations Lifecycle (`backend/alembic/`)

Alembic provides version control for the database schema. Lokeshwari manages all migrations using this 5-step lifecycle:

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Modify SQLAlchemy Model in backend/app/models/           │
├─────────────────────────────────────────────────────────────┤
│ 2. Generate Revision: alembic revision --autogenerate -m "..."│
├─────────────────────────────────────────────────────────────┤
│ 3. Review Generated Python Script in alembic/versions/     │
├─────────────────────────────────────────────────────────────┤
│ 4. Apply Migration: alembic upgrade head                    │
├─────────────────────────────────────────────────────────────┤
│ 5. Verify PostgreSQL Schema Integrity                       │
└─────────────────────────────────────────────────────────────┘
```

### Golden Migration Rules:
- ❌ **Never edit an existing migration file** that has already been merged into `main`.
- ✅ **Always create a new migration script** for new changes (`alembic revision --autogenerate -m "add_column"`).
- ✅ **Always inspect the autogenerated migration script** before committing to ensure Alembic didn't generate unintended drops.

---

# SECTION 13 — FoodSync Data Lifecycle & Quantity Units

### 1. Strict 5-State Donation Lifecycle
```mermaid
stateDiagram-v2
    [*] --> AVAILABLE : Created by Food Provider
    AVAILABLE --> RESERVED : Accepted by Matched Recipient
    AVAILABLE --> CANCELLED : Cancelled by Provider
    AVAILABLE --> EXPIRED : Reached expiry cutoff time
    RESERVED --> COMPLETED : Physical pickup confirmed
    RESERVED --> CANCELLED : Cancelled before pickup
    RESERVED --> EXPIRED : Expired before pickup
    COMPLETED --> [*] : Terminal State
    CANCELLED --> [*] : Terminal State
    EXPIRED --> [*] : Terminal State
```

> [!CAUTION]
> **There is NO `CLAIMED` status anywhere in the database schema.** The state is strictly `RESERVED` upon match acceptance.

### 2. Quantity Unit Harmonization
To prevent heuristic calculation errors:
- All surplus quantities are stored as **`quantity_meals`** (`INTEGER`).
- All recipient capacities are stored as **`daily_capacity_meals`** (`INTEGER`).
- Incompatible units (e.g. kilograms vs. individual meals) must never be compared without documented conversion logic ($\text{1 meal} \approx 0.5\text{ kg}$).

---

# SECTION 14 — Privacy & Security at the Database Layer

1. **Sensitive Columns**:
   - `users.phone` and `users.address`
   - `food_donations.pickup_address` and `food_donations.special_instructions`
2. **Public / Safe Columns**:
   - `users.latitude` and `users.longitude`
   - `food_donations.latitude` and `food_donations.longitude`
3. **Database Security Invariant**:
   - The database stores exact addresses so that the application can unlock them for authorized pickups.
   - The database layer must never bypass or disable application-level authorization.
   - All database connection credentials (`DATABASE_URL`) must be loaded from `.env` and never hardcoded in repository files.

---

# SECTION 15 — Database Testing & Working with Vishwajeet

**Vishwajeet** (`feature/ui-testing`) is the primary owner and author of test suites under `backend/tests/`.

### Lokeshwari's Role in Testing:
1. **Test Fixtures & Seed Data**: Lokeshwari provides sample data fixtures (`tests/fixtures/sample_data.py`) containing valid mock users, donations, and profiles for tests.
2. **Constraint Verification**: Lokeshwari works with Vishwajeet to ensure test cases verify database constraints (e.g. confirming that creating a donation with `quantity_meals = -5` raises an `IntegrityError`).
3. **Database Test Environment**: Ensuring tests can run against an isolated test database with automated schema setup and teardown.

---

# SECTION 16 — Working with Shubham (Backend Developer)

- **Repository Method Signatures**: Coordinate with Shubham on what methods his domain services need (e.g., `get_available_donations()`, `find_matches_by_recipient()`).
- **Data Types & DTOs**: Ensure repository query results return clean SQLAlchemy model instances or mapped schemas that Shubham's services can serialize without type errors.
- **Session Lifecycle**: Repositories should receive the `Session` from Shubham's route dependencies and avoid manually creating independent engine connections.

---

# SECTION 17 — Working with Shruti (Team Lead & AI)

- **AI Matching Queries**: Coordinate with Shruti to optimize queries for candidate recipients (e.g. filtering by dietary preferences, travel radius, and capacity fit).
- **Index Optimization**: Ensure composite indexes (like `idx_matches_score` and `idx_donations_location`) match the sorting and filtering order of Shruti's heuristic matching engine.

---

# SECTION 18 — Working with Atharva (Frontend Developer)

- **Zero Direct Frontend Access**: Atharva's Next.js application **never** connects directly to PostgreSQL.
- **Schema Changes**: If Atharva needs a new UI field (e.g. `operating_hours`), discuss with Shruti and Shubham first to update `DATABASE_SCHEMA.md` and `API_CONTRACT.md` before updating the models and migrations.

---

# SECTION 19 — Git Workflow for `feature/database`

Lokeshwari works strictly on `feature/database`. **Never commit or push directly to `main`**.

### Daily Step-by-Step Git Commands:

```bash
# 1. Start of day: Check working directory is clean
git status

# 2. Switch to main and pull latest team integration
git switch main
git pull origin main

# 3. Switch to your database feature branch and merge main
git switch feature/database
git merge main

# 4. Work on models in backend/app/models/, repos in backend/app/repositories/, or alembic

# 5. Run tests locally to ensure schema and repository queries work
pytest backend/tests/

# 6. Check modified files
git status
git diff

# 7. Stage and commit with conventional messages
git add backend/app/models/ backend/app/repositories/ backend/alembic/
git commit -m "feat(models): add FoodDonation and RecipientProfile declarative models"

# 8. Push to remote feature branch
git push origin feature/database

# 9. Open a Pull Request on GitHub (feature/database -> main)
```

### Strict Git Rules:
- ❌ **NO `git push --force`** on any branch.
- ❌ **NO direct pushes to `main`**.
- ❌ **NO committing `.env` files, passwords, or database connection strings**.
- ❌ **NO editing other teammates' active branches**.

---

# SECTION 20 — First-Day Checklist for Lokeshwari

- [ ] Clone the repository and checkout `feature/database`.
- [ ] Set up local PostgreSQL server (PostgreSQL 15+).
- [ ] Configure `DATABASE_URL` in your local `.env` file (e.g. `postgresql://postgres:password@localhost:5432/foodsync_db`).
- [ ] Read [`docs/DATABASE_SCHEMA.md`](file:///Users/shrutikondabathula/FoodSync-AI/docs/DATABASE_SCHEMA.md) and [`docs/ARCHITECTURE.md`](file:///Users/shrutikondabathula/FoodSync-AI/docs/ARCHITECTURE.md).
- [ ] Inspect existing placeholder files in `backend/app/models/`, `backend/app/repositories/`, and `backend/alembic/`.
- [ ] Run `pytest backend/tests/` to verify local Python test environment.

---

# SECTION 21 — Common Beginner Database Mistakes to Avoid

1. ❌ **Modifying tables directly in PostgreSQL**: Always use Alembic migrations to keep team environments in sync.
2. ❌ **Forgetting `with_for_update()` during reservations**: Always lock the donation row during status transitions to prevent race conditions.
3. ❌ **Using inconsistent quantity units**: Always store quantities in integer `meals` (never mix raw kg and meal units).
4. ❌ **Missing Foreign Key indexes**: PostgreSQL does not automatically index foreign key columns; always add indexes to FK columns.
5. ❌ **Using the prohibited word `CLAIMED`**: The donation state machine uses `AVAILABLE` $\rightarrow$ `RESERVED` $\rightarrow$ `COMPLETED`.
6. ❌ **Hardcoding database credentials**: Always read database connection parameters from `app.core.config.settings`.

---

# SECTION 22 — Quick Reference & Commands

### Useful Alembic Commands:
```bash
# Generate a new migration script automatically from model changes:
alembic revision --autogenerate -m "create_initial_schema"

# Apply all pending migrations to the database:
alembic upgrade head

# Roll back the most recent migration:
alembic downgrade -1

# View migration history and current database revision:
alembic history --verbose
alembic current
```

### Core Table Reference:
- `users`: Authentication credentials, roles, base geolocation coordinates.
- `food_donations`: Surplus meal listings, pickup coordinates, perishable status, lifecycle status.
- `recipient_profiles`: Capacity in meals, storage facilities (JSONB), dietary preferences, travel radius.
- `matches`: Pairings generated by AI matching engine, compatibility scores, factor breakdowns.
- `notifications`: User alerts, read status, associated match references.
- `impact_logs`: Immutable records of completed donations (meals rescued, $\text{CO}_2$ savings).

---

# SECTION 23 — Questions & Escalation Guide

```text
Have a database model, index, or repository query question?
      ↓
You own it! Check docs/DATABASE_SCHEMA.md and build it.

Have an AI matching query requirement or scoring factor question?
      ↓
Contact SHRUTI (feature/ai-matching)

Have an API endpoint, service integration, or Pydantic serialization question?
      ↓
Contact SHUBHAM (feature/backend)

Have a test fixture, constraint verification, or test failure question?
      ↓
Contact VISHWAJEET (feature/ui-testing)

Have a core architecture, security rule, or project decision question?
      ↓
Contact SHRUTI (Team Lead)
```
