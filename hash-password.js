// hash-password.js
// 役割: パスワードを安全にハッシュ化するスクリプト

const bcrypt = require('bcrypt');

// コマンドラインからパスワードを取得
const password = process.argv[2];

if (!password) {
  console.error('エラー: パスワードをコマンドライン引数として指定してください。');
  console.log('使用法: node hash-password.js YOUR_PASSWORD_HERE');
  process.exit(1);
}

bcrypt.hash(password, 10).then(hash => {
  console.log('✅ Bcrypt hash:', hash);
  console.log('\n上記のハッシュ文字列を seed.sql ファイルにコピー＆ペーストしてください。');
});