// /src/components/QuestionForm.js
// 役割: 問題作成・編集用の共通フォームコンポーネント

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QuestionForm({ initialData = null, onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState({
    subject: '',
    domain: '',
    question_text: '',
    correct_answer: '',
    explanation: '',
    difficulty_level: 'beginner',
    target_age_min: '',
    target_age_max: ''
  });
  const router = useRouter();

  useEffect(() => {
    if (initialData) {
      setFormData({
        subject: initialData.subject || '',
        domain: initialData.domain || '',
        question_text: initialData.question_text || '',
        correct_answer: initialData.correct_answer || '',
        explanation: initialData.explanation || '',
        difficulty_level: initialData.difficulty_level || 'beginner',
        target_age_min: initialData.target_age_min || '',
        target_age_max: initialData.target_age_max || ''
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const formRowStyle = { marginBottom: '1rem' };
  const labelStyle = { display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' };
  const inputStyle = { width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' };
  const buttonStyle = { padding: '0.8rem 1.5rem', cursor: 'pointer', border: 'none', borderRadius: '4px' };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '800px', margin: 'auto' }}>
      <div style={formRowStyle}>
        <label htmlFor="subject" style={labelStyle}>教科</label>
        <input type="text" id="subject" name="subject" value={formData.subject} onChange={handleChange} required style={inputStyle} />
      </div>

      <div style={formRowStyle}>
        <label htmlFor="domain" style={labelStyle}>分野</label>
        <input type="text" id="domain" name="domain" value={formData.domain} onChange={handleChange} required style={inputStyle} />
      </div>

      <div style={formRowStyle}>
        <label htmlFor="question_text" style={labelStyle}>問題文</label>
        <textarea id="question_text" name="question_text" value={formData.question_text} onChange={handleChange} required rows="5" style={inputStyle}></textarea>
      </div>

      <div style={formRowStyle}>
        <label htmlFor="correct_answer" style={labelStyle}>正解</label>
        <input type="text" id="correct_answer" name="correct_answer" value={formData.correct_answer} onChange={handleChange} required style={inputStyle} />
      </div>

      <div style={formRowStyle}>
        <label htmlFor="explanation" style={labelStyle}>解説</label>
        <textarea id="explanation" name="explanation" value={formData.explanation} onChange={handleChange} rows="3" style={inputStyle}></textarea>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{...formRowStyle, flex: 1}}>
            <label htmlFor="difficulty_level" style={labelStyle}>難易度</label>
            <select id="difficulty_level" name="difficulty_level" value={formData.difficulty_level} onChange={handleChange} style={inputStyle}>
                <option value="beginner">初級</option>
                <option value="intermediate">中級</option>
                <option value="advanced">上級</option>
            </select>
        </div>
        <div style={{...formRowStyle, flex: 1}}>
            <label htmlFor="target_age_min" style={labelStyle}>対象年齢（下限）</label>
            <input type="number" id="target_age_min" name="target_age_min" value={formData.target_age_min} onChange={handleChange} style={inputStyle} />
        </div>
        <div style={{...formRowStyle, flex: 1}}>
            <label htmlFor="target_age_max" style={labelStyle}>対象年齢（上限）</label>
            <input type="number" id="target_age_max" name="target_age_max" value={formData.target_age_max} onChange={handleChange} style={inputStyle} />
        </div>
      </div>
      
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <button type="submit" disabled={isSubmitting} style={{ ...buttonStyle, backgroundColor: '#007bff', color: 'white' }}>
          {isSubmitting ? '保存中...' : (initialData ? '更新する' : '作成する')}
        </button>
        <button type="button" onClick={() => router.back()} style={{ ...buttonStyle, backgroundColor: '#6c757d', color: 'white' }}>
          キャンセル
        </button>
      </div>
    </form>
  );
}