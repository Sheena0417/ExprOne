# Expression Control - CEP Extension

After Effects用のExpression Control CEP拡張機能です。Monaco Editorを統合したモダンなUIでエクスプレッションの編集・管理ができます。

## 🚀 特徴

- **Monaco Editor統合** - シンタックスハイライト、エラー検出、オートコンプリート
- **モダンなUI** - ダーク/ライトテーマ、レスポンシブデザイン  
- **レイヤープロパティスキャン** - エクスプレッション対応プロパティの自動検出
- **既存エクスプレッション管理** - 設定済みエクスプレッションの一覧・編集
- **バッチ適用** - 複数レイヤーへの一括適用
- **エクスプレッション検証** - リアルタイム構文チェック

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

拡張機能のデバッグはChromeの開発者ツールで行えます:
1. `http://localhost:8092` にアクセス
2. Expression Controlをクリック
3. 開発者ツールが開きます

## 📝 ライセンス

MIT License

## 🤝 貢献

Issues、Pull Requestsをお待ちしています。

## 📞 サポート

問題が発生した場合は、After Effectsのバージョンとエラーメッセージを含めてIssueを作成してください。
