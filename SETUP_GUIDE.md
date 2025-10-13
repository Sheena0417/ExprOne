# 🎉 Monaco Editor 統合完了！

## ✅ 何を修正したか

### 問題の原因
- Monaco Editor を **CDN（https://cdn.jsdelivr.net/）から読み込んでいた**
- Web ブラウザ（http://）では動くが、**CEP（file://）では動かない**
- Worker ファイルも CDN から読み込もうとしていたため、エラーが発生

### 解決策
1. ✅ **Monaco Editor をローカルに配置**
   - `lib/vs/` フォルダに Monaco Editor のファイルを配置
   - CDN ではなく、ローカルファイルを読み込むように変更

2. ✅ **Worker の設定を修正**
   - Blob Worker を使って file:// プロトコルでも動作するように
   - ローカルパスを使って Worker を起動

3. ✅ **CSP（Content Security Policy）を最適化**
   - CDN への参照を削除
   - 'self' と blob: のみを許可

4. ✅ **JSX と JavaScript の API を統一**
   - ExtendScript 側と CEP 側のデータ形式を統一
   - 文字列形式でのやり取りに統一（CEP の制約）

## 📝 変更されたファイル

### 1. `index.html`
```html
<!-- 変更前（CDN） -->
<script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js"></script>

<!-- 変更後（ローカル） -->
<script src="./lib/vs/loader.js"></script>
```

### 2. `js/main.js`
```javascript
// 変更前（CDN）
require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

// 変更後（ローカル）
require.config({ paths: { vs: './lib/vs' } });
```

### 3. `jsx/expressionControl.jsx`
- `getSelectedLayers()` を文字列形式に変更
- `listVisibleExpressionProps()` を文字列形式に変更
- `listCommonExpressionProps()` を文字列形式に変更
- `getExpressionContent()` を追加
- `applyExpressionToLayers()` を追加
- `findPropertyByName()` を追加
- `getPropertyFullPath()` を追加

### 4. `lib/vs/`
- Monaco Editor のファイルを配置（約 5MB）

## 🚀 テスト方法

### 1. After Effects を再起動
```bash
# macOS の場合
killall "After Effects"
open -a "Adobe After Effects 2024"
```

### 2. 拡張機能を開く
1. After Effects を起動
2. `Window` → `Extensions` → `Expression Control (Monaco)`

### 3. 動作確認
1. **コンポジションを開く**
2. **レイヤーを選択**
3. **「This Layer(s)」ボタンをクリック**
4. **プロパティが表示されることを確認**
5. **Monaco Editor でエクスプレッションを入力**
   - シンタックスハイライトが効いているか確認
   - 補完候補（`thisComp`, `wiggle` など）が出るか確認
6. **Apply Expression ボタンで適用**

### 4. デバッグ方法（エラーが出た場合）
```bash
# CEP のデバッグモードを有効化（既に有効なはず）
# パネル上で右クリック → "デバッグ" → "デベロッパーツール"

# コンソールを確認：
# - "✅ Monaco Editor loaded" が表示されるか
# - Worker のエラーがないか
# - fetch/CORS エラーがないか
```

## 🎨 Monaco Editor の機能

### シンタックスハイライト
- **AE キーワード**: `thisComp`, `thisLayer`, `time`, `value` など（水色）
- **AE 関数**: `wiggle`, `ease`, `linear` など（緑色）
- **AE プロパティ**: `position`, `scale`, `rotation` など（オレンジ色）
- **JavaScript**: `if`, `for`, `function` など（紫色）
- **コメント**: `//` と `/* */`（グレー）
- **文字列**: `"..."` と `'...'`（黄色）
- **数値**: `123`, `3.14` など（薄緑）

### オートコンプリート（補完）
- タイプ開始で自動表示
- `Ctrl+Space`（Windows）/ `Cmd+Space`（Mac）で手動表示
- `Tab` または `Enter` で補完

### スニペット
- `wiggle` → `wiggle(${1:freq}, ${2:amp})`
- パラメータをタブで移動可能

## 🔧 今後の拡張（やり取りで話した内容）

### 1. プロジェクト依存の補完
現在のコンポジション/レイヤー名を取得して補完候補に追加：

```javascript
// JSX 側で実装
function getProjectComps() {
    var comps = [];
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof CompItem) {
            comps.push(item.name);
        }
    }
    return JSON.stringify(comps);
}
```

```javascript
// CEP 側で使用
csInterface.evalScript('getProjectComps()', function(result) {
    var comps = JSON.parse(result);
    // Monaco の補完候補に追加
});
```

### 2. AE へのリアルタイムエラー取得
一時的に expression を適用して `expressionError` を取得：

```javascript
// JSX 側
function validateExpressionInAe(layerIndex, propertyName, expression) {
    var comp = app.project.activeItem;
    var layer = comp.layer(layerIndex);
    var prop = findPropertyByName(layer, propertyName);
    
    var prevExpr = prop.expression;
    var prevEnabled = prop.expressionEnabled;
    
    try {
        prop.expression = expression;
        prop.expressionEnabled = true;
        var error = prop.expressionError;
        
        // 元に戻す
        prop.expression = prevExpr;
        prop.expressionEnabled = prevEnabled;
        
        if (error && error !== "") {
            return JSON.stringify({ valid: false, error: error });
        } else {
            return JSON.stringify({ valid: true });
        }
    } catch (e) {
        prop.expression = prevExpr;
        prop.expressionEnabled = prevEnabled;
        return JSON.stringify({ valid: false, error: e.toString() });
    }
}
```

```javascript
// CEP 側でデバウンスして呼び出し
let debounceTimer;
monacoEditor.onDidChangeContent(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const expression = monacoEditor.getValue();
        csInterface.evalScript(`validateExpressionInAe(...)`, (result) => {
            const data = JSON.parse(result);
            if (!data.valid) {
                // Monaco Editor にマーカー（赤波線）を表示
                monaco.editor.setModelMarkers(model, 'ae-error', [{
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 100,
                    message: data.error,
                    severity: monaco.MarkerSeverity.Error
                }]);
            }
        });
    }, 500);
});
```

### 3. webpack 化（より高速・安定）
現在は AMD ローダーを使っているが、webpack でバンドルするとより安定：

```bash
npm install --save-dev webpack webpack-cli monaco-editor monaco-editor-webpack-plugin
```

```javascript
// webpack.config.js
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = {
    entry: './src/panel.js',
    output: {
        filename: 'bundle.js',
        path: __dirname + '/dist'
    },
    plugins: [
        new MonacoWebpackPlugin({
            languages: ['javascript', 'typescript']
        })
    ]
};
```

## 🐛 トラブルシューティング

### Monaco Editor が表示されない
1. After Effects を完全に再起動
2. デベロッパーツールでコンソールエラーを確認
3. `lib/vs/` フォルダにファイルがあるか確認
   ```bash
   ls -la lib/vs/
   # loader.js, editor/, language/ などがあるはず
   ```

### Worker エラーが出る
```
Failed to construct 'Worker'...
```
→ `MonacoEnvironment.getWorkerUrl` の設定を確認
→ CSP で `worker-src blob:` が許可されているか確認

### 補完が出ない
1. `Ctrl+Space` を押してみる
2. 2文字以上タイプしてみる
3. コンソールで Worker のエラーを確認

### シンタックスハイライトが効かない
1. エディタの言語が `ae-expression` になっているか確認
2. `monaco.languages.setMonarchTokensProvider` が実行されているか確認
3. コンソールで "✅ Monaco Editor loaded" が表示されているか確認

### エクスプレッションが適用されない
1. レイヤーが選択されているか確認
2. プロパティが選択されているか確認
3. デベロッパーツールのコンソールで JSX のエラーを確認
   ```javascript
   // After Effects の ExtendScript Toolkit または
   // CEP デベロッパーツールのコンソールで確認
   ```

## 📚 参考リンク

- [Monaco Editor 公式ドキュメント](https://microsoft.github.io/monaco-editor/)
- [After Effects Scripting Guide](https://ae-scripting.docsforadobe.dev/)
- [CEP Cookbook](https://github.com/Adobe-CEP/CEP-Resources)

## ✨ 完了チェックリスト

- [x] Monaco Editor をローカルに配置
- [x] CDN 参照を削除
- [x] Worker の設定を修正
- [x] CSP を最適化
- [x] JSX と JavaScript の API を統一
- [x] シンタックスハイライトの設定
- [x] オートコンプリートの設定
- [ ] プロジェクト依存の補完（今後）
- [ ] リアルタイムエラー表示（今後）
- [ ] webpack 化（今後）

---

**更新日**: 2025-10-13  
**Monaco Editor バージョン**: 0.45.0  
**対象**: After Effects 2020以降（CEP 11+）

🎉 **これで CEP 環境でも Monaco Editor が動くようになりました！**

