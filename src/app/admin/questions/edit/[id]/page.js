// /src/app/admin/questions/edit/[id]/page.js
// 役割: 既存の問題を編集するページ

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import QuestionForm from '@/components/QuestionForm';
import { apiClient } from '@/utils/apiClient';

export default function EditQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [initialData, setInitialData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchQuestion = useCallback(async () => {
    try {
      const response = await apiClient(`/api/admin/questions/${id}`);
      if (!response.ok) {
        throw new Error('問題データの取得に失敗しました');
      }
      const data = await response.json();
      setInitialData(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchQuestion();
    }
  }, [id, fetchQuestion]);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setError('');

    try {
      const response = await apiClient(`/api/admin/questions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || '問題の更新に失敗しました。');
      }
      
      alert('問題を更新しました。');
      router.push('/admin/questions');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <main style={{ padding: '2rem' }}>問題データを読み込み中...</main>;
  }

  if (error) {
    return <main style={{ padding: '2rem' }}><p style={{ color: 'red' }}>{error}</p></main>;
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>問題を編集</h1>
      <QuestionForm 
        initialData={initialData} 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
      />
    </main>
  );
}