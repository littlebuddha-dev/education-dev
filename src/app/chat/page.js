// /src/app/chat/page.js
// 役割: チャットページ（無限ループ修正版）

'use client';

import { useAuth } from '@/context/AuthContext';
import { useAuthGuard } from '@/lib/useAuthGuard';
import ChatUI from '@/components/ChatUI';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/utils/apiClient';

export default function ChatPage() {
  const ready = useAuthGuard();
  const { user, isLoading: authLoading } = useAuth();

  const [childId, setChildId] = useState(null);
  const [children, setChildren] = useState([]);
  const [error, setError] = useState('');
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false); // 🔧 追加: 初期化フラグ
  const [debugInfo, setDebugInfo] = useState('');

  // 🔧 修正: useCallbackでデータ取得関数を安定化
  const fetchChildrenData = useCallback(async () => {
    if (hasInitialized || !user || authLoading) {
      console.log('[ChatPage] Skipping fetch:', { hasInitialized, hasUser: !!user, authLoading });
      return;
    }

    console.log('[ChatPage] Starting data fetch for user:', user.email, user.role);
    setIsDataLoading(true);
    setHasInitialized(true); // 🔧 重要: 初期化開始時点でフラグを設定
    setError('');
    setDebugInfo(`ユーザー: ${user.email} (${user.role})`);

    try {
      if (user.role === 'parent') {
        console.log('[ChatPage] Fetching children for parent...');
        setDebugInfo(prev => prev + '\n保護者として子ども一覧を取得中...');
        
        const response = await apiClient('/api/children');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'データ取得に失敗しました');
        }
        
        const data = await response.json();
        console.log('[ChatPage] Parent children data:', data);
        setDebugInfo(prev => prev + `\n子ども ${data.length} 人が見つかりました`);
        
        setChildren(data);
        if (data.length > 0) {
          setChildId(data[0].id);
          setDebugInfo(prev => prev + `\n${data[0].name} を選択しました`);
        } else {
          setError('チャットする子どもを登録してください。');
        }

      } else if (user.role === 'child') {
        console.log('[ChatPage] Fetching profile for child user...');
        setDebugInfo(prev => prev + '\n子どもとして自分のプロフィールを取得中...');
        
        const response = await apiClient(`/api/children?child_user_id=${user.id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'プロフィール取得に失敗しました');
        }
        
        const data = await response.json();
        console.log('[ChatPage] Child profile data:', data);
        console.log('[ChatPage] Data type:', typeof data, 'Array:', Array.isArray(data));
        console.log('[ChatPage] Data length:', data?.length);
        
        setDebugInfo(prev => prev + `\nプロフィール取得完了: ${JSON.stringify(data)}`);
        
        if (Array.isArray(data) && data.length > 0) {
          const profileId = data[0].id;
          console.log('[ChatPage] Setting child profile ID:', profileId);
          setChildId(profileId);
          setDebugInfo(prev => prev + `\nプロフィールID: ${profileId} を設定完了`);
        } else {
          console.warn('[ChatPage] No valid profile data:', data);
          setError('チャット用のプロフィールが見つかりません。管理者にお問い合わせください。');
        }

      } else if (user.role === 'admin') {
        console.log('[ChatPage] Admin user accessing chat...');
        setDebugInfo(prev => prev + '\n管理者としてアクセス');
        
        const response = await apiClient('/api/children');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'データ取得に失敗しました');
        }
        
        const data = await response.json();
        setChildren(data);
        if (data.length > 0) {
          setChildId(data[0].id);
        } else {
          setError('システムに子どもが登録されていません。');
        }

      } else {
        setError('チャット機能は保護者、子ども、または管理者ユーザーのみが利用できます。');
      }
    } catch (err) {
      console.error('[ChatPage] Data fetch error:', err);
      setError(`エラー: ${err.message}`);
      setDebugInfo(prev => prev + `\nエラー: ${err.message}`);
    } finally {
      console.log('[ChatPage] Data fetch completed, setting loading to false');
      setIsDataLoading(false);
    }
  }, [user, authLoading, hasInitialized]); // 🔧 修正: hasInitializedを依存配列に追加

  // 🔧 修正: useEffectをシンプルに
  useEffect(() => {
    console.log('[ChatPage] Effect triggered:', { 
      authLoading, 
      userEmail: user?.email, 
      userRole: user?.role,
      hasInitialized
    });

    if (!authLoading && user && !hasInitialized) {
      fetchChildrenData();
    }
  }, [authLoading, user, hasInitialized, fetchChildrenData]);

  // ローディング状態の表示
  if (authLoading || isDataLoading) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>先生とのチャット</h1>
        <p>チャットを準備しています...</p>
        {/* デバッグ情報を表示（開発時のみ） */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            backgroundColor: '#f5f5f5', 
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.9em',
            whiteSpace: 'pre-line'
          }}>
            <strong>デバッグ情報:</strong><br />
            AuthLoading: {String(authLoading)}<br />
            User: {user?.email || 'なし'}<br />
            Ready: {String(ready)}<br />
            DataLoading: {String(isDataLoading)}<br />
            HasInitialized: {String(hasInitialized)}<br />
            {debugInfo}
          </div>
        )}
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>先生とのチャット</h1>
        <p style={{ color: 'red' }}>ユーザー情報が取得できませんでした。ページを再読み込みしてください。</p>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>先生とのチャット</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {user?.role === 'parent' && children.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <label>
            チャットする子ども:
            <select
              value={childId || ''}
              onChange={(e) => setChildId(e.target.value)}
              style={{ marginLeft: '0.5rem', padding: '0.3rem' }}
            >
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {user?.role === 'admin' && children.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <label>
            チャット対象の子ども:
            <select
              value={childId || ''}
              onChange={(e) => setChildId(e.target.value)}
              style={{ marginLeft: '0.5rem', padding: '0.3rem' }}
            >
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.name} ({child.user_id ? '保護者あり' : '独立アカウント'})
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {childId ? (
        <ChatUI childId={childId} />
      ) : (
        !error && <p>チャット相手を選択するか、子どもを登録してください。</p>
      )}

      {/* デバッグ情報を表示（開発時のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          backgroundColor: '#f5f5f5', 
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '0.9em',
          whiteSpace: 'pre-line'
        }}>
          <strong>デバッグ情報:</strong><br />
          {debugInfo}
          <br />
          <strong>現在の状態:</strong><br />
          childId: {childId || 'なし'}<br />
          children数: {children.length}<br />
          error: {error || 'なし'}<br />
          hasInitialized: {String(hasInitialized)}
        </div>
      )}
    </main>
  );
}