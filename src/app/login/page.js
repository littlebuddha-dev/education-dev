// /src/app/login/page.js
// 役割: ログインページ（リダイレクトループ解消版）

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading, hasInitialized, user } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false); // 🔧 追加: リダイレクト防止フラグ

  // 🔧 修正: より堅牢なリダイレクト処理
  useEffect(() => {
    console.log('[LoginPage] Auth state:', { 
      isLoading, 
      hasInitialized, 
      isAuthenticated, 
      userRole: user?.role,
      hasRedirected 
    });

    // 初期化が完了していない場合は待機
    if (!hasInitialized) {
      return;
    }

    // 既にリダイレクト済みの場合は何もしない
    if (hasRedirected) {
      return;
    }

    // 認証済みの場合のみリダイレクト
    if (isAuthenticated && user) {
      console.log('[LoginPage] User is authenticated, redirecting...');
      setHasRedirected(true);
      
      const redirectTo = searchParams.get('redirectTo');
      let targetPath;

      if (redirectTo && redirectTo !== '/login') {
        targetPath = redirectTo;
      } else {
        // ロールに応じたデフォルトパス
        const defaultPaths = {
          admin: '/admin/users',
          parent: '/children',
          child: '/chat',
        };
        targetPath = defaultPaths[user.role] || '/';
      }

      console.log('[LoginPage] Redirecting to:', targetPath);
      
      // 少し遅延を入れてからリダイレクト
      setTimeout(() => {
        router.replace(targetPath);
      }, 100);
    }
  }, [isAuthenticated, user, hasInitialized, router, searchParams, hasRedirected]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      console.log('[LoginPage] Attempting login...');
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 🔧 追加: Cookieを含める
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ログインに失敗しました');
      
      console.log('[LoginPage] Login successful, calling context login...');
      await login(data.accessToken, data.user);

    } catch (err) {
      console.error('[LoginPage] Login error:', err);
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  // 🔧 修正: 初期化完了まで待つローディング画面
  if (!hasInitialized) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center' }}>
        <p>認証状態を確認しています...</p>
      </main>
    );
  }

  // 🔧 修正: 認証済みでリダイレクト中の場合
  if (isAuthenticated && user) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center' }}>
        <p>ログイン済みです。リダイレクト中...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem', maxWidth: '400px', margin: 'auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>ログイン</h1>
      
      {error && (
        <div style={{ 
          color: 'red', 
          marginBottom: '1rem', 
          padding: '0.75rem', 
          border: '1px solid red', 
          borderRadius: '4px', 
          backgroundColor: '#ffebee' 
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            メールアドレス:
          </label>
          <input 
            type="email" 
            name="email" 
            value={formData.email} 
            onChange={handleInputChange} 
            required 
            disabled={isSubmitting}
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              border: '1px solid #ddd', 
              borderRadius: '4px', 
              fontSize: '16px' 
            }} 
          />
        </div>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            パスワード:
          </label>
          <input 
            type="password" 
            name="password" 
            value={formData.password} 
            onChange={handleInputChange} 
            required 
            disabled={isSubmitting}
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              border: '1px solid #ddd', 
              borderRadius: '4px', 
              fontSize: '16px' 
            }} 
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ 
            width: '100%', 
            padding: '0.75rem', 
            backgroundColor: isSubmitting ? '#ccc' : '#0070f3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            fontSize: '16px', 
            cursor: isSubmitting ? 'not-allowed' : 'pointer' 
          }}
        >
          {isSubmitting ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>
      
      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <a href="/users/register" style={{ color: '#0070f3', textDecoration: 'none' }}>
          アカウントをお持ちでない方はこちら
        </a>
      </div>
    </main>
  );
}