// /src/app/admin/questions/page.js
// 役割: 管理者向けの問題一覧ページ

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/utils/apiClient';

export default function AdminQuestionsPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchQuestions = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await apiClient(`/api/admin/questions?page=${page}&limit=${pagination.limit}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '問題一覧の取得に失敗しました');
      }
      
      const data = await response.json();
      setQuestions(data.data || []);
      setPagination(data.meta.pagination);

    } catch (err) {
      console.error('Fetch questions error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'admin') {
      router.replace('/login');
      return;
    }
    fetchQuestions(pagination.page);
  }, [authLoading, isAuthenticated, user, router, fetchQuestions, pagination.page]);
  
  const handleDelete = async (id) => {
    if (!confirm('この問題を本当に削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
        const response = await apiClient(`/api/admin/questions/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || '削除に失敗しました。');
        }
        
        alert('問題を削除しました。');
        // 現在のページを再読み込み
        fetchQuestions(pagination.page);

    } catch (err) {
        setError(err.message);
        alert(`エラー: ${err.message}`);
    }
  };

  if (authLoading || (loading && questions.length === 0)) {
    return <main style={{ padding: '2rem' }}>読み込み中...</main>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>管理者 - 問題管理</h1>
      <button 
        onClick={() => router.push('/admin/questions/new')}
        style={{ marginBottom: '1rem', padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
      >
        ➕ 新しい問題を作成する
      </button>

      {error && <p style={{ color: 'red' }}>エラー: {error}</p>}
      
      <div style={{ overflowX: 'auto' }}>
        <table border="1" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '8px' }}>教科</th>
              <th style={{ padding: '8px' }}>分野</th>
              <th style={{ padding: '8px', width: '40%' }}>問題文</th>
              <th style={{ padding: '8px' }}>対象年齢</th>
              <th style={{ padding: '8px' }}>難易度</th>
              <th style={{ padding: '8px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id}>
                <td style={{ padding: '8px' }}>{q.subject}</td>
                <td style={{ padding: '8px' }}>{q.domain}</td>
                <td style={{ padding: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{q.question_text}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{q.target_age_min || '指定なし'} - {q.target_age_max || '指定なし'}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{q.difficulty_level}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <button 
                    onClick={() => router.push(`/admin/questions/edit/${q.id}`)}
                    style={{ marginRight: '5px', padding: '4px 8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
                  >
                    編集
                  </button>
                  <button 
                    onClick={() => handleDelete(q.id)}
                    style={{ padding: '4px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
            {questions.length === 0 && !loading && (
              <tr>
                <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
                  登録されている問題がありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
        <button disabled={!pagination.hasPrev} onClick={() => fetchQuestions(pagination.page - 1)}>
          前へ
        </button>
        <span>
          ページ {pagination.page} / {pagination.totalPages}
        </span>
        <button disabled={!pagination.hasNext} onClick={() => fetchQuestions(pagination.page + 1)}>
          次へ
        </button>
      </div>
    </div>
  );
}