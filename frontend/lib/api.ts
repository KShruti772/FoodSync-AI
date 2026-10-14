import {
  DemoDonation,
  DemoMatch,
  DemoNotification,
  DemoImpactMetrics,
  DemoUser,
} from './demo-data';

// ---------------------------------------------------------------------------
// Backend Core Types & Schemas
// ---------------------------------------------------------------------------

export type BackendRole = 'FOOD_PROVIDER' | 'RECIPIENT' | 'ADMIN';

export interface BackendUser {
  id: string;
  email: string;
  role: BackendRole;
  organization_name: string;
  phone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_verified?: boolean;
}

export interface ApiAuthResponse {
  user: BackendUser;
  token: string;
}

export type ApiFoodType =
  | 'VEGETARIAN_COOKED'
  | 'NON_VEGETARIAN_COOKED'
  | 'PACKAGED_GROCERY'
  | 'PRODUCE_RAW'
  | 'BAKERY';

export type ApiDonationStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface ApiDonationCreate {
  title: string;
  food_type: ApiFoodType;
  perishable?: boolean;
  quantity_meals: number;
  prepared_at: string;
  expiry_time: string;
  pickup_address: string;
  latitude: number;
  longitude: number;
  special_instructions?: string | null;
}

export interface ApiDonation {
  id: string;
  provider_id: string;
  title: string;
  food_type: ApiFoodType;
  perishable: boolean;
  quantity_meals: number;
  prepared_at: string;
  expiry_time: string;
  pickup_address: string;
  latitude: number;
  longitude: number;
  special_instructions?: string | null;
  status: ApiDonationStatus;
  created_at: string;
  updated_at: string;
}

export type ApiMatchStatus =
  | 'PROPOSED'
  | 'NOTIFIED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED';

export interface ApiMatch {
  id: string;
  donation_id: string;
  recipient_id: string;
  compatibility_score: number;
  distance_km: number;
  matched_factors?: {
    distance_score?: number;
    urgency_score?: number;
    capacity_score?: number;
    requirement_score?: number;
    disqualifications?: string[];
    [key: string]: any;
  } | null;
  status: ApiMatchStatus;
  created_at: string;
  updated_at: string;
}

export type ApiNotificationType =
  | 'MATCH_ALERT'
  | 'RESERVATION_CONFIRMATION'
  | 'EXPIRY_WARNING'
  | 'SYSTEM';

export interface ApiNotification {
  id: string;
  user_id: string;
  match_id?: string | null;
  title: string;
  message: string;
  type: ApiNotificationType;
  is_read: boolean;
  created_at: string;
}

export interface ApiImpactSummary {
  total_meals_rescued: number;
  total_food_weight_kg: number;
  total_co2_savings_kg: number;
  total_completed_donations: number;
}

export interface ApiMonthlyTrend {
  month: string;
  meals_rescued: number;
  food_weight_kg: number;
  co2_savings_kg: number;
  completed_rescues: number;
}

export interface ApiImpactRecord {
  id: string;
  donation_id: string;
  match_id: string;
  donation_title: string;
  food_type?: string | null;
  completed_at: string;
  meals_rescued: number;
  food_weight_kg: number;
  co2_savings_kg: number;
  provider_id?: string | null;
  provider_name?: string | null;
  recipient_id?: string | null;
  recipient_name?: string | null;
  verification_notes?: string | null;
}

export interface ApiImpactLedgerResponse {
  summary: ApiImpactSummary;
  monthly_trends: ApiMonthlyTrend[];
  records: ApiImpactRecord[];
  scope: string;
  start_date?: string | null;
  end_date?: string | null;
}

export type RecipientOrgType = 'SHELTER' | 'FOOD_BANK' | 'COMMUNITY_KITCHEN' | 'ORPHANAGE';
export type RecipientDietaryPreference = 'ALL' | 'VEGETARIAN_ONLY' | 'VEGAN_ONLY';
export type RecipientStorageType = 'DRY' | 'REFRIGERATED' | 'FROZEN';

export interface ApiRecipientProfileUpdate {
  org_type: RecipientOrgType;
  daily_capacity_meals: number;
  storage_types: string[];
  dietary_preferences: RecipientDietaryPreference;
  max_travel_distance_km: number;
  operating_hours?: string | null;
}

export interface ApiRecipientProfile {
  id: string;
  user_id: string;
  org_type: RecipientOrgType;
  daily_capacity_meals: number;
  storage_types: string[];
  dietary_preferences: RecipientDietaryPreference;
  max_travel_distance_km: number;
  operating_hours?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiDonationCompletePayload {
  confirmed_quantity_meals?: number | null;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number = 500, data: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ---------------------------------------------------------------------------
// Base HTTP Client
// ---------------------------------------------------------------------------

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (networkError: any) {
    throw new ApiError(
      `Cannot connect to backend server at ${API_BASE_URL}. Ensure FastAPI is running.`,
      0,
      networkError
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    let message = 'Request failed';

    if (typeof errorBody?.detail === 'string') {
      message = errorBody.detail;
    } else if (typeof errorBody?.detail?.error?.message === 'string') {
      message = errorBody.detail.error.message;
    } else if (Array.isArray(errorBody?.detail)) {
      message = errorBody.detail
        .map((d: any) => d.msg || JSON.stringify(d))
        .join(', ');
    } else if (errorBody?.error?.message) {
      message = errorBody.error.message;
    } else if (errorBody?.message) {
      message = errorBody.message;
    }

    throw new ApiError(message, response.status, errorBody);
  }

  return (await response.json()) as T;
}

export async function apiFetchBlob(
  path: string,
  options: RequestInit = {}
): Promise<Blob> {
  const url = `${API_BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
      },
    });
  } catch (networkError: any) {
    throw new ApiError(
      `Cannot connect to backend server at ${API_BASE_URL}. Ensure FastAPI is running.`,
      0,
      networkError
    );
  }

  if (!response.ok) {
    let message = `HTTP error ${response.status}`;
    let errorBody: any = null;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }

    if (typeof errorBody?.detail === 'string') {
      message = errorBody.detail;
    } else if (typeof errorBody?.detail?.error?.message === 'string') {
      message = errorBody.detail.error.message;
    } else if (errorBody?.message) {
      message = errorBody.message;
    }

    throw new ApiError(message, response.status, errorBody);
  }

  return response.blob();
}

function authHeader(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Auth API Endpoints
// ---------------------------------------------------------------------------

export async function apiLogin(
  email: string,
  password: string
): Promise<ApiAuthResponse> {
  return apiFetch<ApiAuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiRegister(payload: {
  email: string;
  password: string;
  role: 'FOOD_PROVIDER' | 'RECIPIENT';
  organization_name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
}): Promise<ApiAuthResponse> {
  return apiFetch<ApiAuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiGetMe(token: string): Promise<BackendUser> {
  return apiFetch<BackendUser>('/api/v1/auth/me', {
    method: 'GET',
    headers: authHeader(token),
  });
}

// ---------------------------------------------------------------------------
// Donations API Endpoints
// ---------------------------------------------------------------------------

export async function apiCreateDonation(
  payload: ApiDonationCreate,
  token: string
): Promise<ApiDonation> {
  return apiFetch<ApiDonation>('/api/v1/donations', {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export async function apiGetDonations(token?: string | null): Promise<ApiDonation[]> {
  return apiFetch<ApiDonation[]>('/api/v1/donations', {
    method: 'GET',
    headers: authHeader(token),
  });
}

export async function apiGetDonation(
  donationId: string,
  token?: string | null
): Promise<ApiDonation> {
  return apiFetch<ApiDonation>(`/api/v1/donations/${donationId}`, {
    method: 'GET',
    headers: authHeader(token),
  });
}

export async function apiCancelDonation(
  donationId: string,
  token: string
): Promise<{ success: boolean; message: string; data: ApiDonation }> {
  return apiFetch<{ success: boolean; message: string; data: ApiDonation }>(
    `/api/v1/donations/${donationId}/cancel`,
    {
      method: 'POST',
      headers: authHeader(token),
    }
  );
}

export async function apiCompleteDonation(
  donationId: string,
  payload: ApiDonationCompletePayload = {},
  token: string
): Promise<{
  success: boolean;
  message: string;
  data: {
    donation_id: string;
    status: string;
    donation: ApiDonation;
    impact: any;
  };
}> {
  return apiFetch(
    `/api/v1/donations/${donationId}/complete`,
    {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify(payload),
    }
  );
}

// ---------------------------------------------------------------------------
// Matches API Endpoints
// ---------------------------------------------------------------------------

export async function apiGetDonationMatches(
  donationId: string,
  token: string
): Promise<ApiMatch[]> {
  return apiFetch<ApiMatch[]>(`/api/v1/donations/${donationId}/matches`, {
    method: 'GET',
    headers: authHeader(token),
  });
}

export async function apiGetRecipientMatches(token: string): Promise<ApiMatch[]> {
  const result = await apiFetch<{ success: boolean; data: ApiMatch[] }>(
    '/api/v1/recipients/matches',
    {
      method: 'GET',
      headers: authHeader(token),
    }
  );
  return result.data || [];
}

export async function apiAcceptMatch(
  matchId: string,
  token: string
): Promise<{ success: boolean; message: string; data: ApiMatch }> {
  return apiFetch<{ success: boolean; message: string; data: ApiMatch }>(
    `/api/v1/matches/${matchId}/accept`,
    {
      method: 'POST',
      headers: authHeader(token),
    }
  );
}

export async function apiRejectMatch(
  matchId: string,
  token: string
): Promise<{ success: boolean; message: string; data: ApiMatch }> {
  return apiFetch<{ success: boolean; message: string; data: ApiMatch }>(
    `/api/v1/matches/${matchId}/reject`,
    {
      method: 'POST',
      headers: authHeader(token),
    }
  );
}

// ---------------------------------------------------------------------------
// Recipient Profile API Endpoints
// ---------------------------------------------------------------------------

export async function apiGetRecipientProfile(
  token: string
): Promise<ApiRecipientProfile> {
  return apiFetch<ApiRecipientProfile>('/api/v1/recipients/profile', {
    method: 'GET',
    headers: authHeader(token),
  });
}

export async function apiUpdateRecipientProfile(
  payload: ApiRecipientProfileUpdate,
  token: string
): Promise<ApiRecipientProfile> {
  return apiFetch<ApiRecipientProfile>('/api/v1/recipients/profile', {
    method: 'PUT',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Notifications API Endpoints
// ---------------------------------------------------------------------------

export async function apiGetNotifications(
  token: string
): Promise<ApiNotification[]> {
  return apiFetch<ApiNotification[]>('/api/v1/notifications', {
    method: 'GET',
    headers: authHeader(token),
  });
}

export async function apiMarkNotificationRead(
  notificationId: string,
  token: string
): Promise<{ success: boolean; message: string; data: ApiNotification }> {
  return apiFetch<{ success: boolean; message: string; data: ApiNotification }>(
    `/api/v1/notifications/${notificationId}/read`,
    {
      method: 'PATCH',
      headers: authHeader(token),
    }
  );
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Impact Summary & Historical Ledger API Endpoints
// ---------------------------------------------------------------------------

export async function apiGetImpactSummary(
  token?: string | null,
  options?: { scope?: string; startDate?: string; endDate?: string }
): Promise<ApiImpactSummary> {
  const params = new URLSearchParams();
  if (options?.scope) params.append('scope', options.scope);
  if (options?.startDate) params.append('start_date', options.startDate);
  if (options?.endDate) params.append('end_date', options.endDate);
  const query = params.toString() ? `?${params.toString()}` : '';

  return apiFetch<ApiImpactSummary>(`/api/v1/impact/summary${query}`, {
    method: 'GET',
    headers: authHeader(token),
  });
}

export async function apiGetImpactLedger(
  token: string,
  options?: { scope?: string; startDate?: string; endDate?: string }
): Promise<ApiImpactLedgerResponse> {
  const params = new URLSearchParams();
  if (options?.scope) params.append('scope', options.scope);
  if (options?.startDate) params.append('start_date', options.startDate);
  if (options?.endDate) params.append('end_date', options.endDate);
  const query = params.toString() ? `?${params.toString()}` : '';

  return apiFetch<ApiImpactLedgerResponse>(`/api/v1/impact/ledger${query}`, {
    method: 'GET',
    headers: authHeader(token),
  });
}

export async function apiDownloadImpactCsv(
  token: string,
  options?: { scope?: string; startDate?: string; endDate?: string }
): Promise<Blob> {
  const params = new URLSearchParams();
  if (options?.scope) params.append('scope', options.scope);
  if (options?.startDate) params.append('start_date', options.startDate);
  if (options?.endDate) params.append('end_date', options.endDate);
  const query = params.toString() ? `?${params.toString()}` : '';

  return apiFetchBlob(`/api/v1/impact/export/csv${query}`, {
    method: 'GET',
    headers: authHeader(token),
  });
}

export async function apiDownloadImpactCertificate(
  donationId: string,
  token: string
): Promise<Blob> {
  return apiFetchBlob(`/api/v1/impact/certificates/${donationId}`, {
    method: 'GET',
    headers: authHeader(token),
  });
}

// ---------------------------------------------------------------------------
// Mappers: Bridge Live Backend Models to UI Models
// ---------------------------------------------------------------------------

export function mapFoodTypeToApi(
  formCategory: string,
  dietary: string[] = []
): ApiFoodType {
  const isNonVeg = dietary.some((d) =>
    d.toLowerCase().includes('non-veg') || d.toLowerCase().includes('meat')
  );

  switch (formCategory) {
    case 'Cooked Meals':
      return isNonVeg ? 'NON_VEGETARIAN_COOKED' : 'VEGETARIAN_COOKED';
    case 'Bakery':
      return 'BAKERY';
    case 'Fresh Produce':
      return 'PRODUCE_RAW';
    case 'Dairy':
    case 'Packaged Goods':
      return 'PACKAGED_GROCERY';
    default:
      return 'VEGETARIAN_COOKED';
  }
}

export function formatFoodTypeDisplay(foodType: ApiFoodType): string {
  switch (foodType) {
    case 'VEGETARIAN_COOKED':
      return 'Cooked Meals (Vegetarian)';
    case 'NON_VEGETARIAN_COOKED':
      return 'Cooked Meals (Non-Vegetarian)';
    case 'BAKERY':
      return 'Bakery';
    case 'PRODUCE_RAW':
      return 'Fresh Produce';
    case 'PACKAGED_GROCERY':
      return 'Packaged Goods';
    default:
      return foodType;
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return 'Recently';
  }
}

function calculateExpiryRemaining(expiryStr: string): {
  hoursRemaining: number;
  display: string;
} {
  try {
    const diffMs = new Date(expiryStr).getTime() - Date.now();
    const diffHours = Math.max(0, Math.round(diffMs / (3600 * 1000)));
    const diffMins = Math.max(0, Math.round(diffMs / 60000));

    if (diffMs <= 0) return { hoursRemaining: 0, display: 'Expired' };
    if (diffHours >= 1) return { hoursRemaining: diffHours, display: `In ${diffHours}h` };
    return { hoursRemaining: 0, display: `In ${diffMins}m` };
  } catch {
    return { hoursRemaining: 2, display: 'In 2 hours' };
  }
}

export function mapApiDonationToDemo(
  donation: ApiDonation,
  providerUser?: { organization_name?: string; email?: string } | null,
  matchedCount: number = 0,
  acceptedMatchRecipientName?: string
): DemoDonation {
  const expiry = calculateExpiryRemaining(donation.expiry_time);
  const dietary: string[] = [];

  if (donation.food_type === 'VEGETARIAN_COOKED') dietary.push('Vegetarian');
  if (donation.food_type === 'NON_VEGETARIAN_COOKED') dietary.push('Non-Vegetarian');
  if (donation.special_instructions && donation.special_instructions.includes('Dietary:')) {
    const parts = donation.special_instructions.split('Dietary:')[1];
    if (parts) {
      parts.split(',').forEach((p) => {
        const trimmed = p.trim();
        if (trimmed && !dietary.includes(trimmed)) dietary.push(trimmed);
      });
    }
  }
  if (dietary.length === 0) dietary.push('General Edible');

  const providerOrg =
    providerUser?.organization_name ||
    (donation.pickup_address ? donation.pickup_address.split(',')[0] : 'Food Provider Kitchen');

  return {
    id: donation.id,
    providerId: donation.provider_id,
    providerOrg,
    title: donation.title,
    foodType: formatFoodTypeDisplay(donation.food_type),
    quantity: donation.quantity_meals,
    quantityUnit: 'Meals',
    createdAt: formatRelativeTime(donation.created_at),
    expiryHours: expiry.hoursRemaining,
    expiryTime: expiry.display,
    storageRequirement: donation.perishable ? 'REFRIGERATED' : 'AMBIENT',
    dietary,
    status: donation.status,
    approxLocation: `Solapur Area (~${(donation.pickup_address || '').split(',')[0] || '2.0 km'} radius)`,
    exactAddress: donation.pickup_address || 'Address provided upon acceptance',
    latitude: donation.latitude,
    longitude: donation.longitude,
    contactPerson: providerOrg,
    contactPhone: '+91 98765 43210',
    handlingNotes: donation.special_instructions || 'Handle with appropriate food containers.',
    matchedCount,
    reservedRecipientId: donation.status === 'RESERVED' || donation.status === 'COMPLETED' ? 'usr-recip' : undefined,
    reservedRecipientName: acceptedMatchRecipientName || (donation.status === 'RESERVED' ? 'Reserved Community Recipient' : undefined),
  };
}

export function mapApiMatchToDemo(
  match: ApiMatch,
  donation?: ApiDonation | null,
  recipientOrgName?: string
): DemoMatch {
  const matchScore = Math.round((match.compatibility_score || 0) * 100);
  const factors = match.matched_factors || {};

  const urgencyScore = Math.round(((factors.urgency_score ?? 0.8) as number) * 100);
  const capacityScore = Math.round(((factors.capacity_score ?? 0.85) as number) * 100);
  const requirementScore = Math.round(((factors.requirement_score ?? 0.9) as number) * 100);

  const recipientName =
    recipientOrgName ||
    (match.recipient_id === 'usr-recip-001'
      ? 'Hope Shelter & Community Pantry'
      : `Community Recipient (${match.recipient_id.slice(-6)})`);

  let demoStatus: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' = 'PROPOSED';
  if (match.status === 'ACCEPTED') demoStatus = 'ACCEPTED';
  else if (match.status === 'REJECTED' || match.status === 'EXPIRED') demoStatus = 'REJECTED';

  return {
    id: match.id,
    donationId: match.donation_id,
    recipientId: match.recipient_id,
    recipientName,
    recipientType: 'Community Shelter & Redistribution Kitchen',
    matchScore,
    distanceKm: Number(match.distance_km.toFixed(1)),
    urgencyScore,
    capacityScore,
    requirementScore,
    status: demoStatus,
    proposedAt: formatRelativeTime(match.created_at),
    whyBreakdown: {
      distanceText: `${match.distance_km.toFixed(1)} km away from pickup point`,
      urgencyText: `Expiry window compatibility: ${urgencyScore}/100`,
      capacityText: `Daily meal intake capacity match: ${capacityScore}/100`,
      requirementText: `Storage and dietary requirement fit: ${requirementScore}/100`,
    },
  };
}

export function mapApiNotificationToDemo(
  notification: ApiNotification
): DemoNotification {
  let demoType: DemoNotification['type'] = 'SYSTEM';

  if (notification.type === 'MATCH_ALERT') {
    demoType = 'MATCH_PROPOSED';
  } else if (notification.type === 'RESERVATION_CONFIRMATION') {
    demoType = 'MATCH_ACCEPTED';
  } else if (notification.message.toLowerCase().includes('completed') || notification.message.toLowerCase().includes('rescued')) {
    demoType = 'DONATION_COMPLETED';
  }

  let link: string | undefined = undefined;
  if (notification.match_id) {
    link = `/matches/${notification.match_id}`;
  }

  return {
    id: notification.id,
    userId: notification.user_id,
    title: notification.title,
    message: notification.message,
    timestamp: formatRelativeTime(notification.created_at),
    read: notification.is_read,
    type: demoType,
    link,
  };
}

export function mapApiImpactToDemo(
  summary: ApiImpactSummary,
  activeMatches: number = 0
): DemoImpactMetrics {
  return {
    totalMealsRescued: summary.total_meals_rescued,
    totalDonations: summary.total_completed_donations,
    activeMatches,
    co2OffsetKg: Math.round(summary.total_co2_savings_kg),
    activeProvidersCount: Math.max(1, summary.total_completed_donations > 0 ? 2 : 1),
    activeRecipientsCount: Math.max(1, summary.total_completed_donations > 0 ? 2 : 1),
  };
}
