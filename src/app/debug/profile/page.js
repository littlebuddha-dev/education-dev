// /src/app/debug/profile/page.js
// 役割: 子どもプロフィール問題のトラブルシューティングページ（開発環境のみ）

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/utils/apiClient';

export default function ProfileDebugPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [debugInfo, setDebugInfo] = useState(null);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState('');

  // 開発環境でのみ表示
  if (process.env.NODE_ENV !== 'development') {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>アクセス拒否</h1>
        <p>このページは開発環境でのみ利用可能です。</p>
      </main>
    );
  }

  useEffect(() => {
    if (!isAuthenticated || !user || isLoading) return;

    const fetchDebugInfo = async () => {
      try {
        setError('');
        const response = await apiClient('/api/debug/profile');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'デバッグ情報の取得に失敗しました');
        }
        const data = await response.json();
        setDebugInfo(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchDebugInfo();
  }, [user, isAuthenticated, isLoading]);

  const createProfile = async () => {
    if (!user || user.role !== 'child') return;

    setIsCreating(true);
    setError('');
    setCreationSuccess('');

    try {
      const response = await apiClient('/api/children/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childUserId: user.id,
          name: `${user.last_name || ''} ${user.first_name || ''}`.trim(),
          birthday: null, // ユーザー情報から取得
          gender: null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'プロフィールの作成に失敗しました');
      }

      const data = await response.json();
      setCreationSuccess(`プロフィールが正常に作成されました！ (ID: ${data.profile.id})`);
      
      // デバッグ情報を再取得
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>🔍 プロフィールデバッグ</h1>
        <p>認証情報を確認中...</p>
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>🔍 プロフィールデバッグ</h1>
        <p>ログインしてください。</p>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem', maxWidth: '800px' }}>
      <h1>🔍 プロフィールデバッグ</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        このページは開発環境専用のトラブルシューティングツールです。
      </p>

      {error && (
        <div style={{ 
          color: 'red', 
          padding: '1rem', 
          border: '1px solid red', 
          borderRadius: '4px', 
          backgroundColor: '#ffebee',
          marginBottom: '1rem'
        }}>
          ❌ エラー: {error}
        </div>
      )}

      {creationSuccess && (
        <div style={{ 
          color: 'green', 
          padding: '1rem', 
          border: '1px solid green', 
          borderRadius: '4px', 
          backgroundColor: '#e8f5e8',
          marginBottom: '1rem'
        }}>
          ✅ {creationSuccess}
        </div>
      )}

      {debugInfo && (
        <div>
          <section style={{ marginBottom: '2rem' }}>
            <h2>👤 ユーザー情報</h2>
            <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
              <p><strong>ID:</strong> {debugInfo.user.id}</p>
              <p><strong>Email:</strong> {debugInfo.user.email}</p>
              <p><strong>名前:</strong> {debugInfo.user.first_name} {debugInfo.user.last_name}</p>
              <p><strong>ロール:</strong> {debugInfo.user.role}</p>
              <p><strong>登録日:</strong> {new Date(debugInfo.user.created_at).toLocaleString()}</p>
            </div>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>👶 子どもプロフィール ({debugInfo.childProfilesCount}件)</h2>
            {debugInfo.childProfiles.length === 0 ? (
              <div style={{ backgroundColor: '#fff3cd', padding: '1rem', borderRadius: '4px', border: '1px solid #ffeaa7' }}>
                ⚠️ 子どもプロフィールが見つかりません
              </div>
            ) : (
              <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
                {debugInfo.childProfiles.map((profile, index) => (
                  <div key={profile.id} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: index < debugInfo.childProfiles.length - 1 ? '1px solid #ddd' : 'none' }}>
                    <p><strong>プロフィールID:</strong> {profile.id}</p>
                    <p><strong>名前:</strong> {profile.name}</p>
                    <p><strong>保護者ID:</strong> {profile.user_id || '未設定'}</p>
                    <p><strong>子どもユーザーID:</strong> {profile.child_user_id || '未設定'}</p>
                    <p><strong>誕生日:</strong> {profile.birthday || '未設定'}</p>
                    <p><strong>性別:</strong> {profile.gender || '未設定'}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>📊 問題分析</h2>
            <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
              {debugInfo.analysis.profileIssues.length === 0 ? (
                <p style={{ color: 'green' }}>✅ 問題は検出されませんでした</p>
              ) : (
                <div>
                  <h3 style={{ color: 'red' }}>🚨 検出された問題:</h3>
                  <ul>
                    {debugInfo.analysis.profileIssues.map((issue, index) => (
                      <li key={index} style={{ color: 'red' }}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {debugInfo.analysis.recommendations.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <h3 style={{ color: 'blue' }}>💡 推奨事項:</h3>
                  <ul>
                    {debugInfo.analysis.recommendations.map((rec, index) => (
                      <li key={index} style={{ color: 'blue' }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {user.role === 'child' && debugInfo.analysis.profileIssues.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <h2>🔧 自動修復</h2>
              <div style={{ backgroundColor: '#e3f2fd', padding: '1rem', borderRadius: '4px', border: '1px solid #2196f3' }}>
                <p>子どもプロフィールが見つからない場合、自動的に作成できます。</p>
                <button
                  onClick={createProfile}
                  disabled={isCreating}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: isCreating ? '#ccc' : '#2196f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  {isCreating ? '作成中...' : '子どもプロフィールを作成'}
                </button>
              </div>
            </section>
          )}

          <section style={{ marginBottom: '2rem' }}>
            <h2>📈 スキルログ ({debugInfo.skillLogsCount}件)</h2>
            {debugInfo.skillLogs.length === 0 ? (
              <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
                スキルログはまだありません
              </div>
            ) : (
              <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
                {debugInfo.skillLogs.slice(0, 3).map((log) => (
                  <div key={log.id} style={{ marginBottom: '0.5rem' }}>
                    <strong>{log.child_name}:</strong> {log.domain} - {log.score}点 
                    ({new Date(log.recorded_at).toLocaleDateString()})
                  </div>
                ))}
                {debugInfo.skillLogs.length > 3 && (
                  <p style={{ marginTop: '0.5rem', color: '#666' }}>...他 {debugInfo.skillLogs.length - 3} 件</p>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          🔄 情報を更新
        </button>
      </div>
    </main>
  );
}