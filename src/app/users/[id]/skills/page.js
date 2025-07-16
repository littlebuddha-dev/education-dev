// src/app/users/[id]/skills/page.js
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // ✅ AuthContextからインポート
import { apiClient } from '@/utils/apiClient';   // ✅ apiClientをインポート

export default function UserSkillsPage() {
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth(); // ✅ AuthContextを使用

  useEffect(() => {
    if (authLoading) return;

    const userId = params.id;
    if (!isAuthenticated || (user.role !== 'admin' && user.id !== userId)) {
      router.replace('/login');
      return;
    }

    setIsLoading(true);
    apiClient(`/api/users/${userId}/skills`) // apiClientで認証ヘッダーは自動付与
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => Promise.reject(err));
        }
        return res.json();
      })
      .then(setSkills)
      .catch(err => {
        console.error('取得エラー:', err);
        setError(err.error || 'スキル情報の取得に失敗しました');
      })
      .finally(() => setIsLoading(false));

  }, [params.id, authLoading, isAuthenticated, user, router]);

  if (authLoading || isLoading) {
    return <main style={{ padding: '2rem' }}><p>読み込み中...</p></main>;
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>スキル統計</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {skills.length > 0 ? (
        <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>教科</th>
              <th>分野</th>
              <th>難易度</th>
              <th>スコア</th>
              <th>更新日</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((s, i) => (
              <tr key={i}>
                <td>{s.subject}</td>
                <td>{s.domain}</td>
                <td>{s.level}</td>
                <td>{s.score}</td>
                <td>{new Date(s.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        !error && <p>スキルデータがまだありません。</p>
      )}
    </main>
  );
}