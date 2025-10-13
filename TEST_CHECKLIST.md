# 🧪 動作確認チェックリスト

## ファイル配置の確認

### ✅ 必須ファイル
```bash
# ターミナルで確認
cd /Users/sheena/workspace/debelopment/Ae/Expression_Control

# Monaco Editor のファイル
ls -la lib/vs/loader.js
ls -la lib/vs/editor/
ls -la lib/vs/language/

# CEP 拡張機能のファイル
ls -la csxs/manifest.xml
ls -la index.html
ls -la js/main.js
ls -la jsx/expressionControl.jsx
```

すべてのファイルが存在すれば OK ✅

## After Effects での動作確認

### 1️⃣ 準備
- [ ] After Effects を完全に終了
- [ ] After Effects を再起動

### 2️⃣ 拡張機能を開く
- [ ] `Window` → `Extensions` → `Expression Control (Monaco)` を開く
- [ ] パネルが表示される

### 3️⃣ Monaco Editor の動作確認
- [ ] パネル内にテキストエディタが表示される
- [ ] 赤い警告バナー「🔴 NEW MONACO EDITOR VERSION 🔴」が表示される
- [ ] エディタに `// After Effects Expression` と `value` が表示される

### 4️⃣ 基本機能のテスト

#### テスト A: レイヤー情報の取得
1. [ ] 新しいコンポジションを作成（Cmd+N / Ctrl+N）
2. [ ] 平面レイヤーを作成（Cmd+Y / Ctrl+Y）
3. [ ] レイヤーを選択
4. [ ] パネルの「This Layer(s)」ボタンをクリック
5. [ ] レイヤー情報が表示される（例：`✅ レイヤー: 平面 1`）

#### テスト B: プロパティの表示
1. [ ] 「Set Expressions:」ドロップダウンにプロパティが表示される
   - Transform → Anchor Point
   - Transform → Position
   - Transform → Scale
   - Transform → Rotation
   - Transform → Opacity
   - など

#### テスト C: Monaco Editor の機能

##### シンタックスハイライト
1. [ ] エディタに以下を入力：
   ```javascript
   // コメント
   wiggle(2, 50)
   ```
2. [ ] `//` がグレーで表示される（コメント）
3. [ ] `wiggle` が緑色で表示される（AE 関数）
4. [ ] `2`, `50` が薄緑で表示される（数値）

##### オートコンプリート
1. [ ] エディタをクリア
2. [ ] `wig` と入力
3. [ ] 補完候補が表示される（`wiggle` など）
4. [ ] `Tab` または `Enter` で補完される
5. [ ] `wiggle(${1:freq}, ${2:amp})` のようなスニペットが挿入される

##### その他のキーワード
1. [ ] `thisComp` と入力 → 水色で表示
2. [ ] `thisLayer` と入力 → 水色で表示
3. [ ] `time` と入力 → 水色で表示
4. [ ] `value` と入力 → 水色で表示

#### テスト D: エクスプレッションの適用
1. [ ] プロパティリストから「Transform → Position」を選択
2. [ ] Monaco Editor に以下を入力：
   ```javascript
   wiggle(2, 50)
   ```
3. [ ] 「Apply Expression」ボタンをクリック
4. [ ] 成功メッセージが表示される（`✅ 1個のレイヤーに適用しました`）
5. [ ] After Effects のタイムラインで Position プロパティに赤い下線が表示される（エクスプレッション適用済み）
6. [ ] プレビューで揺れが確認できる

#### テスト E: 既存エクスプレッションの読み込み
1. [ ] プロパティリストから「Transform → Position」を選択（既にエクスプレッションが適用されている）
2. [ ] Monaco Editor に `wiggle(2, 50)` が自動的に読み込まれる
3. [ ] エクスプレッションを編集（例：`wiggle(5, 100)`）
4. [ ] 「Apply Expression」ボタンをクリック
5. [ ] 揺れの速度/振幅が変化する

#### テスト F: 複数レイヤーへの適用
1. [ ] コンポジションに複数のレイヤーを作成（3つ以上）
2. [ ] すべてのレイヤーを選択（Cmd+A / Ctrl+A）
3. [ ] 「This Layer(s)」ボタンをクリック
4. [ ] 「✅ 選択レイヤー: 3個」のように表示される
5. [ ] 共通プロパティが表示される
6. [ ] 「Transform → Opacity」を選択
7. [ ] Monaco Editor に以下を入力：
   ```javascript
   50 + 50 * Math.sin(time * 2)
   ```
8. [ ] 「Apply Expression」ボタンをクリック
9. [ ] `✅ 3個のレイヤーに適用しました` と表示される
10. [ ] すべてのレイヤーの不透明度が同期して変化する

## 🐛 デバッグ（エラーが出た場合）

### デベロッパーツールを開く
1. パネル上で **右クリック**
2. "デバッグ" → "デベロッパーツール" を選択
3. コンソールタブを開く

### 確認すべきログ
```
✅ 正常な場合のログ:
🚀 Initializing Expression Control...
Loading ExtendScript from: /Users/.../jsx/expressionControl.jsx
ExtendScript loaded ✓
✅ Monaco Editor loaded
✅ Monaco Editor initialized
Monaco Editor ready ✓

❌ エラーの例:
Failed to construct 'Worker'...
→ Worker の設定に問題

Failed to load resource: file://...
→ ファイルパスに問題

Uncaught ReferenceError: monaco is not defined
→ Monaco Editor の読み込みに失敗
```

### よくあるエラーと対処法

#### 1. Worker エラー
```
Failed to construct 'Worker': Script at 'file:///.../ts.worker.js' cannot be accessed.
```
**対処法**:
- `js/main.js` の `MonacoEnvironment.getWorkerUrl` を確認
- CSP 設定を確認（`worker-src blob:` が許可されているか）

#### 2. Monaco Editor が表示されない
```
Uncaught ReferenceError: require is not defined
```
**対処法**:
- `index.html` で `loader.js` が正しく読み込まれているか確認
- パスが正しいか確認（`./lib/vs/loader.js`）

#### 3. ExtendScript エラー
```
Error: Cannot find function getSelectedLayers
```
**対処法**:
- `jsx/expressionControl.jsx` が正しく読み込まれているか確認
- After Effects を再起動

#### 4. プロパティが表示されない
```
ERROR:コンポジションをアクティブにしてください。
```
**対処法**:
- コンポジションを開いて、タブがアクティブになっているか確認
- レイヤーを選択

## 📊 チェックリスト結果

### 必須機能（すべて ✅ であれば OK）
- [ ] Monaco Editor が表示される
- [ ] シンタックスハイライトが動く
- [ ] オートコンプリートが動く
- [ ] レイヤー情報が取得できる
- [ ] プロパティが表示される
- [ ] エクスプレッションが適用できる

### 推奨機能（あると良い）
- [ ] 既存エクスプレッションの読み込み
- [ ] 複数レイヤーへの適用
- [ ] エラーメッセージの表示

## 🎉 全部 OK なら成功！

おめでとうございます！Monaco Editor が CEP 環境で正常に動作しています。

次のステップ：
1. `SETUP_GUIDE.md` で今後の拡張について確認
2. プロジェクト依存の補完機能を実装
3. リアルタイムエラー表示を実装

---

**問題が解決しない場合**:
- `SETUP_GUIDE.md` のトラブルシューティングを確認
- デベロッパーツールのコンソールのエラーメッセージを確認
- 必要に応じて After Effects を再起動

