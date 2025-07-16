// /src/app/children/page.js
// 役割: 子ども一覧ページ（新スキーマ対応版）

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/utils/apiClient';

export default function ChildrenPage() {
  const [children, setChildren] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();

  useEffect(() => {
    if (authIsLoading) {
      return;
    }
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'parent' && user.role !== 'admin') {
      setErrorMessage('⚠️ このページは保護者または管理者ユーザーのみアクセス可能です');
      setPageIsLoading(false);
      return;
    }

    if (user) {
      setPageIsLoading(true);
      apiClient('/api/children')
        .then(async res => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'データ取得に失敗しました');
          }
          return res.json();
        })
        .then(data => {
          setChildren(data);
          if (data.length === 0) {
              setErrorMessage('表示対象の子どもがいません。');
          } else {
              setErrorMessage('');
          }
        })
        .catch(err => {
          setChildren([]);
          setErrorMessage(err.message);
        })
        .finally(() => {
          setPageIsLoading(false);
        });
    }
  }, [user, isAuthenticated, authIsLoading, router]);

  if (authIsLoading || pageIsLoading) {
      return <main style={{ padding: '2rem' }}><p>子ども情報を読み込み中...</p></main>;
  }

  // ★★★ ここから下の JSX (表示部分) を修正 ★★★
  return (
    <main style={{ padding: '2rem' }}>
      <h1>子ども管理</h1>

      {errorMessage && (
        <p style={{ color: user.role === 'admin' && children.length > 0 ? '#888' : 'red' }}>
           {errorMessage}
        </p>
      )}

      {/* 新規登録ボタンを追加 */}
      {user?.role === 'parent' && (
        <button 
          onClick={() => router.push('/children/register')}
          style={{ marginBottom: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
        >
          ➕ 新しい子どもを登録する
        </button>
      )}

      {children.length > 0 && (
        <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
                <tr>
                    <th>表示名</th>
                    <th>誕生日</th>
                    <th>性別</th>
                    {/* 管理者の場合のみ「保護者」列を追加 */}
                    {user?.role === 'admin' && <th>保護者メール</th>}
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                {children.map(child => (
                    <tr key={child.id}>
                        {/* 修正: `child.name` を `child.display_name` に */}
                        <td>{child.display_name}</td>
                        <td>{child.birthday ? new Date(child.birthday).toLocaleDateString() : '未設定'}</td>
                        <td>{child.gender || '未設定'}</td>
                        {/* 管理者の場合のみ「保護者」列を表示 */}
                        {user?.role === 'admin' && <td>{child.parent_email || '未割り当て'}</td>}
                        <td>
                            <button onClick={() => router.push(`/children/${child.id}`)}>
                                詳細を見る
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      )}
    </main>
  );
}