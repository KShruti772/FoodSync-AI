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

export interface RegisterPayload {
  email: string;
  password: string;
  role: 'FOOD_PROVIDER' | 'RECIPIENT';
  organization_name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface ApiDonation {
  id: string;
  provider_id: string;
  provider_org?: string | null;
  provider_address?: string | null;
  provider_phone?: string | null;
  title: string;
  food_type: string;
  perishable: boolean;
  quantity_meals: number;
  expiry_time: string;
  pickup_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  special_instructions?: string | null;
  status: 'AVAILABLE' | 'RESERVED' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  reserved_recipient_id?: string | null;
  reserved_recipient_name?: string | null;
  reservation_deadline?: string | null;
  created_at?: string;
}

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
  } | null;
  status: 'PROPOSED' | 'NOTIFIED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'COMPLETED';
  accepted_at?: string | null;
  pickup_deadline?: string | null;
  reservation_outcome?: string | null;
  created_at?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      typeof errorBody?.detail === 'string'
        ? errorBody.detail
        : errorBody?.detail?.error?.message || errorBody?.error?.message || 'Request failed';
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function apiLogin(email: string, password: string): Promise<ApiAuthResponse> {
  return apiFetch<ApiAuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiRegister(payload: RegisterPayload): Promise<ApiAuthResponse> {
  return apiFetch<ApiAuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiGetMe(token: string): Promise<BackendUser> {
  return apiFetch<BackendUser>('/api/v1/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function apiGetDonations(token: string): Promise<ApiDonation[]> {
  return apiFetch<ApiDonation[]>('/api/v1/donations', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiGetDonation(token: string, donationId: string): Promise<ApiDonation> {
  return apiFetch<ApiDonation>(`/api/v1/donations/${encodeURIComponent(donationId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiGetRecipientMatches(token: string): Promise<ApiMatch[]> {
  const response = await apiFetch<{ success: boolean; data: ApiMatch[] }>('/api/v1/recipients/matches', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function apiAcceptMatch(token: string, matchId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/api/v1/matches/${encodeURIComponent(matchId)}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiCompleteDonation(token: string, donationId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/api/v1/donations/${encodeURIComponent(donationId)}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}
