// src/app/layout.js (修正後)
import './globals.css';
import Navbar from '@/components/Navbar';
import { AuthProvider } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard'; // ✅ AuthGuardをインポート

export const metadata = {
  title: '教育AIシステム',
  description: 'AIと共に学ぶ新しい教育プラットフォーム',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          {/* AuthGuardでラップすることで、配下の全ページに認証チェックを適用 */}
          <AuthGuard>
            <Navbar />
            <main>{children}</main>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}