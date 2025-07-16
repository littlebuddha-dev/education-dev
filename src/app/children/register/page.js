// src/app/children/register/page.js
// タイトル: 子ども登録ページ（新スキーマ対応版）
// 役割: 保護者が新しい子どもをシステムに登録するためのフォーム画面です。

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // useAuth を使用
import { apiClient } from '@/utils/apiClient';   // apiClient を使用

export default function ChildRegisterPage() {
  // 修正: 姓・名を displayName に統一
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  // 認証状態を監視し、保護者でなければリダイレクト
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'parent')) {
      alert('このページは保護者のみアクセスできます。');
      router.replace('/children');
    }
  }, [user, isAuthenticated, isLoading, router]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!displayName || !gender || !birthday) {
        setError('すべての項目を入力してください。');
        setIsSubmitting(false);
        return;
    }

    try {
      // 修正: APIに送信するデータを新しい形式に
      const res = await apiClient('/api/children', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName, // `displayName` を使用
          gender,
          birthday,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '登録に失敗しました');
      }

      alert('お子様の登録が完了しました。');
      router.push('/children'); // 登録後は子ども一覧ページへ

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 認証情報読み込み中はローディング表示
  if (isLoading) {
    return <main style={{ padding: '2rem' }}><p>読み込み中...</p></main>;
  }

  return (
    <main style={{ padding: '2rem', maxWidth: '600px', margin: 'auto' }}>
      <h1>新しい子どもを登録する</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label>
            表示名:
            <input 
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem' }}
            />
          </label>
        </div>
        
        <div>
           <label>
             性別:
             <select 
               value={gender} 
               onChange={(e) => setGender(e.target.value)} 
               required
               style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem' }}
             >
               <option value="">選択してください</option>
               <option value="男の子">男の子</option>
               <option value="女の子">女の子</option>
               <option value="その他">その他</option>
             </select>
           </label>
        </div>

        <div>
          <label>
            誕生日:
            <input 
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem' }}
            />
          </label>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ padding: '0.8rem', cursor: 'pointer' }}
        >
          {isSubmitting ? '登録中...' : '登録する'}
        </button>
      </form>
    </main>
  );
}