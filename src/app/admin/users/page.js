// /src/app/admin/users/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/utils/apiClient'; // apiClientをインポート

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // 修正: 独自のfetchWithAuthを削除し、apiClientを使うように変更
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      // apiClientを使用
      const response = await apiClient('/api/admin/users');
      
      if (!response.ok) {
        const errorData = await response.json();
        // 修正: 標準化されたエラー形式からメッセージを取得
        throw new Error(errorData.error?.message || 'ユーザー一覧の取得に失敗しました');
      }
      
      const data = await response.json();
      // 修正: 標準化されたレスポンス形式からデータを取得
      setUsers(Array.isArray(data.data) ? data.data : []);
      setError('');
    } catch (err) {
      console.error('Fetch users error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'admin') {
      router.replace('/login');
      return;
    }
    fetchUsers();
  }, [authLoading, isAuthenticated, user, router, fetchUsers]);

  // (以下、JSX部分は変更なし)
  // ...
  if (authLoading) {
    return <div style={{ padding: '2rem' }}>認証状態を確認中...</div>;
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return <div style={{ padding: '2rem' }}>権限がありません。ログインページにリダイレクトします...</div>;
  }

  if (loading && !error) {
    return <div style={{ padding: '2rem' }}>ユーザー情報を読み込み中...</div>;
  }
  
  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>管理者 - ユーザー管理</h1>
        <div style={{ color: 'red', padding: '1rem', border: '1px solid red', marginTop: '1rem', borderRadius: '4px' }}>
          ❌ {error}
        </div>
        <button 
          onClick={fetchUsers} 
          style={{ 
            marginTop: '1rem', 
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 再試行
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>管理者 - ユーザー管理</h1>
      <div style={{ marginBottom: '1rem' }}>
        <button 
          onClick={fetchUsers} 
          disabled={loading} 
          style={{ 
            padding: '0.5rem 1rem',
            backgroundColor: loading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '🔄 更新中...' : '🔄 更新'}
        </button>
      </div>
      
      <div>
        <p><strong>ユーザー数:</strong> {users.length}</p>
        <div style={{ overflowX: 'auto' }}>
          <table border="1" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>名前</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>役割</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>登録日</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>子どもの数</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px' }}>{u.email}</td>
                  <td style={{ padding: '12px' }}>{u.first_name} {u.last_name}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '12px',
                      backgroundColor: u.role === 'admin' ? '#dc3545' : u.role === 'parent' ? '#007bff' : '#28a745',
                      color: 'white'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>{u.children_count || 0}</span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button 
                      onClick={() => router.push(`/admin/users/skills?id=${u.id}`)} 
                      style={{ 
                        padding: '6px 12px', 
                        backgroundColor: '#17a2b8', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer', 
                        fontSize: '12px'
                      }}
                    >
                      📊 スキル統計
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
                    ユーザーが見つかりませんでした
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}