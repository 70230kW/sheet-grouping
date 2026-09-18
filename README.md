# レンタカー研究会 座席表自動生成アプリ

月次勉強会の参加企業を 1 島（テーブル）最大 6 社にグルーピングする座席表を、
ルールベースのスコアリングで半自動生成する Web アプリです。

- Google スプレッドシート（または貼り付け）から参加者データを取り込み
- 商圏重複 / 売上規模乖離を避け、「繋げたい企業」「やりたい事業」のマッチを優先する自動配置
- ドラッグ & ドロップで手動調整、島ごとのスコアと警告をリアルタイム表示
- 印刷 / PDF 出力（A4 横）

## 技術構成

React 19 + Vite + TypeScript / @dnd-kit / Vitest / Firebase Hosting（静的ホスティング）

## ドキュメント

- [docs/DESIGN.md](docs/DESIGN.md) — 認証方式・カラム設計・スコアリングモデルの初期案と **要確認事項**
- [docs/SETUP.md](docs/SETUP.md) — Google Cloud / Firebase の設定手順

## 開発

```bash
npm install
npm run dev
npm test
npm run build
```

## ディレクトリ

```
src/
  domain/     スコアリング・最適化（純粋ロジック、テスト付き）
  data/       CSV/TSV パース、列マッピング、Google Sheets 読み込み、サンプル
  components/ 画面（データ取込 / 座席表ボード / 設定 / 印刷）
  state/      localStorage 永続化
```
