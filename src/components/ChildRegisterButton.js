// src/components/ChildRegisterButton.js
// タイトル: 子ども登録ボタン
// 役割: 特定の条件下（親ユーザーでログインしている場合など）で子ども登録ページへの導線を表示します。

'use client';

import { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/utils/authUtils'; // [修正] 共通関数をインポート

export default function ChildRegisterButton({ userId }) {
  const [canShow, setCanShow] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = getCookie('token'); // [修正] 共通関数を使用
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      // 親のuser_idと一致し、かつ親ロールの場合のみ表示
      if (decoded.id === userId && decoded.role === 'parent') {
        setCanShow(true);
      }
    } catch {
      // 無効なトークンは何もしない
    }
  }, [userId]);

  // [削除] このファイル内にあったgetCookie関数は削除されました

  if (!canShow) return null;

  return (
    <button
      onClick={() => router.push('/children/register')}
      style={{
        marginTop: '1rem',
        padding: '0.5rem 1rem',
        backgroundColor: '#0070f3',
        color: 'white',
        border: 'none',
        borderRadius: '5px'
      }}
    >
      👶 子どもを登録する
    </button>
  );
}