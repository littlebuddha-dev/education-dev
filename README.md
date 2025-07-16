# **教育AIシステム**

このプロジェクトは、AIチャット機能を中心に、子どものアカデミックな能力向上を支援し、教育スケジュールに基づいて学習をナビゲートする堅牢な教育AIシステムです。保護者は子どもとのチャットを通じて学習をサポートし、子どもの学習履歴やスキル評価を管理できます。管理者は、システム全体のユーザーと学習データを効率的に管理するための機能を利用できます。

## **✨ 主要技術スタック**

| カテゴリ | 技術 |
| :---- | :---- |
| **フロントエンド** | Next.js (App Router), React |
| **バックエンド** | Next.js API Routes (Node.js) |
| **データベース** | PostgreSQL |
| **AI/LLM連携** | Ollama, OpenAI, Gemini, Claude (src/lib/llmRouter.jsで選択) |
| **認証** | JWT (JSON Web Tokens) with Refresh Token (Cookie-based) |
| **セキュリティ** | bcrypt (パスワードハッシュ), zod (入力値検証) |
| **テスト** | Jest, React Testing Library |

## **🚀 開発環境のセットアップ**

このセクションでは、ローカルマシンで開発環境を構築する手順を詳しく説明します。

### **1\. 前提条件**

* **Node.js**: v18.18.0 以上  
* **npm**: v9.0.0 以上  
* **PostgreSQL**: v14 以上  
* **Git**

### **2\. プロジェクトのクローンと依存関係のインストール**

まず、プロジェクトをローカルにクローンし、必要なnpmパッケージをインストールします。

\# 1\. リポジトリをクローン  
git clone \<あなたのリポジトリURL\>  
cd \<リポジトリ名\>

\# 2\. 依存関係をインストール  
npm install

### **3\. 環境変数の設定**

次に、アプリケーションの動作に必要な環境変数を設定します。

1. プロジェクトのルートにある env.local.sample ファイルをコピーして、.env.local という名前の新しいファイルを作成します。  
   cp env.local.sample .env.local

2. .env.local ファイルを開き、お使いの環境に合わせて各値を設定します。  
   \# PostgreSQL データベース接続情報  
   PGHOST=localhost  
   PGPORT=5432  
   PGUSER=your\_postgres\_user      \# あなたのPostgreSQLユーザー名  
   PGPASSWORD=your\_postgres\_password  \# あなたのPostgreSQLパスワード  
   PGDATABASE=education\_db         \# 作成するデータベース名

   \# JWT シークレット（必須）  
   JWT\_SECRET=your\_very\_strong\_jwt\_secret\_key\_here  
   JWT\_REFRESH\_SECRET=your\_different\_jwt\_refresh\_secret\_key\_here

   \# SETUP\_SECRET\_KEY シークレット（初期セットアップ用）  
   \# この後の手順で生成したキーを設定します  
   SETUP\_SECRET\_KEY=your\_setup\_secret\_key\_here

   \# LLM API キー (使用するLLMに応じて設定)  
   OPENAI\_API\_KEY=  
   GEMINI\_API\_KEY=  
   CLAUDE\_API\_KEY=

3. **SETUP\_SECRET\_KEY を生成します。** このキーは、最初のシステムセットアップ時にのみ使用する一時的な秘密鍵です。ターミナルで以下のコマンドを実行してください。  
   node generate-secret.js

4. コマンドを実行すると、ターミナルに新しいキーが出力されます。そのキーをコピーし、.env.local ファイルの SETUP\_SECRET\_KEY= の部分に貼り付けてください。

### **4\. データベースのセットアップ**

アプリケーションが使用するPostgreSQLデータベースとテーブルを準備します。

1. PostgreSQLに接続し、ユーザーとデータベースを作成します。  
   （.env.local で設定した PGUSER と PGDATABASE の値に合わせてください）  
   \# psqlコマンドでpostgresデータベースに接続  
   psql postgres

   \# 以下のSQLコマンドを一行ずつ実行  
   CREATE USER your\_postgres\_user WITH PASSWORD 'your\_postgres\_password';  
   CREATE DATABASE education\_db OWNER your\_postgres\_user;  
   \\q

2. テーブルスキーマを作成します。  
   プロジェクトのルートディレクトリで以下のコマンドを実行し、schema.sql ファイルの内容をデータベースに適用します。  
   psql \-U your\_postgres\_user \-d education\_db \-f schema.sql

   成功すると、NOTICE: \=== 教育AIシステム データベーススキーマ作成完了 \=== というメッセージが表示されます。

### **5\. 初期データの投入（Seeding）**

次に、サンプルユーザーなどの初期データをデータベースに投入します。

1. サンプルユーザー用のパスワードハッシュを生成します。  
   seed.sql には平文のパスワードを保存できないため、bcrypt でハッシュ化した文字列を生成する必要があります。  
   ターミナルで以下のコマンドを実行してください。（your\_password の部分を実際のパスワードに置き換えてください）  
   \# 例: 'adminpassword' というパスワードのハッシュを生成  
   node hash-password.js adminpassword

   実行すると、$2b$10$... から始まる長いハッシュ文字列が出力されます。この文字列をコピーしておきます。  
2. seed.sql ファイルを編集します。  
   seed.sql ファイルを開き、INSERT INTO users 文の中にあるパスワードハッシュのプレースホルダーを、先ほど生成したハッシュに置き換えます。  
   \-- (例)  
   \-- パスワード: adminpassword  
   INSERT INTO users (email, password\_hash, first\_name, last\_name, role, birthday) VALUES  
   ('admin@example.com', '【ここに生成したハッシュを貼り付け】', 'システム', '管理者', 'admin', '1980-01-01')  
   ON CONFLICT (email) DO NOTHING;

   （他のサンプルユーザーも同様にハッシュを生成・置換してください）  
3. 初期データを投入します。  
   編集した seed.sql ファイルを実行して、データをデータベースに挿入します。  
   psql \-U your\_postgres\_user \-d education\_db \-f seed.sql

   成功すると、NOTICE: \=== サンプルデータ投入完了 \=== というメッセージとサンプルアカウント情報が表示されます。

### **6\. 開発サーバーの起動**

全ての準備が整いました。以下のコマンドで開発サーバーを起動します。

npm run dev

ブラウザで http://localhost:3000 にアクセスしてください。

初回アクセス時は、.env.local で設定した SETUP\_SECRET\_KEY を入力してシステムを初期化するセットアップページが表示されます。管理者アカウントを作成すると、ログインページにリダイレクトされます。

### **7\. テストの実行**

プロジェクトにはテストコードが含まれています。以下のコマンドでテストを実行できます。

npm test

## **📚 主要機能**

* **ユーザー管理**: 保護者・子ども・管理者のロールに基づいたアクセス制御。  
* **認証システム**: JWTとリフレッシュトークンによるセキュアなセッション管理。  
* **子ども管理**: 保護者による子どものプロフィール登録と学習状況の確認。  
* **AIチャット**: LLM（Ollama, OpenAI等）と連携した対話型学習機能。  
  * **シナリオ分岐**: 通常会話、問題出題、回答評価を自動で判定。  
  * **自動評価**: 会話内容から子どものスキルを評価し、ログを保存。  
* **問題集管理**: 管理者による問題の作成・編集・削除機能。  
* **スキル管理**: AI評価と手動ログによるスキルデータの記録・統計表示。

## **📂 プロジェクト構造**

.  
├── src/  
│   ├── app/                \# Next.js App Router (ページとAPIルート)  
│   │   ├── (pages)/        \# 各ページのコンポーネント  
│   │   └── api/            \# APIエンドポイント  
│   ├── components/         \# 共通Reactコンポーネント  
│   ├── context/            \# グローバルな状態管理 (AuthContext)  
│   ├── lib/                \# 共通ライブラリ (DB接続, 認証, バリデーション等)  
│   ├── repositories/       \# データベース操作をカプセル化するリポジトリ層  
│   └── utils/              \# 汎用的なユーティリティ関数  
├── public/                 \# 静的ファイル  
├── jest.config.mjs         \# Jestテスト設定  
├── schema.sql              \# データベースのテーブル定義  
└── seed.sql                \# 初期データ  
