import { authApi } from '../../services/api/authApi.js';
import { setAuthState, getAuthState, clearAuthState } from '../../store/authStore.js';
import { navigate, ROUTES } from '../navigation.js';

const TOKEN_KEY = 'crane_access_token';
const REFRESH_TOKEN_KEY = 'crane_refresh_token';
const USER_KEY = 'crane_user';

export class AuthProvider {
  constructor() {
    this.currentUser = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.refreshTimer = null;
    this.listeners = new Set();
  }

  async init() {
    try {
      this.accessToken = localStorage.getItem(TOKEN_KEY);
      this.refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
      }

      if (this.accessToken && this.currentUser) {
        const valid = await this._validateToken();
        if (valid) {
          setAuthState({ isAuthenticated: true, user: this.currentUser, token: this.accessToken });
          this._scheduleTokenRefresh();
        } else {
          await this._tryRefreshToken();
        }
      } else {
        clearAuthState();
      }
    } catch (error) {
      console.error('[AuthProvider] init error:', error);
      clearAuthState();
    }
  }

  async login(credentials) {
    try {
      const response = await authApi.login(credentials);

      if (!response.success) {
        return { success: false, error: response.error || 'Login failed' };
      }

      const { user, accessToken, refreshToken } = response.data;

      this._saveSession(user, accessToken, refreshToken);
      setAuthState({ isAuthenticated: true, user, token: accessToken });
      this._scheduleTokenRefresh();
      this._notifyListeners('login', user);

      return { success: true, user };
    } catch (error) {
      console.error('[AuthProvider] login error:', error);
      return { success: false, error: error.message };
    }
  }

  async register(userData) {
    try {
      const response = await authApi.register(userData);

      if (!response.success) {
        return { success: false, error: response.error || 'Registration failed' };
      }

      return { success: true, data: response.data };
    } catch (error) {
      console.error('[AuthProvider] register error:', error);
      return { success: false, error: error.message };
    }
  }

  async verifyPhone(phone, code) {
    try {
      const response = await authApi.verifyPhone({ phone, code });

      if (!response.success) {
        return { success: false, error: response.error || 'Verification failed' };
      }

      const { user, accessToken, refreshToken } = response.data;
      this._saveSession(user, accessToken, refreshToken);
      setAuthState({ isAuthenticated: true, user, token: accessToken });
      this._scheduleTokenRefresh();
      this._notifyListeners('login', user);

      return { success: true, user };
    } catch (error) {
      console.error('[AuthProvider] verifyPhone error:', error);
      return { success: false, error: error.message };
    }
  }

  async logout() {
    try {
      if (this.accessToken) {
        await authApi.logout(this.accessToken);
      }
    } catch (_) {
      // logout silently
    } finally {
      this._clearSession();
      clearAuthState();
      this._notifyListeners('logout', null);
      await navigate(ROUTES.LOGIN, { replace: true });
    }
  }

  async _validateToken() {
    try {
      const response = await authApi.validateToken(this.accessToken);
      return response.success === true;
    } catch {
      return false;
    }
  }

  async _tryRefreshToken() {
    if (!this.refreshToken) {
      this._clearSession();
      clearAuthState();
      return false;
    }

    try {
      const response = await authApi.refreshToken(this.refreshToken);

      if (!response.success) {
        this._clearSession();
        clearAuthState();
        return false;
      }

      const { accessToken, refreshToken } = response.data;
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      setAuthState({ isAuthenticated: true, user: this.currentUser, token: accessToken });
      this._scheduleTokenRefresh();
      return true;
    } catch {
      this._clearSession();
      clearAuthState();
      return false;
    }
  }

  _scheduleTokenRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    const REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes
    this.refreshTimer = setTimeout(() => this._tryRefreshToken(), REFRESH_INTERVAL);
  }

  _saveSession(user, accessToken, refreshToken) {
    this.currentUser = user;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  _clearSession() {
    this.currentUser = null;
    this.accessToken = null;
    this.refreshToken = null;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  getToken() {
    return this.accessToken;
  }

  getUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.accessToken && !!this.currentUser;
  }

  onAuthChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notifyListeners(event, data) {
    this.listeners.forEach((fn) => fn(event, data));
  }

  async cleanup() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.listeners.clear();
  }
}
