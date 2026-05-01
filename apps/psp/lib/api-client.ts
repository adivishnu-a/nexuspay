import { v4 as uuidv4 } from 'uuid';

export type ApiErrorCode = 
  | 'INSUFFICIENT_FUNDS'
  | 'INVALID_PIN'
  | 'ACCOUNT_LOCKED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'ACCOUNT_ALREADY_EXISTS'
  | 'RECIPIENT_NOT_FOUND'
  | 'CANNOT_PAY_SELF'
  | 'UNAUTHORIZED'
  | 'INTERNAL_SERVER_ERROR';

export interface ApiErrorEnvelope {
  code: ApiErrorCode;
  message: string;
  correlationId: string;
  details?: Record<string, any>;
}

export class ApiError extends Error {
  constructor(public envelope: ApiErrorEnvelope, public status: number) {
    super(envelope.message);
    this.name = 'ApiError';
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

async function getAccessToken(): Promise<string | null> {
  // In a real implementation, this would get the token from a secure memory store (e.g. zustand or context)
  // or handle the refresh flow if expired. For now, we'll assume it's stored in a way the client can access.
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('nexus_access_token');
}

async function setAccessToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('nexus_access_token', token);
  } else {
    localStorage.removeItem('nexus_access_token');
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const correlationId = uuidv4();
  const token = await getAccessToken();

  const headers = new Headers(options.headers);
  headers.set('X-Correlation-Id', correlationId);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && path !== '/auth/refresh' && path !== '/auth/google') {
    // Attempt refresh
    try {
      const refreshResponse = await apiFetch<{ accessToken: string }>('/auth/refresh', {
        method: 'POST',
      });
      await setAccessToken(refreshResponse.accessToken);
      // Retry original request
      return apiFetch<T>(path, options);
    } catch (e) {
      // Refresh failed, clear token and throw
      await setAccessToken(null);
      window.dispatchEvent(new CustomEvent('nexus_auth_failure'));
      throw e;
    }
  }

  if (!response.ok) {
    let errorEnvelope: ApiErrorEnvelope;
    try {
      errorEnvelope = await response.json();
    } catch (e) {
      errorEnvelope = {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
        correlationId,
      };
    }
    throw new ApiError(errorEnvelope, response.status);
  }

  if (response.status === 204) return {} as T;
  return response.json();
}
