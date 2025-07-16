// src/lib/validationSchemas.js
// 役割: zodを用いたAPI入力スキーマの定義

import { z } from 'zod';

// 共通のUUIDスキーマ
const a = z.string().uuid({ message: '無効なID形式です' });

// 認証関連
export const loginSchema = z.object({
  email: z.string().email({ message: '無効なメールアドレス形式です' }),
  password: z.string().min(8, { message: 'パスワードは8文字以上で入力してください' }),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: z.enum(['parent', 'child']),
  birthday: z.string().date(),
});

// 問題関連
export const questionSchema = z.object({
  subject: z.string().min(1, '教科は必須です'),
  domain: z.string().min(1, '分野は必須です'),
  question_text: z.string().min(1, '問題文は必須です'),
  correct_answer: z.string().min(1, '正解は必須です'),
  explanation: z.string().optional(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  target_age_min: z.coerce.number().int().optional(),
  target_age_max: z.coerce.number().int().optional(),
  learning_goal_id: a.optional().nullable(),
});

// パラメータのバリデーション
export const uuidParamSchema = z.object({
  id: a,
});