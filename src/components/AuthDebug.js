// 診断用コンポーネント - 認証状態の詳細確認
// src/components/AuthDebug.js
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getCookie, isTokenValid } from '@/utils/authUtils';

export default function AuthDebug() {
  const { user, isAuthenticated, token, isLoading } = useAuth();
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const collectDebugInfo = () => {
      const cookieToken = getCookie('token');
      const tokenValid = isTokenValid();
      
      setDebugInfo({
        // AuthContext情報
        contextUser: user,
        contextAuthenticated: isAuthenticated,
        contextToken: token?.substring(0, 20) + '...',
        contextLoading: isLoading,
        
        // Cookie情報
        cookieToken: cookieToken?.substring(0, 20) + '...' || 'なし',
        cookieTokenValid: tokenValid,
        cookieExists: !!cookieToken,
        
        // ブラウザ情報
        allCookies: document.cookie,
        userAgent: navigator.userAgent,
        currentUrl: window.location.href,
        timestamp: new Date().toLocaleString()
      });
    };

    collectDebugInfo();
    
    // 5秒ごとに更新
    const interval = setInterval(collectDebugInfo, 5000);
    return () => clearInterval(interval);
  }, [user, isAuthenticated, token, isLoading]);

  const testAPICall = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${getCookie('token')}`,
        }
      });
      
      const data = await response.json();
      console.log('API Test Result:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data: data
      });
      
      alert(`APIテスト結果: ${response.status} - ${response.ok ? '成功' : '失敗'}`);
    } catch (error) {
      console.error('API Test Error:', error);
      alert(`APIテストエラー: ${error.message}`);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // 本番環境では表示しない
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: '#f0f0f0',
      border: '1px solid #ccc',
      padding: '1rem',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '400px',
      maxHeight: '500px',
      overflow: 'auto',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <h4>🔍 認証デバッグ情報</h4>
      
      <div style={{ marginBottom: '1rem' }}>
        <strong>AuthContext状態:</strong>
        <div>認証済み: {debugInfo.contextAuthenticated ? '✅' : '❌'}</div>
        <div>ユーザー: {debugInfo.contextUser?.email || 'なし'}</div>
        <div>ロール: {debugInfo.contextUser?.role || 'なし'}</div>
        <div>読み込み中: {debugInfo.contextLoading ? '⏳' : '完了'}</div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <strong>Cookie状態:</strong>
        <div>Cookieあり: {debugInfo.cookieExists ? '✅' : '❌'}</div>
        <div>Cookie有効: {debugInfo.cookieTokenValid ? '✅' : '❌'}</div>
        <div>Token: {debugInfo.cookieToken}</div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <strong>全Cookie:</strong>
        <div style={{ 
          background: '#fff', 
          padding: '4px', 
          border: '1px solid #ddd',
          wordBreak: 'break-all',
          maxHeight: '60px',
          overflow: 'auto'
        }}>
          {debugInfo.allCookies || 'なし'}
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <button 
          onClick={testAPICall}
          style={{
            padding: '4px 8px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          管理者API テスト
        </button>
      </div>

      <div style={{ fontSize: '10px', color: '#666' }}>
        最終更新: {debugInfo.timestamp}
      </div>
    </div>
  );
}