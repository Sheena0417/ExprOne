# Expression Control - CEP Extension

After Effects用のExpression Control CEP拡張機能です。Monaco Editorを統合したモダンなUIでエクスプレッションの編集・管理ができます。

## 🎉 最新情報（2025-10-13）

**✅ Monaco Editor が CEP 環境で正常に動作するようになりました！**

- CDN ではなく**ローカルファイル**を使用（オフラインでも動作）
- file:// プロトコルでの Worker 動作に対応
- CSP（Content Security Policy）を最適化

詳細は [`SETUP_GUIDE.md`](./SETUP_GUIDE.md) を参照してください。

## 🚀 特徴

- **Monaco Editor統合** - シンタックスハイライト、エラー検出、オートコンプリート
  - After Effects Expression 専用の言語定義
  - `thisComp`, `wiggle`, `ease` など AE 固有の関数・キーワードに対応
  - スニペット機能（パラメータ補完）
- **モダンなUI** - ダークテーマ、レスポンシブデザイン  
- **レイヤープロパティスキャン** - エクスプレッション対応プロパティの自動検出
  - Transform, Effects, Text など全プロパティに対応
  - 3D レイヤー、レイヤースタイルにも対応
- **既存エクスプレッション管理** - 設定済みエクスプレッションの読み込み・編集
- **バッチ適用** - 複数レイヤーへの一括適用
- **エクスプレッション検証** - 基本的な構文チェック

## 📦 インストール方法

### デバッグ版（開発用）
```bash
cd CEP_Extension/ExpressionControl
npm install
npm run dev
```

### 本番版
1. ZXPファイルを作成:
   ```bash
   npm run package
   ```
2. ZXP Installerやコマンドラインでインストール

## 🔧 開発環境セットアップ

### 必要要件
- Node.js 14以上
- After Effects 2020以上
- CEPデバッグモードの有効化

### デバッグモード有効化
Macの場合:
```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
```

Windowsの場合（レジストリエディタで）:
```
[HKEY_CURRENT_USER\Software\Adobe\CSXS.11]
"PlayerDebugMode"="1"
```

### 開発用インストール
```bash
# 依存関係をインストール
npm install

# デバッグ版をインストール
npm run dev

# After Effectsを再起動
# Window > Extensions > Expression Control
```

## 📁 ディレクトリ構造

```
ExpressionControl/
├── CSXS/
│   └── manifest.xml          # CEP拡張機能設定
├── js/
│   ├── CSInterface.js        # Adobe CEP通信ライブラリ
│   ├── main.js              # メインUI制御
│   └── expressionAPI.js     # AE Expression API
├── jsx/
│   └── expressionControl.jsx # ExtendScript（AE API）
├── css/
│   └── style.css            # UIスタイル
├── assets/                  # アイコン用
├── .debug/                  # デバッグ設定
├── index.html               # メインUI
└── package.json            # プロジェクト設定
```

## 🎯 使用方法

1. **レイヤー選択**: After Effectsでレイヤーを選択
2. **スキャン**: "選択レイヤーをスキャン"ボタンをクリック
3. **プロパティ選択**: リストからエクスプレッションを設定したいプロパティを選択
4. **エクスプレッション編集**: Monaco Editorでエクスプレッションを記述
5. **適用**: "エクスプレッションを適用"ボタンでレイヤーに適用

## 🛠️ 開発コマンド

```bash
# 開発用インストール
npm run dev

# ビルド
npm run build

# パッケージ作成
npm run package

# デバッグ版アンインストール
npm run uninstall-debug
```

## 🔍 デバッグ

拡張機能のデバッグは以下の方法で行えます：

### 方法 1: パネル上で直接
1. パネル上で**右クリック**
2. "デバッグ" → "デベロッパーツール" を選択

### 方法 2: リモートデバッグ
1. `http://localhost:8092` にアクセス
2. Expression Control をクリック
3. 開発者ツールが開きます

### 動作確認
[`TEST_CHECKLIST.md`](./TEST_CHECKLIST.md) に詳細なテスト手順があります。

## 📝 ライセンス

MIT License

## 🤝 貢献

Issues、Pull Requestsをお待ちしています。

## 📚 ドキュメント

- [`SETUP_GUIDE.md`](./SETUP_GUIDE.md) - Monaco Editor の統合と設定
- [`TEST_CHECKLIST.md`](./TEST_CHECKLIST.md) - 動作確認手順
- [`MONACO_SETUP.md`](./MONACO_SETUP.md) - Monaco Editor の技術詳細

## 📞 サポート

問題が発生した場合は、After Effectsのバージョンとエラーメッセージを含めてIssueを作成してください。

### トラブルシューティング

**Monaco Editor が表示されない**
→ [`SETUP_GUIDE.md`](./SETUP_GUIDE.md) のトラブルシューティングを参照

**Worker エラーが出る**
→ `lib/vs/` フォルダにファイルがあるか確認

**エクスプレッションが適用されない**
→ デベロッパーツールのコンソールでエラーを確認
