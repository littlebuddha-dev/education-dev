// /src/app/api/chat/route.js
// 役割: チャット処理API（問題出題・評価機能付き）

import { query } from '@/lib/db';
import { verifyAccessTokenFromHeader } from '@/lib/auth';
import { fetchLLM } from '@/lib/llmRouter';

/**
 * 誕生日から年齢を計算するヘルパー関数
 * @param {Date | string} birthday - 誕生日
 * @returns {number} - 現在の年齢
 */
function calculateAge(birthday) {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * メッセージから質問IDタグを抽出する正規表現
 */
const QUESTION_ID_REGEX = /\[Q_ID=([0-9a-fA-F-]+)\]/;

export async function POST(req) {
  try {
    const user = verifyAccessTokenFromHeader(req);
    const { provider, message, systemPrompt, childId } = await req.json();

    // ユーザーの最後の会話（アシスタントからの）を取得して、回答待ちの問題があるかチェック
    const lastAssistantLogRes = await query(
      `SELECT message FROM conversation_logs 
       WHERE user_id = $1 AND role = 'assistant' 
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );
    
    const lastAssistantMessage = lastAssistantLogRes.rows[0]?.message || '';
    const match = lastAssistantMessage.match(QUESTION_ID_REGEX);

    // --- シナリオ1: ユーザーが問題に回答している場合 ---
    if (match) {
      const questionId = match[1];
      const questionRes = await query(
        `SELECT correct_answer, explanation FROM questions WHERE id = $1`,
        [questionId]
      );

      if (questionRes.rows.length > 0) {
        const { correct_answer, explanation } = questionRes.rows[0];
        const evaluationPrompt = `
          あなたは先生です。生徒が問題に回答しました。
          - 生徒の回答: "${message}"
          - 問題の正解: "${correct_answer}"
          
          まず、生徒の回答が正解かどうかを判定してください。完全一致でなくても、意図が合っていれば正解と見なしてください。
          判定結果を「正解です！」「残念、不正解です。」のように明確に伝えた上で、以下の解説を元に優しく丁寧な言葉で説明してください。
          
          解説: ${explanation || 'この問題には詳しい解説がありません。'}
        `;
        
        const feedbackResponse = await fetchLLM(provider, message, evaluationPrompt);
        
        // ユーザーの回答とAIのフィードバックをログに保存
        await query(
          `INSERT INTO conversation_logs (user_id, role, message) VALUES ($1, 'user', $2), ($1, 'assistant', $3)`,
          [user.id, message, feedbackResponse]
        );
        
        return Response.json({ response: feedbackResponse });
      }
    }

    // --- シナリオ2: ユーザーが新しい問題をリクエストしている場合 ---
    if (message.includes('問題') || message.includes('クイズ')) {
      const childRes = await query(`SELECT birthday FROM children WHERE id = $1`, [childId]);
      if (childRes.rows.length > 0) {
        const age = calculateAge(childRes.rows[0].birthday);
        
        let questionRes;
        if (age) {
          // 年齢に合った問題を取得
          questionRes = await query(
            `SELECT id, question_text FROM questions 
             WHERE target_age_min <= $1 AND target_age_max >= $1 
             ORDER BY RANDOM() LIMIT 1`,
            [age]
          );
        } else {
          // 年齢が不明な場合はランダムに出題
          questionRes = await query(`SELECT id, question_text FROM questions ORDER BY RANDOM() LIMIT 1`);
        }
        
        if (questionRes.rows.length > 0) {
          const question = questionRes.rows[0];
          // 利用者に見えないIDタグを付与して問題文を生成
          const questionToAsk = `${question.question_text} [Q_ID=${question.id}]`;
          
          // ユーザーのリクエストとAIの出題をログに保存
          await query(
            `INSERT INTO conversation_logs (user_id, role, message) VALUES ($1, 'user', $2), ($1, 'assistant', $3)`,
            [user.id, message, questionToAsk]
          );

          // タグを削除してクライアントに返す
          return Response.json({ response: question.question_text });
        }
      }
      // 問題が見つからなかった場合は通常の会話として処理する
    }

    // --- シナリオ3: 通常の会話 ---
    const defaultSystemPrompt = systemPrompt || 'あなたは子どもに優しく丁寧に教える先生です。';
    const aiResponse = await fetchLLM(provider, message, defaultSystemPrompt);

    // 通常の会話ログを保存
    await query(
      `INSERT INTO conversation_logs (user_id, role, message) VALUES ($1, 'user', $2), ($1, 'assistant', $3)`,
      [user.id, message, aiResponse]
    );
    
    // (省略) 既存の評価ログ保存処理...

    return Response.json({ response: aiResponse });

  } catch (err) {
    if (err.message.includes('token') || err.message.includes('Authorization')) {
      return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    console.error('[chat API エラー]:', err);
    return Response.json({ error: '会話処理に失敗しました' }, { status: 500 });
  }
}