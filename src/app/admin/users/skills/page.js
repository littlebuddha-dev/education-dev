// /src/app/admin/users/skills/page.js (トークンリフレッシュ対応版)
// 役割: 管理者向けスキル統計ページ（401エラー時に自動リフレッシュ）

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AdminUserSkillsStatsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [stats, setStats] = useState([]);
  const [error, setError] = useState('');
  const [targetUserName, setTargetUserName] = useState('');
  const [isFetching, setIsFetching] = useState(true);

  // トークンリフレッシュ機能付きfetch
  const fetchWithAuth = async (url, options = {}) => {
    // 最初のリクエスト
    let response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // 401エラーの場合はリフレッシュを試行
    if (response.status === 401) {
      console.log('401 detected in skills page, trying refresh...');
      
      try {
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include'
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          console.log('Token refreshed successfully in skills page');
          
          // リフレッシュ成功後、元のリクエストを再実行
          response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${refreshData.accessToken}`,
              ...options.headers
            }
          });
        } else {
          console.log('Refresh failed in skills page, redirecting to login');
          router.replace('/login');
          return null;
        }
      } catch (refreshError) {
        console.error('Refresh error in skills page:', refreshError);
        router.replace('/login');
        return null;
      }
    }

    return response;
  };

  useEffect(() => {
    // 認証状態が確定するまで待機
    if (isAuthLoading) {
      return;
    }

    // 未認証または管理者でない場合はリダイレクト
    if (!isAuthenticated || user?.role !== 'admin') {
      router.replace('/login');
      return;
    }

    const targetUserId = searchParams.get('id');
    if (!targetUserId) {
      setError('対象のユーザーIDが指定されていません。');
      setIsFetching(false);
      return;
    }

    setTargetUserName(`ユーザーID: ${targetUserId}`);

    // 🔧 修正: トークンリフレッシュ機能付きでAPIを呼び出し
    fetchWithAuth(`/api/admin/users/${targetUserId}/skills`)
      .then(async res => {
        if (!res) {
          // fetchWithAuthがnullを返した場合（認証失敗）
          return;
        }
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'エラーレスポンスの解析に失敗しました' }));
          throw new Error(errData.error || `エラー: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          setStats(data);
          setError('');
        }
      })
      .catch(err => {
        console.error('スキル統計の取得エラー:', err.message);
        setError(err.message);
      })
      .finally(() => {
        setIsFetching(false);
      });
      
  }, [isAuthLoading, isAuthenticated, user, router, searchParams]);

  if (isAuthLoading || isFetching) {
    return <main style={{ padding: '2rem' }}><p>統計データを読み込み中...</p></main>;
  }

  // 子どもごとに統計をグループ化
  const groupByChild = stats.reduce((acc, row) => {
    const childKey = row.child_name || `子ども (ID: ${row.child_id})`;
    if (!acc[childKey]) {
      acc[childKey] = [];
    }
    acc[childKey].push(row);
    return acc;
  }, {});

  return (
    <main style={{ padding: '2rem' }}>
      <h1>スキル統計（対象: {targetUserName || 'N/A'}）</h1>
      
      {error && (
        <div style={{ 
          color: 'red', 
          padding: '1rem', 
          border: '1px solid red', 
          borderRadius: '4px', 
          marginBottom: '1rem',
          backgroundColor: '#ffebee' 
        }}>
          ❌ エラー: {error}
        </div>
      )}

      {!error && Object.keys(groupByChild).length === 0 && !isFetching && (
        <div style={{ 
          padding: '1rem', 
          border: '1px solid #ffc107', 
          borderRadius: '4px', 
          backgroundColor: '#fff3cd',
          color: '#856404'
        }}>
          ⚠️ このユーザーの子どもに関する統計データはまだありません。
        </div>
      )}

      {Object.entries(groupByChild).map(([childName, logs]) => (
        <section key={childName} style={{ marginBottom: '2rem' }}>
          <h3 style={{ 
            color: '#495057', 
            borderBottom: '2px solid #007bff', 
            paddingBottom: '0.5rem' 
          }}>
            {childName}
          </h3>
          {logs.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table border="1" cellPadding="8" style={{ 
                borderCollapse: 'collapse', 
                width: '100%', 
                backgroundColor: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>分野</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>平均スコア</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>件数</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>最終記録日</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={`${childName}-${log.domain}`} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{log.domain}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ 
                          backgroundColor: '#28a745', 
                          color: 'white', 
                          padding: '2px 8px', 
                          borderRadius: '12px',
                          fontSize: '14px'
                        }}>
                          {log.avg_score}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{log.entry_count}</td>
                      <td style={{ padding: '12px' }}>{new Date(log.last_recorded).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ 
              color: '#6c757d', 
              fontStyle: 'italic',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px'
            }}>
              この子どものスキルログはありません。
            </p>
          )}
        </section>
      ))}
      
      <button 
        onClick={() => router.back()} 
        style={{ 
          marginTop: '2rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        ← 戻る
      </button>
    </main>
  );
}