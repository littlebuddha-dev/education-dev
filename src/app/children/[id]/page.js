// /src/app/children/[id]/page.js
// 役割: 子どもの詳細ページ。AuthContextを使用するように修正。
// 🔧 修正: 子どもユーザーの学習状況アクセスを改善

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // ✅ AuthContextを使用
import { apiClient } from '@/utils/apiClient'; // ✅ apiClientを使用
import SkillLogForm from '@/components/SkillLogForm';

export default function ChildDetailPage() {
  const params = useParams();
  const childId = params ? params.id : undefined;
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth(); // ✅ AuthContextを使用

  const [child, setChild] = useState(null);
  const [skillLogs, setSkillLogs] = useState([]);
  const [learningProgress, setLearningProgress] = useState([]);
  const [error, setError] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  console.log('[ChildDetailPage] Render:', { 
    childId, 
    authLoading, 
    isAuthenticated, 
    userRole: user?.role,
    userId: user?.id 
  });

  // 認証とパラメータの準備を確認
  useEffect(() => {
    console.log('[ChildDetailPage] Auth check effect:', { authLoading, isAuthenticated, childId, user: user?.email });
    
    if (authLoading) {
      console.log('[ChildDetailPage] Still loading auth...');
      return;
    }

    if (!isAuthenticated || !user) {
      console.log('[ChildDetailPage] Not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    if (!childId) {
      console.log('[ChildDetailPage] No childId available yet');
      return;
    }

    console.log('[ChildDetailPage] Auth and params ready');
    setIsReady(true);
  }, [authLoading, isAuthenticated, user, childId, router]);

  // データフェッチ
  useEffect(() => {
    if (!isReady || !childId || !user) {
      console.log('[ChildDetailPage] Data fetch conditions not met:', { isReady, childId, hasUser: !!user });
      return;
    }

    console.log('[ChildDetailPage] Starting data fetch for childId:', childId);
    setIsDataLoading(true);
    setError('');

    const fetchAllData = async () => {
      try {
        // 子ども情報を取得
        console.log('[ChildDetailPage] Fetching child info...');
        const childResponse = await apiClient(`/api/children?id=${childId}`);
        
        if (!childResponse.ok) {
          const errorData = await childResponse.json();
          throw new Error(errorData.error || '子ども情報の取得に失敗しました');
        }

        const childData = await childResponse.json();
        console.log('[ChildDetailPage] Child data response:', childData);
        
        const foundChild = childData.find(c => c.id === childId);
        if (!foundChild) {
          throw new Error('指定された子どもが見つかりませんでした');
        }

        // 権限チェック
        const hasPermission = user.role === 'admin' || 
                            foundChild.user_id === user.id || 
                            foundChild.child_user_id === user.id;
        
        console.log('[ChildDetailPage] Permission check:', {
          userRole: user.role,
          foundChildUserId: foundChild.user_id,
          foundChildUserIdMatch: foundChild.child_user_id,
          currentUserId: user.id,
          hasPermission
        });

        if (!hasPermission) {
          throw new Error('この子どもの情報を閲覧する権限がありません');
        }

        setChild(foundChild);

        // スキルログを取得
        console.log('[ChildDetailPage] Fetching skill logs...');
        try {
          const skillResponse = await apiClient(`/api/children/${childId}/skills`);
          if (skillResponse.ok) {
            const skillData = await skillResponse.json();
            setSkillLogs(skillData);
          } else {
            console.warn('[ChildDetailPage] Skill logs fetch failed, but continuing...');
            setSkillLogs([]);
          }
        } catch (skillError) {
          console.warn('[ChildDetailPage] Skill logs error:', skillError);
          setSkillLogs([]);
        }

        // 学習進捗を取得
        console.log('[ChildDetailPage] Fetching learning progress...');
        try {
          const progressResponse = await apiClient(`/api/children/${childId}/learning-progress`);
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            setLearningProgress(progressData);
          } else {
            console.warn('[ChildDetailPage] Learning progress fetch failed, but continuing...');
            setLearningProgress([]);
          }
        } catch (progressError) {
          console.warn('[ChildDetailPage] Learning progress error:', progressError);
          setLearningProgress([]);
        }

      } catch (err) {
        console.error('[ChildDetailPage] Data fetch error:', err);
        setError(err.message);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchAllData();
  }, [isReady, childId, user]);

  const fetchSkills = async () => {
    if (!childId) return;
    try {
      const response = await apiClient(`/api/children/${childId}/skills`);
      if (response.ok) {
        const data = await response.json();
        setSkillLogs(data);
      }
    } catch (err) {
      console.error('[ChildDetailPage] Skill refresh error:', err);
    }
  };

  // ローディング状態
  if (authLoading || !isReady || isDataLoading) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>学習履歴</h1>
        <p>読み込み中...</p>
        {process.env.NODE_ENV === 'development' && (
          <div style={{ marginTop: '1rem', fontSize: '0.9em', color: '#666' }}>
            Debug: authLoading={String(authLoading)}, isReady={String(isReady)}, isDataLoading={String(isDataLoading)}, childId={childId}
          </div>
        )}
      </main>
    );
  }

  // エラー状態
  if (error) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>学習履歴</h1>
        <div style={{ color: 'red', padding: '1rem', border: '1px solid red', borderRadius: '4px', backgroundColor: '#ffebee' }}>
          ⚠️ {error}
        </div>
        <button 
          onClick={() => router.back()} 
          style={{ marginTop: '1rem', padding: '0.5rem 1rem', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
        >
          戻る
        </button>
      </main>
    );
  }

  // 子ども情報がない場合
  if (!child) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>学習履歴</h1>
        <p>子ども情報が見つかりませんでした。</p>
        <button onClick={() => router.back()} style={{ marginTop: '1rem' }}>戻る</button>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>{child.name} さんの学習履歴</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <p><strong>誕生日:</strong> {child.birthday ? new Date(child.birthday).toLocaleDateString() : '未設定'}</p>
        <p><strong>性別:</strong> {child.gender || '未設定'}</p>
        <p><strong>登録日:</strong> {new Date(child.created_at).toLocaleDateString()}</p>
      </div>

      <h2 style={{ marginTop: '2rem', borderBottom: '2px solid #0070f3', paddingBottom: '0.5rem' }}>スキルログ</h2>
      {skillLogs.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px', margin: '1rem 0' }}>
          <p style={{ color: '#666' }}>スキルログがまだ登録されていません。</p>
          <p style={{ fontSize: '0.9em', color: '#888' }}>先生とのチャットで学習を進めると、自動的にスキルが記録されます。</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>分野</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>スコア</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>記録日時</th>
              </tr>
            </thead>
            <tbody>
              {skillLogs.map((log) => (
                <tr key={log.id} style={{ ':hover': { backgroundColor: '#f9f9f9' } }}>
                  <td style={{ border: '1px solid #ddd', padding: '12px' }}>{log.domain}</td>
                  <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>{log.score}</td>
                  <td style={{ border: '1px solid #ddd', padding: '12px' }}>{new Date(log.recorded_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ marginTop: '3rem', borderBottom: '2px solid #0070f3', paddingBottom: '0.5rem' }}>学習進捗</h2>
      {learningProgress.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px', margin: '1rem 0' }}>
          <p style={{ color: '#666' }}>学習目標がまだ設定されていないか、進捗データがありません。</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>目標名</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>教科</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>分野</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>ステータス</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>達成日</th>
              </tr>
            </thead>
            <tbody>
              {learningProgress.map((lp) => (
                <tr key={lp.id}>
                  <td style={{ border: '1px solid #ddd', padding: '12px' }}>{lp.goal_name}</td>
                  <td style={{ border: '1px solid #ddd', padding: '12px' }}>{lp.subject}</td>
                  <td style={{ border: '1px solid #ddd', padding: '12px' }}>{lp.domain}</td>
                  <td style={{ 
                    border: '1px solid #ddd', 
                    padding: '12px', 
                    textAlign: 'center',
                    color: lp.status === '達成済み' ? '#28a745' : '#6c757d',
                    fontWeight: 'bold'
                  }}>
                    {lp.status}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                    {lp.achieved_at ? new Date(lp.achieved_at).toLocaleDateString() : '未達成'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* スキルログ登録フォーム - 保護者または子ども本人のみ表示 */}
      {user && child && (user.role === 'parent' || (user.role === 'child' && child.child_user_id === user.id)) && (
        <div style={{ marginTop: '3rem', padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <SkillLogForm childId={childId} onSuccess={fetchSkills} />
        </div>
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button 
          onClick={() => router.back()} 
          style={{ 
            padding: '0.75rem 2rem', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          戻る
        </button>
      </div>
    </main>
  );
}