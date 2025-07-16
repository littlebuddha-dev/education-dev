// generate-secret.js

const crypto = require('crypto');

// 32バイト（256ビット）のランダムなバイト列を生成し、hex形式の文字列に変換
const secretKey = crypto.randomBytes(32).toString('hex');

console.log('生成されたSETUP_SECRET_KEY:', secretKey);
console.log('\nこの鍵を .env.local ファイルの SETUP_SECRET_KEY= の後に追加してください。');