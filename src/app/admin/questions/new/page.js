// /src/app/admin/questions/new/page.js
// 役割: 新しい問題を作成するページ

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QuestionForm from '@/components/QuestionForm';
import { apiClient } from '@/utils/apiClient';

export default function NewQuestionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setError('');

    try {
      const response = await apiClient('/api/admin/questions', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || '問題の作成に失敗しました。');
      }

      alert('新しい問題を作成しました。');
      router.push('/admin/questions');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ padding: '2rem' }}>
      <h1>新しい問題を作成</h1>
      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
      <QuestionForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </main>
  );
}