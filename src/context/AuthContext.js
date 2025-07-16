// /src/context/AuthContext.js
// 役割: アプリ全体の認証状態を一元管理する。
// 🔧 修正: ログインループを解消するため、認証状態の管理を改善

'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, setAccessToken, getAccessToken } from '@/utils/apiClient';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false); // 🔧 追加: 初期化完了フラグ
  const router = useRouter();

  const handleLogout = useCallback(() => {
    console.log('[AuthContext] Logging out...');
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
    apiClient('/api/users/logout', { method: 'POST' }).finally(() => {
      window.location.href = '/login';
    });
  }, []);

  const checkAuthStatus = useCallback(async () => {
    console.log('[AuthContext] Checking auth status...');
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[AuthContext] Auth check successful:', { user: data.user?.email, role: data.user?.role });
        setAccessToken(data.accessToken);
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        console.log('[AuthContext] Auth check failed:', response.status);
        setIsAuthenticated(false);
        setUser(null);
        setAccessToken(null);
      }
    } catch (err) {
      console.error("[AuthContext] Auth check error:", err);
      setIsAuthenticated(false);
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
      setHasInitialized(true); // 🔧 追加: 初期化完了
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();

    const tokenRefreshedListener = (event) => {
      console.log('[AuthContext] Token refreshed event received');
      if(event.detail.accessToken) setAccessToken(event.detail.accessToken);
      if(event.detail.user) setUser(event.detail.user);
      setIsAuthenticated(true);
    };
    
    const logoutListener = () => {
      console.log('[AuthContext] Logout event received');
      handleLogout();
    };

    window.addEventListener('tokenRefreshed', tokenRefreshedListener);
    window.addEventListener('logout', logoutListener);

    return () => {
      window.removeEventListener('tokenRefreshed', tokenRefreshedListener);
      window.removeEventListener('logout', logoutListener);
    };
  }, [handleLogout, checkAuthStatus]);

  const login = useCallback(async (accessToken, userData) => {
    console.log('[AuthContext] Login called:', { user: userData?.email, role: userData?.role });
    setAccessToken(accessToken);
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    hasInitialized, // 🔧 追加: 外部から初期化状態を確認可能
    login,
    logout: handleLogout,
    checkAuthStatus // 🔧 追加: 手動で認証状態をリフレッシュ可能
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};