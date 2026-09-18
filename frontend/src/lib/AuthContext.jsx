import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './apiClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'guest'

  const loadCurrentUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setStatus('guest');
      return;
    }
    try {
      const { user: me } = await api.get('/auth/me');
      setUser(me);
      setStatus('authenticated');
    } catch {
      // token expired/invalid
      setToken(null);
      setUser(null);
      setStatus('guest');
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  useEffect(() => {
    function handleUnauthorized() {
      setToken(null);
      setUser(null);
      setStatus('guest');
    }

    window.addEventListener('dairyguard:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('dairyguard:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async ({ identifier, password }) => {
    const { token, user: loggedInUser } = await api.post('/auth/login', { identifier, password }, { auth: false });
    setToken(token);
    setUser(loggedInUser);
    setStatus('authenticated');
    return loggedInUser;
  }, []);

  const register = useCallback(async ({ full_name, email, password, role, phone, farm_name, vet_state, vet_district, registration_number, preferred_language }) => {
    const { token, user: newUser } = await api.post(
      '/auth/register',
      { full_name, email, password, role, phone, farm_name, vet_state, vet_district, registration_number, preferred_language },
      { auth: false }
    );
    setToken(token);
    setUser(newUser);
    setStatus('authenticated');
    return newUser;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setStatus('guest');
  }, []);

  const value = useMemo(
    () => ({ user, status, isAuthenticated: status === 'authenticated', login, register, logout }),
    [user, status, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}
