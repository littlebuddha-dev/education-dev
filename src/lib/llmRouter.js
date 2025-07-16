// src/lib/llmRouter.js
// タイトル: LLMルーター
// 役割: 各種LLMプロバイダーへのリクエストを抽象化し、一元的に処理します。

const PROVIDERS = {
  OLLAMA: "ollama",
  OPENAI: "openai",
  GEMINI: "gemini",
  CLAUDE: "claude",
};

export async function fetchLLM(provider, input, systemPrompt = "You are a helpful assistant.") {
  try {
    switch (provider) {
      case PROVIDERS.OLLAMA:
        return await fetchOllama(input, systemPrompt);
      case PROVIDERS.OPENAI:
        return await fetchOpenAI(input, systemPrompt);
      case PROVIDERS.GEMINI:
        return await fetchGemini(input, systemPrompt);
      case PROVIDERS.CLAUDE:
        return await fetchClaude(input, systemPrompt);
      default:
        throw new Error(`未対応のプロバイダ: ${provider}`);
    }
  } catch (err) {
    console.error("[fetchLLM error]", err);
    return "(先生が応答できませんでした)";
  }
}

async function fetchOllama(input, systemPrompt) {
  // [修正] 環境変数からモデル名を取得（未設定時はデフォルト値を使用）
  const model = process.env.OLLAMA_MODEL || "gemma3:latest";
  const res = await fetch("http://localhost:11434/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input }
      ],
      stream: false
    })
  });
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "(no response)";
}

async function fetchOpenAI(input, systemPrompt) {
  // [修正] 環境変数からモデル名を取得
  const model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input }
      ],
      stream: false
    })
  });
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "(no response)";
}

async function fetchGemini(input, systemPrompt) {
  // [修正] 環境変数からモデル名を取得
  const model = process.env.GEMINI_MODEL || "gemini-pro";
  const fullPrompt = `${systemPrompt}\n\n${input}`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }]
    })
  });
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "(no response)";
}

async function fetchClaude(input, systemPrompt) {
  // [修正] 環境変数からモデル名を取得
  const model = process.env.CLAUDE_MODEL || "claude-3-opus-20240229";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input }
      ],
      max_tokens: 1024,
      stream: false
    })
  });
  const json = await res.json();
  // Claude APIのレスポンス形式に合わせて調整
  return json.content?.[0]?.text ?? "(no response)";
}