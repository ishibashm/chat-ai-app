# AI Chat Application

Next.js 14とTypeScriptで構築された高度なAIチャットアプリケーション。GPT-4 Turbo、GPT-4、GPT-3.5 Turbo、Claudeをサポートし、数式とコードのリアルタイムレンダリング機能を備えています。

## 特徴

- 🤖 複数のAIモデルをサポート
  - GPT-4 Turbo (gpt-4-0125-preview)
  - GPT-4
  - GPT-3.5 Turbo
  - Claude

- 📝 高度な表示機能
  - LaTeX数式のレンダリング
  - シンタックスハイライト付きコードブロック
  - マークダウン形式のテキスト
  - コードのコピー機能

- 💬 チャット管理機能
  - チャット履歴の自動保存
  - タイトルの自動生成と編集
  - チャットの削除機能
  - チャット間の文脈共有

## セットアップ

1. リポジトリのクローン:
```bash
git clone https://github.com/yourusername/chat-ai-app.git
cd chat-ai-app
```

2. 依存関係のインストール:
```bash
npm install
```

3. 環境変数の設定:
```bash
cp .env.example .env
```
`.env`ファイルを編集して、必要なAPIキーを設定:
- `OPENAI_API_KEY`: OpenAIのAPIキー
- `ANTHROPIC_API_KEY`: AnthropicのAPIキー（Claudeを使用する場合）

4. 開発サーバーの起動:
```bash
npm run dev
```

アプリケーションは http://localhost:3000 で利用可能になります。

## 使用方法

### 数式の記述
- インライン数式: `$E = mc^2$`
- ブロック数式: `$$\sum_{i=1}^n i = \frac{n(n+1)}{2}$$`

### コードブロックの記述
````
```python
def hello():
    print("Hello, World!")
```
````

### チャット管理
- 「New Chat」ボタンで新規チャット作成
- チャットタイトルをダブルクリックして編集
- 「Use Context」チェックボックスで文脈の使用を制御
- チャットタイトルにカーソルを合わせると削除ボタンが表示

## 技術スタック

- Next.js 14
- TypeScript
- Tailwind CSS
- KaTeX（数式レンダリング）
- OpenAI API
- Anthropic API

## ライセンス

MITライセンス

## 注意事項

- APIキーは`.env`ファイルで管理し、Gitにコミットしないでください
- チャット履歴はローカルストレージに保存されます
- 長い数式やコードブロックは自動的に折り返されます
