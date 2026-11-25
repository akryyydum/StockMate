export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'superadmin';
  mustChangeCredentials: boolean;
};

export type NewUser = Pick<User, 'name' | 'email' | 'role'> & { password: string };

export type InventoryStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minimumStock: number;
  unitCost: number;
  stockValue: number;
  status: InventoryStatus;
  updatedAt: string;
};

export type NewInventoryItem = Omit<
  InventoryItem,
  'id' | 'stockValue' | 'status' | 'updatedAt'
>;

export type InventoryOverview = {
  items: InventoryItem[];
  summary: {
    stockValue: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalItems: number;
    movementsToday: number;
  };
  dailyMovements: {
    date: string;
    label: string;
    incoming: number;
    outgoing: number;
  }[];
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Cannot reach StockMate. Check your connection and API URL.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
        ? body.message
        : 'Something went wrong. Please try again.';
    throw new ApiError(message, response.status);
  }

  return body as T;
}

export const authApi = {
  login(email: string, password: string) {
    return request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  refresh(refreshToken: string) {
    return request<AuthSession>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  logout(refreshToken: string | null) {
    return request<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  updateCredentials(
    accessToken: string,
    currentPassword: string,
    email: string,
    password: string,
  ) {
    return request<AuthSession>('/auth/credentials', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ currentPassword, email, password }),
    });
  },

  listUsers(accessToken: string) {
    return request<{ users: User[] }>('/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  createUser(accessToken: string, newUser: NewUser) {
    return request<{ user: User }>('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(newUser),
    });
  },

  inventory(accessToken: string) {
    return request<InventoryOverview>('/inventory', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  createInventoryItem(accessToken: string, item: NewInventoryItem) {
    return request<{ item: InventoryItem }>('/inventory', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(item),
    });
  },

  updateInventoryItem(
    accessToken: string,
    itemId: string,
    item: Partial<NewInventoryItem>,
  ) {
    return request<{ item: InventoryItem }>(`/inventory/${itemId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(item),
    });
  },

  moveInventory(
    accessToken: string,
    itemId: string,
    type: 'in' | 'out',
    quantity: number,
  ) {
    return request<{ item: InventoryItem }>(`/inventory/${itemId}/movements`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ type, quantity }),
    });
  },
};
