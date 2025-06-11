export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface FetchOptions extends RequestInit {
  method?: RequestMethod;
  data?: any;
  query?: Record<string, any>;
}

// Base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: any
  ) {
    super(`API Error: ${status} ${statusText}`);
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { data, method = 'GET', query, ...customOptions } = options;

  // Construct URL
  const url = new URL(endpoint, API_URL);
  if (query && method === 'GET') {
    Object.entries(query).forEach(([key, value]) =>
      url.searchParams.append(key, String(value))
    );
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customOptions.headers,
  };

  const fetchOptions: RequestInit = {
    ...customOptions,
    method,
    headers,
    credentials: 'include',
  };

  if (data && method !== 'GET') {
    fetchOptions.body = JSON.stringify(data);
  }

  const controller = new AbortController();
  fetchOptions.signal = controller.signal;

  const response = await fetch(url.toString(), fetchOptions);

  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, body);
  }

  return body as T;
}

export const api = {
  get: <T>(endpoint: string, query?: Record<string, any>, options?: Omit<FetchOptions, 'method' | 'query'>) =>
    apiRequest<T>(endpoint, { ...options, query, method: 'GET' }),

  post: <T>(endpoint: string, data?: any, options?: Omit<FetchOptions, 'method' | 'data'>) =>
    apiRequest<T>(endpoint, { ...options, data, method: 'POST' }),

  put: <T>(endpoint: string, data?: any, options?: Omit<FetchOptions, 'method' | 'data'>) =>
    apiRequest<T>(endpoint, { ...options, data, method: 'PUT' }),

  delete: <T>(endpoint: string, options?: Omit<FetchOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};