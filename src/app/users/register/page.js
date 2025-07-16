// src/app/users/register/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UserRegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('parent');
  const [birthday, setBirthday] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!email || !password || !firstName || !lastName || !birthday) {
      setError('すべての項目を入力してください');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName, role, birthday }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '登録に失敗しました。');
      }

      setSuccessMessage('登録が完了しました。ログインページへ移動します...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (err) {
      console.error('登録中エラー:', err);
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '500px', margin: 'auto' }}>
      <h1>ユーザー登録</h1>
      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
      {successMessage && <p style={{ color: 'green', marginBottom: '1rem' }}>{successMessage}</p>}

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label>姓：</label>
          <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={isSubmitting} style={{width: '100%', padding: '0.5rem'}}/>
        </div>
        <div>
          <label>名：</label>
          <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={isSubmitting} style={{width: '100%', padding: '0.5rem'}}/>
        </div>
        <div>
          <label>メールアドレス：</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isSubmitting} style={{width: '100%', padding: '0.5rem'}}/>
        </div>
        <div>
          <label>パスワード：</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isSubmitting} style={{width: '100%', padding: '0.5rem'}}/>
        </div>
        <div>
          <label>生年月日：</label>
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} required disabled={isSubmitting} style={{width: '100%', padding: '0.5rem'}}/>
        </div>
        <div>
          <label>登録種別：</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} disabled={isSubmitting} style={{ marginLeft: '0.5rem', padding: '0.3rem' }}>
            <option value="parent">保護者</option>
            <option value="child">子ども</option>
          </select>
        </div>
        <button type="submit" disabled={isSubmitting} style={{padding: '0.8rem', cursor: 'pointer'}}>
          {isSubmitting ? '登録中...' : '登録する'}
        </button>
      </form>
    </main>
  );
}