import { User, Position, Transaction, MarketAsset } from '../types';

const API_BASE = '/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      let errorMsg = 'API request failed';
      try {
        const errorData = await res.json();
        errorMsg = errorData.error || errorData.message || errorMsg;
      } catch (e) {
        // Failed to parse json
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  // Auth
  async login(credentials: { email: string; password?: string }) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async register(userData: { name: string; email: string; password?: string }) {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async getMe(): Promise<{ user: User }> {
    return this.request('/auth/me');
  }

  async updateProfile(data: any) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Wallet
  async getWallet() {
    return this.request('/wallet');
  }

  async deposit(data: any) {
    return this.request('/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async withdraw(data: any) {
    return this.request('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getTransactions() {
    return this.request('/wallet/transactions');
  }

  // Markets & Trades
  async getMarkets(): Promise<{ assets: MarketAsset[] }> {
    return this.request('/markets');
  }

  async getPositions(): Promise<{ positions: Position[] }> {
    return this.request('/trades/positions');
  }

  async createPosition(data: any) {
    return this.request('/trades/position', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async closePosition(positionId: string) {
    return this.request(`/trades/position/${positionId}/close`, {
      method: 'POST'
    });
  }

  // Admin
  async getAdminStats() {
    return this.request('/admin/stats');
  }

  async getAdminUsers() {
    return this.request('/admin/users');
  }

  async getAdminDeposits() {
    return this.request('/admin/deposits');
  }

  async getAdminWithdrawals() {
    return this.request('/admin/withdrawals');
  }

  async approveDeposit(id: string) {
    return this.request(`/admin/deposits/${id}/approve`, { method: 'POST' });
  }

  async rejectDeposit(id: string, reason?: string) {
    return this.request(`/admin/deposits/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async approveWithdrawal(id: string) {
    return this.request(`/admin/withdrawals/${id}/approve`, { method: 'POST' });
  }

  async rejectWithdrawal(id: string, reason?: string) {
    return this.request(`/admin/withdrawals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async getAdminTrades() {
    return this.request('/admin/trades');
  }

  async updateAdminTrade(id: string, data: any) {
    return this.request(`/admin/trades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async forceCloseAdminTrade(id: string) {
    return this.request(`/admin/trades/${id}/close`, { method: 'POST' });
  }
}

export const apiService = new ApiService();
