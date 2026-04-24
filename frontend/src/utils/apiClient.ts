// API Client with JWT Bearer header and 401 handling

const getToken = (): string | null => {
  return localStorage.getItem('nodeguard_token');
};

const clearAuth = () => {
  localStorage.removeItem('nodeguard_token');
  localStorage.removeItem('nodeguard_user');
  window.location.href = '/login';
};

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiClient<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401 && !skipAuth) {
    clearAuth();
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.detail || `Request failed with status ${response.status}`);
  }

  // Handle empty responses (204, etc.)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response as any;
}

export async function apiGet<T = any>(url: string, options?: RequestOptions): Promise<T> {
  return apiClient<T>(url, { ...options, method: 'GET' });
}

export async function apiPost<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T> {
  return apiClient<T>(url, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined });
}

export async function apiPut<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T> {
  return apiClient<T>(url, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined });
}

export async function apiDelete<T = any>(url: string, body?: any, options?: RequestOptions): Promise<T> {
  return apiClient<T>(url, { ...options, method: 'DELETE', body: body ? JSON.stringify(body) : undefined });
}
