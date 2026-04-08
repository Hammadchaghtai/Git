import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('grc_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // On mount, check if we have a valid token and fetch the profile
  useEffect(() => {
    const token = localStorage.getItem('grc_access_token');
    if (token && !user) {
      API.get('auth/me/')
        .then((res) => {
          const userData = {
            username: res.data.username,
            email: res.data.email,
            role: res.data.role,
          };
          setUser(userData);
          localStorage.setItem('grc_user', JSON.stringify(userData));
        })
        .catch(() => {
          // Token expired / invalid — clean up
          localStorage.removeItem('grc_access_token');
          localStorage.removeItem('grc_refresh_token');
          localStorage.removeItem('grc_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Persist user changes
  useEffect(() => {
    if (user) localStorage.setItem('grc_user', JSON.stringify(user));
    else localStorage.removeItem('grc_user');
  }, [user]);

  /**
   * Step 1: Send credentials to /api/auth/token/ to get JWT tokens.
   * Returns { success, role, username } on success.
   */
  const login = async (username, password) => {
    try {
      const res = await API.post('auth/token/', { username, password });
      localStorage.setItem('grc_access_token', res.data.access);
      localStorage.setItem('grc_refresh_token', res.data.refresh);

      // Now fetch the user's profile (role, etc.)
      const meRes = await API.get('auth/me/');
      return {
        success: true,
        username: meRes.data.username,
        role: meRes.data.role,
      };
    } catch {
      return { success: false };
    }
  };

  /**
   * Step 2: After OTP verification, actually set the session in React state.
   */
  const completeLogin = (username, role) => {
    setUser({ username, role });
  };

  /** Auditor guest access — no password needed, no JWT token */
  const loginAsAuditor = () => {
    // Clear any stale tokens
    localStorage.removeItem('grc_access_token');
    localStorage.removeItem('grc_refresh_token');
    setUser({ username: 'auditor', role: 'auditor' });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('grc_user');
    localStorage.removeItem('grc_access_token');
    localStorage.removeItem('grc_refresh_token');
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    role: user?.role || null,
    login,
    completeLogin,
    loginAsAuditor,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
