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
        : errorBody?.error?.message || 'Request failed';
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
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
