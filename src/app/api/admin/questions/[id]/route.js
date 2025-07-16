// /src/app/api/admin/questions/[id]/route.js
// 役割: 管理者向けの問題集API（個別取得・更新・削除）

import { withAuth } from '@/lib/withAuth';
import { withValidation } from '@/lib/withValidation'; // インポート
import { questionSchema, uuidParamSchema } from '@/lib/validationSchemas'; // スキーマをインポート
import { 
  createSuccessResponse, 
  createErrorResponse,
  createNotFoundResponse
} from '@/utils/apiResponse';
import { query } from '@/lib/db'; // queryはリポジトリに移行するまで残す

// GET
const getQuestionByIdHandler = async (req, { params }) => {
  const { id } = params;
  // バリデーションはwithValidationで行われるため、ここでのチェックは不要
  try {
    const result = await query('SELECT * FROM questions WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return createNotFoundResponse('問題');
    }
    return createSuccessResponse(result.rows[0]);
  } catch (err) {
    return createErrorResponse('問題の取得に失敗しました。', 500, 'DATABASE_ERROR', err.message);
  }
};

// PUT
const updateQuestionHandler = async (req, { params }) => {
  const { id } = params;
  const validatedData = req.validatedBody; // 検証済みデータを取得

  try {
    // ... (更新処理ロジック)
    const result = await query(
      `UPDATE questions SET ... RETURNING *`,
      [/* ... */]
    );
    if (result.rowCount === 0) {
      return createNotFoundResponse('問題');
    }
    return createSuccessResponse(result.rows[0], '問題が正常に更新されました。');
  } catch (err) {
    return createErrorResponse('問題の更新に失敗しました。', 500, 'DATABASE_ERROR', err.message);
  }
};

// DELETE
const deleteQuestionHandler = async (req, { params }) => {
  const { id } = params;
  try {
    const result = await query('DELETE FROM questions WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return createNotFoundResponse('問題');
    }
    return createSuccessResponse({ id: result.rows[0].id }, '問題が正常に削除されました。');
  } catch (err) {
    return createErrorResponse('問題の削除に失敗しました。', 500, 'DATABASE_ERROR', err.message);
  }
};

// withAuthとwithValidationでハンドラをラップ
export const GET = withAuth(withValidation(getQuestionByIdHandler, { params: uuidParamSchema }), { allowedRoles: ['admin'] });
export const PUT = withAuth(withValidation(updateQuestionHandler, { params: uuidParamSchema, body: questionSchema.partial() }), { allowedRoles: ['admin'] });
export const DELETE = withAuth(withValidation(deleteQuestionHandler, { params: uuidParamSchema }), { allowedRoles: ['admin'] });