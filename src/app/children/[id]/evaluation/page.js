// src/app/children/[id]/evaluations/page.js
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { getCookie } from '@/utils/authUtils';

export default function ChildEvaluationPage() {
  const { id: childId } = useParams(); // 子どもIDを取得
  const [evaluations, setEvaluations] = useState([]);
  const [error, setError] = useState('');
  const router = useRouter(); // ✅ router を初期化

  useEffect(() => {
    // const token = localStorage.getItem('token'); // ❌ 変更
    const token = getCookie('token'); // ✅ Cookieから取得
    if (!token) {
      router.push('/login'); // 未ログインならログインページへ
      return;
    }

    try {
      const decoded = jwtDecode(token);

      // まず children テーブルから、この childId に紐付く user_id と child_user_id を取得し、
      // ログインユーザーに閲覧権限があるかを確認する
      fetch(`/api/children?id=${childId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(childrenData => {
        const foundChild = childrenData.find(c => c.id === childId);
        if (!foundChild) {
          setError('子どもが見つかりませんでした。');
          return;
        }

        // 権限チェック:
        // 1. ログインユーザーが管理者
        // 2. ログインユーザーがこの子どもの保護者 (user_id が一致)
        // 3. ログインユーザーがこの子ども自身 (child_user_id が一致)
        if (decoded.role === 'admin' || foundChild.user_id === decoded.id || foundChild.child_user_id === decoded.id) {
          // 権限があれば評価データをフェッチ
          fetch(`/api/children/${childId}/evaluations`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
            .then(async res => {
              if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg);
              }
              return res.json();
            })
            .then(data => setEvaluations(data))
            .catch(err => {
              console.error('評価取得エラー:', err.message);
              setError(err.message);
            });
        } else {
          setError('この子どもの評価情報を閲覧する権限がありません。');
        }
      })
      .catch(err => {
        console.error('子ども情報フェッチエラー:', err.message);
        setError('子ども情報の取得に失敗しました。');
      });

    } catch (err) {
      setError('認証情報が不正です。再ログインしてください。');
      // localStorage.removeItem('token'); // ❌ 変更
      document.cookie = 'token=; Max-Age=0; path=/;'; // ✅ Cookie削除
      router.push('/login');
    }
  }, [childId, router]);

  // ✅ Cookie から値を取り出す関数 (ChatUI からコピー)
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>スキル評価一覧</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {evaluations.length === 0 && !error && <p>まだ評価が記録されていません。</p>}

      {evaluations.length > 0 && (
        <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>教科</th>
              <th>分野</th>
              <th>レベル</th>
              <th>理由</th>
              <th>学習方針</th>
              <th>記録日</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((e, i) => (
              <tr key={i}>
                <td>{e.subject}</td>
                <td>{e.domain}</td>
                <td>{e.level}</td>
                <td>{e.reason}</td>
                <td>{e.recommendation}</td>
                <td>{new Date(e.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}