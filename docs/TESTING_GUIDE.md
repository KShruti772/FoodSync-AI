# Testing Guide — FoodSync AI

> **Status**: Architecture Frozen — Single Source of Truth for Automated & QA Testing  
> **Testing Stack**: Pytest + HTTPX (Backend) • Vitest (Frontend) • Playwright (E2E)  
> **Module Owner**: Vishwajeet (`feature/ui-testing`)  
> **Repository**: [KShruti772/FoodSync-AI](https://github.com/KShruti772/FoodSync-AI)

---

## 1. Testing Philosophy & QA Responsibilities

### 1.1 QA Ownership & Role Boundary
- **Vishwajeet's Primary Scope (`feature/ui-testing`)**:
  - Test-case design and test scenario specification across backend contracts and frontend workflows.
  - Manual exploratory testing, accessibility reviews, responsive design verification, and cross-browser checks.
  - End-to-end (E2E) user-journey automated testing with Playwright (`tests/e2e/`).
  - Frontend component test specification and review with Vitest (`frontend/components/__tests__/`).
  - Defect logging, bug reporting to Atharva/Shruti/Lokeshwari, and regression verification.
- **Implementation Responsibilities**:
  - **Shruti (`feature/backend-ai`)**: Implements backend services, FastAPI controllers, matching engine, and executes backend unit/integration tests.
  - **Lokeshwari (`feature/database`)**: Implements SQLAlchemy models, migrations, and repository data-access tests.
  - **Atharva (`feature/frontend`)**: Implements Next.js components, pages, API integration, and resolves frontend UI/UX bugs reported by Vishwajeet.

### 1.2 Focus on Critical Business & Security Paths
- For the MVP, we do **not** mandate arbitrary 100% test coverage metrics.
- We prioritize high-risk, critical paths: **Authentication & RBAC guards, donation state machine transitions (`AVAILABLE` $\rightarrow$ `RESERVED` $\rightarrow$ `COMPLETED`), double-reservation concurrency prevention, deterministic matching calculations, and location privacy masking**.
- All unit and integration tests must run locally in under 15 seconds without requiring external cloud dependencies or message brokers.

---

## 2. Testing Frameworks & Directory Layout

```
FoodSync-AI/
├── backend/tests/                     # Backend & Integration Tests (Pytest + HTTPX)
│   ├── conftest.py                    # Pytest DB session fixtures & FastAPI TestClient
│   ├── unit/                          # Isolated unit tests (no network calls)
│   │   ├── test_matching_engine.py    # Scoring math, distance, and tie-breaking
│   │   ├── test_schemas.py            # Pydantic validation models
│   │   └── test_impact_calc.py        # Impact formulas (meals & CO2)
│   └── integration/                   # Endpoint integration tests (HTTPX AsyncClient)
│       ├── test_auth_routes.py        # Registration & JWT guards
│       ├── test_donations_routes.py   # Donation CRUD & privacy masking
│       ├── test_matches_routes.py     # Match acceptance, rejection & concurrency
│       └── test_notifications_routes.py # In-app notification polling
│
├── frontend/                          # Frontend Component Tests (Vitest)
│   └── components/__tests__/
│       ├── DonationCard.test.tsx      # Privacy masking & rendering
│       └── MatchActionModal.test.tsx  # Accept / reject button interactions
│
└── tests/                             # End-to-End Browser Journeys (Playwright)
    └── e2e/
        └── flows/
            └── donation_to_reservation.spec.ts  # Full provider post -> recipient reservation journey
```

---

## 3. Core Test Scenarios & Test Matrices

### 3.1 Authentication, Roles & Security Test Matrix

| Test ID | Test Case Name | Input / Precondition | Expected Outcome |
| :--- | :--- | :--- | :--- |
| `TC-SEC-01` | **Admin Cannot Self-Register** | `POST /api/v1/auth/register` with `role: "ADMIN"` | `400 Bad Request` (`INVALID_ROLE_OR_INPUT`). Admin role cannot be self-assigned. |
| `TC-SEC-02` | **Valid Provider / Recipient Registration** | `POST /api/v1/auth/register` with `role: "FOOD_PROVIDER"` | `201 Created`, password hashed in DB, JWT token returned. |
| `TC-SEC-03` | **Recipient Cannot Create Donations** | `POST /api/v1/donations` with `RECIPIENT` JWT token | `403 Forbidden` (`PROVIDER_ROLE_REQUIRED`). |
| `TC-SEC-04` | **Cross-Provider Donation Cancellation** | Provider A attempts `POST /api/v1/donations/{id}/cancel` on Provider B's donation | `403 Forbidden` (`NOT_RESOURCE_OWNER`). |
| `TC-SEC-05` | **Tampered JWT Token** | Request with modified signature on bearer token | `401 Unauthorized` (`TOKEN_INVALID`). |
| `TC-SEC-06` | **Expired JWT Token** | Request with timestamp older than 24 hours | `401 Unauthorized` (`TOKEN_EXPIRED`). |
| `TC-SEC-07` | **SQL Injection Sanitization** | `email` input containing `' OR 1=1; --` | Treated as literal string; query safely parameterized by SQLAlchemy. |

---

### 3.2 Food Donation & Privacy Test Matrix

| Test ID | Test Case Name | Input / Precondition | Expected Outcome |
| :--- | :--- | :--- | :--- |
| `TC-DON-01` | **Valid Donation Creation** | Valid provider token, `quantity_meals = 50`, future `expiry_time` | `201 Created`, status `AVAILABLE`, matching runs synchronously. |
| `TC-DON-02` | **Missing Required Fields** | Payload missing `quantity_meals` or `expiry_time` | `422 Unprocessable Entity` (Pydantic validation error). |
| `TC-DON-03` | **Invalid Quantity** | `quantity_meals = -5` or `0` | `422 Unprocessable Entity` (`quantity_meals must be > 0`). |
| `TC-DON-04` | **Past Expiry Time** | `expiry_time` set in the past | `400 Bad Request` (`EXPIRY_TIME_MUST_BE_FUTURE`). |
| `TC-DON-05` | **Pickup Address Masked for Public** | `GET /api/v1/donations` by general authenticated user | `200 OK`, `pickup_address` is **omitted/masked**; returns approximate area only. |
| `TC-DON-06` | **Pickup Address Revealed on Accepted Match**| `GET /api/v1/donations/{id}` by recipient holding `ACCEPTED` match | `200 OK`, exact `pickup_address` and donor `phone` are **unlocked**. |
| `TC-DON-07` | **Cannot Cancel Reserved Donation** | `POST /api/v1/donations/{id}/cancel` on a `RESERVED` donation | `400 Bad Request` (`CANNOT_CANCEL_ACTIVE_OR_COMPLETED_DONATION`). |

---

### 3.3 Matching Engine & Heuristic Scoring Test Matrix

| Test ID | Test Case Name | Input / Precondition | Expected Outcome |
| :--- | :--- | :--- | :--- |
| `TC-MAT-01` | **Same Location Proximity** | Provider & Recipient at exact same coordinates ($d = 0.0\text{ km}$) | $S_{dist} = 1.00$. Distance score maximized. |
| `TC-MAT-02` | **Maximum Radius Boundary** | Recipient distance $d = \text{effective\_radius} = 15.0\text{ km}$ | $S_{dist} = 0.00$. Qualified with minimum distance score. |
| `TC-MAT-03` | **Outside Radius Disqualification** | Recipient distance $d = 15.1\text{ km} > \text{effective\_radius}$ | **Hard-Disqualified**. Candidate omitted from `matches`. |
| `TC-MAT-04` | **Expired / Imminent Expiry** | Donation expiry $T_{remain} = 20\text{ mins} < 30\text{ mins}$ | **Disqualified**. Matching engine returns empty candidate list. |
| `TC-MAT-05` | **Dietary Incompatibility** | Non-veg food donation; Recipient profile is `VEGETARIAN_ONLY` | **Hard-Disqualified**. $S_{pref} = 0.0$, omitted from matches. |
| `TC-MAT-06` | **Storage Incompatibility** | Perishable cooked meal; Recipient `storage_types = '["DRY"]'` | **Hard-Disqualified**. Lacks required refrigeration. |
| `TC-MAT-07` | **Capacity Fit Scoring** | $Q_D = 50\text{ meals}$, Recipient capacity $C_R = 100\text{ meals}$ | $S_{cap} = 1.00$. Ideal fit score. |
| `TC-MAT-08` | **Score Determinism** | Run matching engine 10 times with identical input parameters | Exactly identical compatibility scores ($S_{total}$) across all 10 runs. |
| `TC-MAT-09` | **Ranking & Tie-Breaking** | 2 candidates with identical $S_{total} = 0.85$, $d_1 = 3\text{ km}, d_2 = 5\text{ km}$ | Candidate 1 ranked #1 (Distance tie-breaker). Strict repeatable sorting. |

---

### 3.4 Match Acceptance, Reservation Concurrency & State Machine Test Matrix

| Test ID | Test Case Name | Input / Precondition | Expected Outcome |
| :--- | :--- | :--- | :--- |
| `TC-RES-01` | **Valid Match Acceptance** | Assigned recipient calls `POST /api/v1/matches/{match_id}/accept` | `200 OK`, match $\rightarrow$ `ACCEPTED`, donation $\rightarrow$ `RESERVED`. |
| `TC-RES-02` | **Double Reservation Concurrency Prevention** | Recipient B attempts to accept a match for a donation already `RESERVED` by Recipient A | `409 Conflict` (`DONATION_ALREADY_RESERVED`). Prevents duplicate reservations. |
| `TC-RES-03` | **Expired Donation Cannot Be Accepted**| Recipient attempts to accept a match on a donation past its `expiry_time` | `400 Bad Request` (`MATCH_OR_DONATION_EXPIRED`). |
| `TC-RES-04` | **Valid Match Rejection** | Assigned recipient calls `POST /api/v1/matches/{match_id}/reject` | `200 OK`, match $\rightarrow$ `REJECTED`, next candidate in ranking notified. |
| `TC-RES-05` | **Completion & Impact Logging** | Provider confirms pickup via `POST /api/v1/donations/{id}/complete` | `200 OK`, status $\rightarrow$ `COMPLETED`, immutable row inserted into `impact_logs`. |

---

### 3.5 UI/UX & Frontend Quality Assurance Matrix (Vishwajeet)

| Test Area | Scope & Test Focus | Expected Behavior |
| :--- | :--- | :--- |
| **Loading State** | Initial page loads and async API calls | Skeleton placeholders render without layout shifts; no raw spinners or blank screens. |
| **Empty State** | Zero donations, empty inbox, no notifications | `EmptyState` component renders clear message and relevant CTA button. |
| **Error State** | API 4xx/5xx responses or network failure | User-friendly error alert box with retry button; raw HTTP stack traces hidden. |
| **Success State** | Donation posted, match accepted, pickup confirmed | Color-coded status badge updates and feedback toast displayed. |
| **Disabled State** | Form in-flight submission or invalid form | Action button disabled (`disabled:opacity-50`) to prevent duplicate submits. |
| **Unauthorized State**| Accessing protected route without proper token/role | Graceful redirect to `/login` or unauthorized banner. |
| **Responsive Layouts**| Viewport tests at 375px, 768px, and 1440px | Seamless navigation, hamburger/sidebar menu adaptivity, no horizontal scroll bugs. |
| **Accessibility (a11y)**| Keyboard navigation & screen reader labels | Full Tab/Enter/Esc accessibility, ARIA labels on inputs, WCAG 2.1 AA contrast. |
| **Form Validation** | Donation creation and recipient profile forms | Instant inline feedback for negative meals, past expiry time, or missing fields. |
| **Donor Flow** | Provider journey | Login $\rightarrow$ dashboard $\rightarrow$ create donation $\rightarrow$ view matches $\rightarrow$ complete pickup. |
| **Recipient Flow** | Recipient journey | Login $\rightarrow$ profile setup $\rightarrow$ view in-app alerts $\rightarrow$ inspect match. |
| **Accept / Reject Flow**| Match decision modal | Accept transitions status to `RESERVED` and unlocks address; Reject dismisses offer. |
| **Notification Flow**| In-app notification bell and feed | REST polling updates badge count; clicking alert marks notification as read. |

---

## 4. Test Execution Commands

### Run Backend Unit & Integration Tests:
```bash
# Run all backend tests
pytest

# Run only unit tests (matching math & schemas)
pytest backend/tests/unit/

# Run only endpoint integration tests
pytest backend/tests/integration/

# Run with verbose output and test names
pytest -v
```

### Run Frontend Component Tests:
```bash
cd frontend
npm run test           # Executes Vitest
```

### Run E2E Integration Tests:
```bash
npx playwright test
```

---

## 5. Architectural Status

> [!IMPORTANT]
> **Architecture is frozen; no blocking architectural decisions remain.**
