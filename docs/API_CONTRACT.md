# API Contract — FoodSync AI

> **Status**: Architecture Frozen — Single Source of Truth for REST Contracts  
> **Repository**: [KShruti772/FoodSync-AI](https://github.com/KShruti772/FoodSync-AI)  
> **Base URL**: `/api/v1`  
> **Backend Engine**: Python (FastAPI) + Pydantic + SQLAlchemy 2.x + PostgreSQL 15+

---

## 1. Global API Standards & Protocols

1. **JSON Envelope & Consistency**:
   - **Success Response**: `{ "success": true, "data": { ... }, "message": "..." }`
   - **Error Response**: `{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable description", "details": [] } }`
2. **OpenAPI & Human Contract**:
   - FastAPI automatically generates interactive OpenAPI/Swagger docs at `/docs` as an implementation aid.
   - **This document (`API_CONTRACT.md`) remains the authoritative application contract** for all frontend and backend team members.
3. **Authentication Header**:
   - Protected endpoints require an HTTP `Authorization` header with a signed JWT bearer token:
     ```http
     Authorization: Bearer <jwt-token-string>
     ```
4. **Data Privacy & Location Obfuscation Rule**:
   - Exact `pickup_address`, contact `phone`, and private notes are **never** returned to the public or during general donation browsing.
   - Sensitive pickup details are revealed **only** to:
     - The Food Provider owner of the donation.
     - The Recipient organization holding an `ACCEPTED` match on that donation (`RESERVED` status).
     - An Administrator.
5. **Donation State Machine**:
   $$\text{AVAILABLE} \longrightarrow \text{RESERVED} \longrightarrow \text{COMPLETED}$$
   $$\text{AVAILABLE} \longrightarrow \text{CANCELLED}$$
   $$\text{AVAILABLE / RESERVED} \longrightarrow \text{EXPIRED}$$
   - Direct arbitrary client mutations of the `status` field are strictly forbidden. Transitions occur only through validated lifecycle endpoints (`/cancel`, `/complete`, `/matches/{id}/accept`).
6. **Synchronous Matching Invariant**:
   - The deterministic matching engine runs **synchronously** inside the `POST /api/v1/donations` request cycle.
   - `GET /api/v1/donations/{id}/matches` is a read-only query that retrieves already-generated match records. It causes **zero side effects**.

---

## 2. API Endpoints Summary

| Endpoint | Method | Allowed Roles | Auth Required | Description |
| :--- | :--- | :--- | :---: | :--- |
| **Auth** | | | | |
| `/api/v1/auth/register` | `POST` | Public (`FOOD_PROVIDER`, `RECIPIENT`) | ❌ No | Register new Food Provider or Recipient |
| `/api/v1/auth/login` | `POST` | Public | ❌ No | Authenticate credentials & issue JWT |
| `/api/v1/auth/me` | `GET` | Authenticated (Any) | ✅ Yes | Get current user session & profile info |
| **Donations** | | | | |
| `/api/v1/donations` | `POST` | `FOOD_PROVIDER` | ✅ Yes | Create donation & trigger synchronous matching |
| `/api/v1/donations` | `GET` | Authenticated (Any) | ✅ Yes | List active donations (masked addresses) |
| `/api/v1/donations/{id}` | `GET` | Authenticated (Any) | ✅ Yes | Get single donation details (address masked if unauthorized) |
| `/api/v1/donations/{id}/cancel` | `POST` | `FOOD_PROVIDER` (Owner), `ADMIN` | ✅ Yes | Cancel an `AVAILABLE` donation |
| `/api/v1/donations/{id}/complete`| `POST` | `FOOD_PROVIDER` (Owner), Matched `RECIPIENT`, `ADMIN` | ✅ Yes | Confirm pickup completion (`RESERVED` $\rightarrow$ `COMPLETED`) |
| **Recipients** | | | | |
| `/api/v1/recipients/profile` | `GET` | `RECIPIENT` | ✅ Yes | Get recipient capacity & preference profile |
| `/api/v1/recipients/profile` | `PUT` | `RECIPIENT` | ✅ Yes | Update recipient capacity & preferences |
| `/api/v1/recipients/matches` | `GET` | `RECIPIENT` | ✅ Yes | List candidate matches proposed to this recipient |
| **Matches** | | | | |
| `/api/v1/donations/{id}/matches`| `GET` | `FOOD_PROVIDER` (Owner), `ADMIN` | ✅ Yes | Read-only fetch of computed matches for a donation |
| `/api/v1/matches/{match_id}/accept` | `POST` | `RECIPIENT` (Assigned Candidate) | ✅ Yes | Atomically accept match & reserve donation |
| `/api/v1/matches/{match_id}/reject` | `POST` | `RECIPIENT` (Assigned Candidate) | ✅ Yes | Reject match & allow next candidate to proceed |
| **In-App Notifications** | | | | |
| `/api/v1/notifications` | `GET` | Authenticated (Any) | ✅ Yes | Fetch user's in-app alerts via REST polling |
| `/api/v1/notifications/{id}/read`| `PATCH`| Authenticated (Owner) | ✅ Yes | Mark an in-app notification as read |
| **Impact Metrics** | | | | |
| `/api/v1/impact/summary` | `GET` | Public | ❌ No | Get aggregate rescued meals & CO2 statistics |

---

## 3. Detailed Endpoint Specifications

### 3.1 Authentication

---

#### `POST /api/v1/auth/register`
- **Method**: `POST`
- **Path**: `/api/v1/auth/register`
- **Authentication**: None (Public)
- **Allowed Roles**: `FOOD_PROVIDER`, `RECIPIENT` (*`ADMIN` self-registration is strictly prohibited*).
- **Ownership / Authorization Rules**: Open to unauthenticated guests.

**Request Schema (Pydantic)**:
```python
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["FOOD_PROVIDER", "RECIPIENT"]
    organization_name: str = Field(min_length=2, max_length=255)
    phone: str = Field(min_length=8, max_length=32)
    address: str = Field(min_length=5, max_length=500)
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
```

**Request Body (EXAMPLE DATA ONLY)**:
```json
{
  "email": "contact@greenrestaurant.com",
  "password": "SecurePassword123!",
  "role": "FOOD_PROVIDER",
  "organization_name": "Green Restaurant & Bakery",
  "phone": "+91 9876543210",
  "address": "123 Main Street, Pune, MH",
  "latitude": 18.5204,
  "longitude": 73.8567
}
```

**Response Schema (`201 Created`) (EXAMPLE DATA ONLY)**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "usr_98a7b6c5",
      "email": "contact@greenrestaurant.com",
      "role": "FOOD_PROVIDER",
      "organization_name": "Green Restaurant & Bakery",
      "is_verified": false,
      "created_at": "2026-09-02T12:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Possible HTTP Errors**:
- `400 Bad Request`: Validation failure or attempted registration with `role: "ADMIN"` (`INVALID_ROLE_OR_INPUT`).
- `409 Conflict`: Email already exists in database (`EMAIL_ALREADY_REGISTERED`).

---

#### `POST /api/v1/auth/login`
- **Method**: `POST`
- **Path**: `/api/v1/auth/login`
- **Authentication**: None (Public)
- **Allowed Roles**: Public

**Request Schema (Pydantic)**:
```python
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
```

**Request Body (EXAMPLE DATA ONLY)**:
```json
{
  "email": "contact@greenrestaurant.com",
  "password": "SecurePassword123!"
}
```

**Response (`200 OK`) (EXAMPLE DATA ONLY)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "usr_98a7b6c5",
      "email": "contact@greenrestaurant.com",
      "role": "FOOD_PROVIDER",
      "organization_name": "Green Restaurant & Bakery"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Possible HTTP Errors**:
- `401 Unauthorized`: Generic failure message: `"Invalid email or password"` (`INVALID_CREDENTIALS`). Prevents account enumeration.

---

#### `GET /api/v1/auth/me`
- **Method**: `GET`
- **Path**: `/api/v1/auth/me`
- **Authentication**: Bearer Token
- **Allowed Roles**: Any authenticated user

**Response (`200 OK`) (EXAMPLE DATA ONLY)**:
```json
{
  "success": true,
  "data": {
    "id": "usr_98a7b6c5",
    "email": "contact@greenrestaurant.com",
    "role": "FOOD_PROVIDER",
    "organization_name": "Green Restaurant & Bakery",
    "phone": "+91 9876543210",
    "is_verified": true
  }
}
```

**Possible HTTP Errors**:
- `401 Unauthorized`: Missing or invalid token (`TOKEN_INVALID`).

---

### 3.2 Food Donations

---

#### `POST /api/v1/donations`
- **Method**: `POST`
- **Path**: `/api/v1/donations`
- **Authentication**: Bearer Token
- **Allowed Roles**: `FOOD_PROVIDER`
- **Ownership / Authorization Rules**: Authenticated user ID is attached as `provider_id`.
- **Side Effects**: Synchronously executes the deterministic matching engine and creates ranked entries in the `matches` table and `notifications` table.

**Request Schema (Pydantic)**:
```python
class DonationCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    food_type: Literal["VEGETARIAN_COOKED", "NON_VEGETARIAN_COOKED", "PACKAGED_GROCERY", "PRODUCE_RAW", "BAKERY"]
    perishable: bool = True
    quantity_meals: int = Field(gt=0)
    prepared_at: datetime
    expiry_time: datetime
    pickup_address: str = Field(min_length=5, max_length=500)
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    special_instructions: Optional[str] = None
```

**Request Body (EXAMPLE DATA ONLY)**:
```json
{
  "title": "50 Veg Lunch Meals Surplus",
  "food_type": "VEGETARIAN_COOKED",
  "perishable": true,
  "quantity_meals": 50,
  "prepared_at": "2026-09-02T13:00:00Z",
  "expiry_time": "2026-09-02T19:00:00Z",
  "pickup_address": "123 Main Street, Suite 4B, Pune, MH",
  "latitude": 18.5204,
  "longitude": 73.8567,
  "special_instructions": "Thermal packed containers. Contact manager at front desk."
}
```

**Response (`201 Created`) (EXAMPLE DATA ONLY)**:
```json
{
  "success": true,
  "message": "Donation created and matched successfully",
  "data": {
    "donation": {
      "id": "don_11223344",
      "provider_id": "usr_98a7b6c5",
      "title": "50 Veg Lunch Meals Surplus",
      "food_type": "VEGETARIAN_COOKED",
      "quantity_meals": 50,
      "status": "AVAILABLE",
      "expiry_time": "2026-09-02T19:00:00Z",
      "created_at": "2026-09-02T14:00:00Z"
    },
    "matches_generated_count": 2
  }
}
```

**Possible HTTP Errors**:
- `400 Bad Request`: `expiry_time` is in the past, or expires within 30 minutes (`EXPIRY_TIME_INVALID`).
- `401 Unauthorized`: Token missing or expired.
- `403 Forbidden`: Authenticated user is not a `FOOD_PROVIDER`.

---

#### `GET /api/v1/donations`
- **Method**: `GET`
- **Path**: `/api/v1/donations`
- **Authentication**: Bearer Token
- **Allowed Roles**: Any Authenticated User
- **Privacy Enforcement**: For users who are neither the provider owner nor an accepted recipient, `pickup_address` and `special_instructions` are stripped/masked.

**Query Parameters**:
- `status` (optional, default `AVAILABLE`): `AVAILABLE`, `RESERVED`, `COMPLETED`
- `limit` (optional, default 20, max 100)
- `page` (optional, default 1)

**Response (`200 OK`) (EXAMPLE DATA ONLY)**:
```json
{
  "success": true,
  "data": {
    "donations": [
      {
        "id": "don_11223344",
        "title": "50 Veg Lunch Meals Surplus",
        "food_type": "VEGETARIAN_COOKED",
        "quantity_meals": 50,
        "status": "AVAILABLE",
        "approximate_location": "Pune Central (approx. 2.4 km away)",
        "expiry_time": "2026-09-02T19:00:00Z",
        "created_at": "2026-09-02T14:00:00Z"
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 20 }
  }
}
```

---

#### `GET /api/v1/donations/{id}`
- **Method**: `GET`
- **Path**: `/api/v1/donations/{id}`
- **Authentication**: Bearer Token
- **Privacy Enforcement**: Full `pickup_address` and `special_instructions` are included **only** if requester is the provider owner, admin, or the recipient with an `ACCEPTED` match on this donation.

**Response (`200 OK`) (EXAMPLE DATA ONLY)**:
```json
{
  "success": true,
  "data": {
    "id": "don_11223344",
    "provider_id": "usr_98a7b6c5",
    "title": "50 Veg Lunch Meals Surplus",
    "food_type": "VEGETARIAN_COOKED",
    "quantity_meals": 50,
    "status": "RESERVED",
    "pickup_address": "123 Main Street, Suite 4B, Pune, MH",
    "special_instructions": "Thermal packed containers. Contact manager at front desk.",
    "expiry_time": "2026-09-02T19:00:00Z",
    "created_at": "2026-09-02T14:00:00Z"
  }
}
```

**Possible HTTP Errors**:
- `404 Not Found`: Donation not found (`DONATION_NOT_FOUND`).

---

#### `POST /api/v1/donations/{id}/cancel`
- **Method**: `POST`
- **Path**: `/api/v1/donations/{id}/cancel`
- **Authentication**: Bearer Token
- **Allowed Roles**: `FOOD_PROVIDER` (Owner), `ADMIN`
- **Ownership / Authorization Rules**: Only the provider who created the donation (or Admin) can cancel it.
- **State Machine Rule**: Donation must currently be in `AVAILABLE` status.

**Request Body (Pydantic)**:
```python
class DonationCancelRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=255)
```

**Response (`200 OK`) (EXAMPLE DATA ONLY)**:
```json
{
  "success": true,
  "message": "Donation cancelled successfully",
  "data": {
    "donation_id": "don_11223344",
    "status": "CANCELLED"
  }
}
```

**Possible HTTP Errors**:
- `400 Bad Request`: Donation is already `RESERVED` or `COMPLETED` (`CANNOT_CANCEL_ACTIVE_OR_COMPLETED_DONATION`).
- `403 Forbidden`: Requester is not the owner (`NOT_RESOURCE_OWNER`).

---

#### `POST /api/v1/donations/{id}/complete`
- **Method**: `POST`
- **Path**: `/api/v1/donations/{id}/complete`
- **Authentication**: Bearer Token
- **Allowed Roles**: `FOOD_PROVIDER` (Owner), Matched `RECIPIENT` (holding `ACCEPTED` match), `ADMIN`
- **State Machine Rule**: Donation status must be `RESERVED`. Transitions status to `COMPLETED` and creates an immutable record in `impact_logs`.

**Request Body (Pydantic)**:
```python
class DonationCompleteRequest(BaseModel):
    confirmed_quantity_meals: Optional[int] = None
    notes: Optional[str] = None
```

**Response (`200 OK`) (EXAMPLE DATA ONLY)**:
```json
{
  "success": true,
  "message": "Donation completed and impact logged",
  "data": {
    "donation_id": "don_11223344",
    "status": "COMPLETED",
    "impact": {
      "meals_served": 50,
      "co2_savings_kg": 62.5
    }
  }
}
```

**Possible HTTP Errors**:
- `400 Bad Request`: Donation is not in `RESERVED` status (`DONATION_NOT_RESERVED`).
- `403 Forbidden`: Requester is not party to this transaction (`UNAUTHORIZED_PARTY`).

---

### 3.3 Match Queries & Actions

---

#### `GET /api/v1/donations/{id}/matches`
- **Method**: `GET`
- **Path**: `/api/v1/donations/{id}/matches`
- **Authentication**: Bearer Token
- **Allowed Roles**: `FOOD_PROVIDER` (Owner), `ADMIN`
- **Behavior**: Pure read-only query. Fetches the pre-calculated matches from the `matches` table generated during donation creation. **Causes NO side effects.**

**Response (`200 OK`) (EXAMPLE DATA ONLY)**:
```json
{
  "success": true,
  "data": {
    "donation_id": "don_11223344",
    "matches": [
      {
        "match_id": "mat_554433",
        "recipient_id": "usr_rcp_001",
        "recipient_name": "Hope Children Shelter",
        "compatibility_score": 0.92,
        "distance_km": 2.4,
        "status": "PROPOSED",
        "matched_factors": {
          "distance_score": 0.84,
          "urgency_score": 1.00,
          "capacity_fit_score": 1.00,
          "dietary_preference_score": 1.00
        }
      }
    ]
  }
}
```

**Possible HTTP Errors**:
- `403 Forbidden`: Requester is not the owner of the donation.
- `404 Not Found`: Donation does not exist.

---

#### `POST /api/v1/matches/{match_id}/accept`
- **Method**: `POST`
- **Path**: `/api/v1/matches/{match_id}/accept`
- **Authentication**: Bearer Token
- **Allowed Roles**: `RECIPIENT`
- **Ownership / Authorization Rules**: The authenticated user must be the `recipient_id` assigned to this match record.
- **Atomic Transaction Invariants**:
  1. Verifies match exists and is in `PROPOSED` or `NOTIFIED` status.
  2. Verifies associated donation is still in `AVAILABLE` status.
  3. Updates match status to `ACCEPTED`.
  4. Updates donation status to `RESERVED`.
  5. Updates all competing matches for this donation to `EXPIRED` to prevent race conditions or double claims.
  6. Emits an in-app notification to the Food Provider.
  7. Returns full pickup address and donor contact information.

**Request Schema (Pydantic)**:
```python
class MatchAcceptRequest(BaseModel):
    estimated_pickup_time: datetime
    notes: Optional[str] = Field(None, max_length=255)
```

**Request Body (EXAMPLE DATA ONLY)**:
```json
{
  "estimated_pickup_time": "2026-09-02T16:00:00Z",
  "notes": "Volunteer van will arrive by 4:00 PM."
}
```

**Response (`200 OK`) (EXAMPLE DATA ONLY)**:
```json
{
  "success": true,
  "message": "Match accepted. Donation reserved successfully.",
  "data": {
    "match_id": "mat_554433",
    "donation_id": "don_11223344",
    "status": "ACCEPTED",
    "donation_status": "RESERVED",
    "pickup_details": {
      "address": "123 Main Street, Suite 4B, Pune, MH",
      "provider_phone": "+91 9876543210",
      "special_instructions": "Thermal packed containers. Contact manager at front desk."
    }
  }
}
```

**Possible HTTP Errors**:
- `409 Conflict`: Donation has already been reserved by another recipient (`DONATION_ALREADY_RESERVED`).
- `400 Bad Request`: Match or donation has expired (`MATCH_OR_DONATION_EXPIRED`).
- `403 Forbidden`: Authenticated recipient is not the assigned candidate for this match (`NOT_ASSIGNED_RECIPIENT`).

---

#### `POST /api/v1/matches/{match_id}/reject`
- **Method**: `POST`
- **Path**: `/api/v1/matches/{match_id}/reject`
- **Authentication**: Bearer Token
- **Allowed Roles**: `RECIPIENT`
- **Ownership / Authorization Rules**: Authenticated user must be the assigned `recipient_id`.
- **Behavior**: Atomically updates match status to `REJECTED`. Notifies the next eligible candidate in the pre-computed ranking list.

**Request Schema (Pydantic)**:
```python
class MatchRejectRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=255)
```

**Response (`200 OK`) (EXAMPLE DATA ONLY)**:
```json
{
  "success": true,
  "message": "Match declined. Offer forwarded to next eligible candidate.",
  "data": {
    "match_id": "mat_554433",
    "status": "REJECTED"
  }
}
```

---

### 3.4 In-App Notifications

---

#### `GET /api/v1/notifications`
- **Method**: `GET`
- **Path**: `/api/v1/notifications`
- **Authentication**: Bearer Token
- **Allowed Roles**: Any Authenticated User
- **Description**: Retrieves database-backed in-app alerts for the current user via REST polling.

**Query Parameters**:
- `unread_only` (optional, default `true`): Boolean

**Response (`200 OK`) (EXAMPLE DATA ONLY)**:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_001",
        "title": "New Surplus Match Available",
        "message": "50 Veg Meals available 2.4 km away. Action required.",
        "type": "MATCH_ALERT",
        "match_id": "mat_554433",
        "is_read": false,
        "created_at": "2026-09-02T14:00:00Z"
      }
    ]
  }
}
```

---

#### `PATCH /api/v1/notifications/{id}/read`
- **Method**: `PATCH`
- **Path**: `/api/v1/notifications/{id}/read`
- **Authentication**: Bearer Token
- **Allowed Roles**: Authenticated Owner

**Response (`200 OK`) (EXAMPLE DATA ONLY)**:
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

### 3.5 Impact Metrics

---

#### `GET /api/v1/impact/summary`
- **Method**: `GET`
- **Path**: `/api/v1/impact/summary`
- **Authentication**: None (Public)
- **Allowed Roles**: Public

**Response (`200 OK`) (EXAMPLE DATA ONLY)**:
```json
{
  "success": true,
  "data": {
    "total_meals_rescued": 14250,
    "total_food_weight_kg": 7125.0,
    "total_co2_offset_kg": 17812.5,
    "active_providers_count": 48,
    "active_recipients_count": 32
  }
}
```

---

## 4. Architectural Status

> [!IMPORTANT]
> **Architecture is frozen; no blocking architectural decisions remain.**
