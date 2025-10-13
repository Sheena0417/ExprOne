# Monaco Editor 統合完了

## 🎉 実装内容

After Effects CEP拡張機能に **Monaco Editor** を統合しました！

### ✅ 実装された機能

1. **シンタックスハイライト**
   - After Effects Expression専用の言語定義
   - AE固有のキーワード（`thisComp`, `thisLayer`, `time`, `value`など）
   - AE関数（`wiggle`, `ease`, `linear`, `loopIn`など）
   - AEプロパティ（`position`, `scale`, `rotation`, `opacity`など）
   - JavaScriptキーワード（ES2018準拠）
   - Math オブジェクトのメソッド

2. **予測変換（IntelliSense）**
   - AEグローバルオブジェクトの補完
   - AE関数のスニペット付き補完
   - パラメータヒント表示
   - ドキュメント表示

3. **エラー表示**
   - リアルタイム構文チェック（500msデバウンス）
   - 括弧のバランスチェック `()`, `[]`, `{}`
   - 文字列リテラルのチェック
   - Monaco Editorのマーカー機能で赤い波線表示

4. **エディター機能**
   - ダークテーマ（AE Expression専用カラー）
   - 行番号表示
   - 自動フォーマット
   - タブ補完
   - 自動レイアウト

### 🔧 技術的な実装

#### CSP設定（Content Security Policy）
```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self' https://cdn.jsdelivr.net blob: data:;
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net blob:;
    worker-src 'self' blob:;
    style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
    img-src 'self' data:;
    font-src 'self' data:;
">
```

#### Blob Worker設定
CEPの`file://`プロトコルでWorkerを動作させるため、Blob Workerを使用：

```javascript
window.MonacoEnvironment = {
    getWorker: function (moduleId, label) {
        const getWorkerModule = (moduleUrl) => {
            const workerUrl = `https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/${moduleUrl}`;
            return new Worker(URL.createObjectURL(new Blob([`
                self.MonacoEnvironment = { baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/' };
                importScripts('${workerUrl}');
            `], { type: 'text/javascript' })));
        };
        // ...
    }
};
```

#### カスタム言語定義（Monarch）
After Effects Expression専用の言語定義を作成：

```javascript
monaco.languages.register({ id: 'ae-expression' });
monaco.languages.setMonarchTokensProvider('ae-expression', {
    tokenizer: {
        root: [
            [/\b(thisComp|thisLayer|time|value)\b/, 'keyword.ae'],
            [/\b(wiggle|ease|linear)\b/, 'function.ae'],
            // ...
        ]
    }
});
```

## 🚀 使い方

### 1. After Effectsを再起動
拡張機能を読み込むため、After Effectsを完全に再起動してください。

### 2. 拡張機能を開く
`Window > Extensions > Expression Control`

### 3. エディターの機能

#### シンタックスハイライト
- **AEキーワード**: 明るい青色（`thisComp`, `thisLayer`など）
- **AE関数**: 緑色（`wiggle`, `ease`など）
- **AEプロパティ**: オレンジ色（`position`, `scale`など）
- **JS キーワード**: 紫色（`if`, `for`, `function`など）
- **コメント**: グレー
- **文字列**: 黄色
- **数値**: 薄い緑

#### 予測変換
- タイプ開始で自動表示
- `Ctrl+Space` で手動表示
- `Tab` または `Enter` で補完

#### エラー表示
- 赤い波線: 構文エラー
- マウスオーバーでエラー内容表示

## 📁 変更されたファイル

1. **index.html**
   - Monaco Editor CDN追加
   - CSP設定追加
   - エディターコンテナID変更（`codeMirrorEditor` → `monacoEditor`）

2. **js/main.js**
   - 完全に書き直し
   - Monaco Editor初期化コード
   - Blob Worker設定
   - AE Expression言語定義
   - 補完機能
   - エラー検証機能

3. **css/style.css**
   - Monaco Editor用スタイルに更新

4. **シンボリックリンク修正**
   - 正しいディレクトリを指すように修正

## 🔍 トラブルシューティング

### Monaco Editorが表示されない
1. After Effectsを完全に再起動
2. ブラウザのコンソールでエラーを確認（右クリック → デバッグ）
3. インターネット接続を確認（CDNからの読み込み）

### 予測変換が動作しない
1. `Ctrl+Space` を押してみる
2. 2文字以上タイプする
3. コンソールでWorkerエラーを確認

### エラー表示が出ない
1. 500ms待つ（デバウンス）
2. 実際に構文エラーがあるか確認
3. コンソールでエラーを確認

## 📝 今後の拡張

### プロジェクト依存の補完
ExtendScriptでコンポ/レイヤー名を取得して補完候補に追加可能：

```javascript
csInterface.evalScript('getProjectComps()', function(result) {
    // 補完候補にコンポ名を追加
});
```

### AEへのリアルタイムエラー取得
一時的にexpressionを適用して`expressionError`を取得：

```javascript
// app.beginUndoGroup()
// property.expression = code
// const error = property.expressionError
// app.undo()
// Monaco markerに反映
```

### webpack化
より高速で安定した動作のため：

```bash
npm install --save-dev webpack webpack-cli monaco-editor monaco-editor-webpack-plugin
```

## 🎨 カスタマイズ

### テーマカラー変更
`js/main.js`の`monaco.editor.defineTheme('ae-dark', {...})`を編集

### 補完候補追加
`monaco.languages.registerCompletionItemProvider('ae-expression', {...})`に追加

### 構文ルール追加
`monaco.languages.setMonarchTokensProvider('ae-expression', {...})`に追加

---

**作成日**: 2025-10-13
**Monaco Editorバージョン**: 0.45.0
**対象**: After Effects 2020以降（CEP 11+）

