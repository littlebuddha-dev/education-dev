// src/app/setup/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { removeAuthCookie } from '@/utils/authUtils'; // removeAuthCookie をインポート

export default function SetupPage() {
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [setupSecretKey, setSetupSecretKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(false); // DB接続状態
  const [needsTableSetup, setNeedsTableSetup] = useState(false); // テーブル作成が必要か
  const [needsAdminSetup, setNeedsAdminSetup] = useState(false); // 管理者ユーザー作成が必要か
  const router = useRouter();

  useEffect(() => {
    console.log('🧹 SetupPage: 既存の認証クッキーを削除します。');
    removeAuthCookie();

    async function checkSetupStatus() {
      setIsLoading(true);
      setError('');
      setMessage('');
      setIsDbConnected(false);
      setNeedsTableSetup(false);
      setNeedsAdminSetup(false);

      try {
        const tableCheckRes = await fetch('/api/tables');
        const data = await tableCheckRes.json();

        if (!tableCheckRes.ok || !data.success) {
          // DB接続ができない、またはテーブルリスト取得APIがエラーを返した場合
          console.error('Setup status check: DB connection or table check failed.', data.error);
          setIsDbConnected(false);
          setError(data.error || 'データベース接続に失敗しました。PostgreSQLが起動しているか、.env.localの設定を確認してください。');
          setNeedsTableSetup(true); // DB接続自体ができていないので、テーブルも管理者も未セットアップと判断
          setNeedsAdminSetup(true);
          return;
        }

        // DB接続成功
        setIsDbConnected(true);
        const tables = data.tables.map(row => row.table_name);
        const usersTableFound = tables.includes('users');

        if (!usersTableFound) {
          // users テーブルが存在しない場合
          console.log('Setup status check: Users table not found.');
          setNeedsTableSetup(true);
          setNeedsAdminSetup(true); // テーブルがないので管理者もいない
          setMessage('データベーステーブルが未作成です。システムを初期セットアップしてください。');
        } else {
          // users テーブルは存在するが、管理者ユーザーの存在を確認
          let adminUserFound = false;
          try {
            const adminCheckRes = await fetch('/api/users/check-admin');
            const adminCheckData = await adminCheckRes.json();

            if (adminCheckRes.ok) {
              adminUserFound = adminCheckData.adminExists;
            } else {
              // check-admin API自体がエラーを返した場合
              console.error('Setup status check: Admin check API returned error:', adminCheckData.error);
              setError(adminCheckData.error || '管理者ユーザーの存在確認中に予期せぬエラーが発生しました。');
              setNeedsAdminSetup(true); // APIエラーの場合は管理者ユーザー作成が必要と判断
              return;
            }
          } catch (adminCheckError) {
            // check-admin APIへのリクエストが失敗した場合
            console.error('Setup status check: Failed to fetch admin user existence:', adminCheckError);
            setError('管理者ユーザーの存在確認に失敗しました。サーバーが応答しているか確認してください。');
            setNeedsAdminSetup(true); // エラー時も管理者ユーザー作成が必要と判断
            return;
          }

          if (!adminUserFound) {
            // users テーブルは存在するが、管理者ユーザーがまだ登録されていない場合
            console.log('Setup status check: Admin user not found.');
            setNeedsAdminSetup(true);
            setMessage('データベースは存在しますが、管理者ユーザーが未作成のようです。管理者ユーザーを作成してください。');
          } else {
            // 全てセットアップ済み
            console.log('Setup status check: System already set up. Redirecting to login.');
            setMessage('システムは既にセットアップ済みです。ログインページへ移動します。');
            setTimeout(() => {
              router.push('/login');
            }, 2000);
          }
        }
      } catch (err) {
        // fetch('/api/tables') 自体が失敗した場合（ネットワーク問題など）
        console.error('Setup status check: Critical network or server error:', err);
        setIsDbConnected(false);
        setError('システム状態の確認中にネットワークエラーが発生しました。サーバーが起動しているか確認してください。');
        setNeedsTableSetup(true); // 最も低い状態にリセット
        setNeedsAdminSetup(true);
      } finally {
        setIsLoading(false);
      }
    }
    checkSetupStatus();
  }, [router]);

  const handleSetup = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!adminEmail || !adminPassword || !setupSecretKey) {
      setError('すべての項目を入力してください。');
      return;
    }

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-setup-secret-key': setupSecretKey,
        },
        body: JSON.stringify({ adminEmail, adminPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message + ' ログインページへ移動します。');
        // セットアップ成功後、ログインページへリダイレクト
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.error || 'セットアップに失敗しました。');
      }
    } catch (err) {
      console.error('セットアップエラー:', err);
      setError('ネットワークエラーが発生しました。または、サーバーでエラーが発生しました。');
    }
  };

  if (isLoading) {
    return (
      <main style={{ padding: '2rem' }}>
        <p>システム初期セットアップ状況を確認中...</p>
      </main>
    );
  }

  // DB接続ができていない場合
  if (!isDbConnected) {
    return (
      <main style={{ padding: '2rem', maxWidth: '600px', margin: 'auto' }}>
        <h1>🔰 教育AIシステム 初期セットアップ</h1>
        <p style={{ color: 'red', fontWeight: 'bold' }}>
          ⚠️ データベースに接続できません。PostgreSQLが起動しているか、`.env.local` の設定を確認してください。<br/>
          詳細: {error}
        </p>
        <p style={{ marginTop: '2rem', fontSize: '0.9em', color: '#666' }}>
          ※ `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` は `.env.local` で設定済みの値を使用します。<br/>
          これらの値は、PostgreSQLサーバーが起動しており、対応するデータベースとユーザーが存在している必要があります。
        </p>
        <p style={{ marginTop: '1rem', fontSize: '0.9em', color: '#666' }}>
          PostgreSQLが動作している場合は、以下のコマンドでデータベースとユーザーを作成してからアプリケーションを再起動してください。<br/>
          <pre><code>
            psql postgres<br/>
            CREATE USER user WITH PASSWORD 'postgres';<br/>
            CREATE DATABASE userdb OWNER user;<br/>
            \q
          </code></pre>
          (.env.localで設定したPGUSERとPGDATABASEの値に合わせてください)
        </p>
      </main>
    );
  }

  // DBには接続できたが、テーブルまたは管理者ユーザーのセットアップが必要な場合
  if (needsTableSetup || needsAdminSetup) {
    return (
      <main style={{ padding: '2rem', maxWidth: '600px', margin: 'auto' }}>
        <h1>🔰 教育AIシステム 初期セットアップ</h1>
        <p>
          {message || 'システムはまだセットアップされていません。以下のフォームで初期設定を行ってください。'}
        </p>
        <p style={{ color: 'red', fontWeight: 'bold' }}>
          ⚠️ `SETUP_SECRET_KEY` は `.env.local` に設定した秘密鍵と同じ値を入力してください。
        </p>

        {error && <p style={{ color: 'red' }}>{error}</p>}
        {message && <p style={{ color: 'green' }}>{message}</p>}

        <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          <div>
            <label htmlFor="adminEmail">管理者メールアドレス:</label>
            <input
              type="email"
              id="adminEmail"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem' }}
            />
          </div>

          <div>
            <label htmlFor="adminPassword">管理者パスワード:</label>
            <input
              type="password"
              id="adminPassword"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              placeholder="強力なパスワード"
              required
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem' }}
            />
          </div>

          <div>
            <label htmlFor="setupSecretKey">セットアップ秘密鍵 (`SETUP_SECRET_KEY`):</label>
            <input
              type="password"
              id="setupSecretKey"
              value={setupSecretKey}
              onChange={e => setSetupSecretKey(e.target.value)}
              placeholder=".env.local の秘密鍵"
              required
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem' }}
            />
          </div>

          <button type="submit" style={{ padding: '0.8rem 1.5rem', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            システムをセットアップ
          </button>
        </form>

        <p style={{ marginTop: '2rem', fontSize: '0.9em', color: '#666' }}>
          ※ `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` は `.env.local` で設定済みの値を使用します。<br/>
          これらの値は、PostgreSQLサーバーが起動しており、対応するデータベースとユーザーが存在している必要があります。
        </p>
      </main>
    );
  }

  // ここに到達することは、isDbConnected, !needsTableSetup, !needsAdminSetup が全て真であり、
  // すでに checkSetupStatus 関数内でログインページへのリダイレクトが走っているため、
  // このコンポーネントが実際に描画されることは基本的にありません。
  return null;
}