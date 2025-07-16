// /src/app/api/admin/questions/route.js
// 役割: 管理者向けの問題集API（一覧取得・新規作成）

import { query } from '@/lib/db';
import { withAuth } from '@/lib/withAuth';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createValidationErrorResponse,
  createPaginatedResponse
} from '@/utils/apiResponse';
import { isValidUUID } from '@/utils/validation';

// [GET] 問題一覧を取得
async function getQuestions(req) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = (page - 1) * limit;

  try {
    const [dataResult, totalResult] = await Promise.all([
      query(
        `SELECT id, subject, domain, question_text, difficulty_level, target_age_min, target_age_max 
         FROM questions 
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      query(`SELECT COUNT(*) FROM questions`)
    ]);

    const total = parseInt(totalResult.rows[0].count);

    return createPaginatedResponse(dataResult.rows, page, limit, total);
  } catch (err) {
    return createErrorResponse('問題一覧の取得に失敗しました。', 500, 'DATABASE_ERROR', err.message);
  }
}

// [POST] 新しい問題を作成
async function createQuestion(req, { user }) {
  const body = await req.json();
  const {
    subject,
    domain,
    learning_goal_id,
    question_text,
    question_type = 'free_text',
    options,
    correct_answer,
    explanation,
    difficulty_level = 'beginner',
    target_age_min,
    target_age_max
  } = body;

  // バリデーション
  if (!subject || !domain || !question_text || !correct_answer) {
    return createValidationErrorResponse({
      missing_fields: ['subject', 'domain', 'question_text', 'correct_answer']
    }, '必須項目が不足しています。');
  }

  if (learning_goal_id && !isValidUUID(learning_goal_id)) {
      return createValidationErrorResponse({ learning_goal_id: "Invalid UUID format" });
  }

  try {
    const result = await query(
      `INSERT INTO questions (
        subject, domain, learning_goal_id, question_text, question_type, options, 
        correct_answer, explanation, difficulty_level, target_age_min, target_age_max, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        subject, domain, learning_goal_id, question_text, question_type, options, 
        correct_answer, explanation, difficulty_level, target_age_min, target_age_max, user.id
      ]
    );
    return createSuccessResponse(result.rows[0], '問題が正常に作成されました。', null, 201);
  } catch (err) {
    return createErrorResponse('問題の作成に失敗しました。', 500, 'DATABASE_ERROR', err.message);
  }
}

export const GET = withAuth(getQuestions, { allowedRoles: ['admin'] });
export const POST = withAuth(createQuestion, { allowedRoles: ['admin'] });