# セットアップ手順

## ローカル開発

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # スコアリング・最適化のユニットテスト
npm run build    # dist/ に本番ビルド
```

## Google Cloud 側の設定（OAuth 方式）

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成（既存でも可）
2. **API とサービス > ライブラリ** で「Google Sheets API」を有効化
3. **API とサービス > OAuth 同意画面**
   - Workspace 組織の場合: ユーザータイプ「内部」を選択（審査不要）
   - 個人アカウントの場合: 「外部」を選択し、「テストユーザー」に利用者の Gmail アドレスを追加
   - スコープに `.../auth/spreadsheets.readonly` を追加
4. **API とサービス > 認証情報 > 認証情報を作成 > OAuth クライアント ID**
   - アプリケーションの種類: **ウェブ アプリケーション**
   - 承認済みの JavaScript 生成元:
     - `http://localhost:5173`
     - `https://<firebase-project>.web.app`
     - `https://<firebase-project>.firebaseapp.com`
   - リダイレクト URI は不要（トークンクライアント方式のため）
5. 発行された **クライアント ID**（`xxxx.apps.googleusercontent.com`）をアプリの「設定 > Google スプレッドシート連携」に貼り付け
6. スプレッドシートの URL とシート名を入力し、「データ > シートから読み込む」

初回はログイン画面が開き、「スプレッドシートの閲覧」権限を求められます。トークンはブラウザのメモリ上にのみ保持されます。

## Google Cloud 側の設定（API キー方式・簡易）

シートを「リンクを知っている全員が閲覧可」にできる場合のみ利用してください。

1. Sheets API を有効化
2. **認証情報を作成 > API キー**。「アプリケーションの制限」で HTTP リファラーに上記の生成元を登録し、「API の制限」で Sheets API のみ許可
3. アプリの設定で認証方式を「API キー」にし、キーを貼り付け

## Firebase Hosting へのデプロイ

```bash
npm install -g firebase-tools
firebase login
firebase init hosting     # 既存プロジェクトを選択。public は dist、SPA は Yes（firebase.json は同梱済み）
npm run build
firebase deploy --only hosting
```

`.firebaserc` はプロジェクト固有のため `.gitignore` に入れています。`firebase init` で生成してください。

### 代替デプロイ先

静的サイトなので Cloudflare Pages / Vercel / GitHub Pages でも同様に動作します。
GitHub Pages を使う場合は `vite.config.ts` の `base` をリポジトリ名に合わせてください。
