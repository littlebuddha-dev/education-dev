// src/components/SkillLogForm.js
// タイトル: スキルログ登録フォーム
// 役割: 保護者または子どもが手動でスキルログを登録するためのUIを提供します。

'use client';

import { useState } from 'react';
import { getCookie } from '@/utils/authUtils'; // [修正] 共通関数をインポート

export default function SkillLogForm({ childId, onSuccess }) {
  const [domain, setDomain] = useState('');
  const [score, setScore] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getCookie('token'); // [修正] 共通関数を使用

    if (!token) {
      setError('ログイン情報がありません。');
      return;
    }

    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ childId, domain, score: parseFloat(score) })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onSuccess();  // 再読み込み用
      setDomain('');
      setScore('');
      setError(''); // 成功時にエラーメッセージをクリア
    } catch (err) {
      setError(err.message);
    }
  };

  // [削除] このファイル内にあったgetCookie関数は削除されました

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
      <h3>スキルログを追加</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <label>分野：
        <input value={domain} onChange={e => setDomain(e.target.value)} required />
      </label>
      <br />
      <label>スコア（0〜100）：
        <input type="number" value={score} onChange={e => setScore(e.target.value)} required />
      </label>
      <br />
      <button type="submit">追加</button>
    </form>
  );
}