# 🚀 クイックスタート

## 今すぐ試す（3ステップ）

### 1️⃣ After Effects を再起動
```bash
# After Effects を完全に終了して再起動
# macOS の場合はターミナルで:
killall "After Effects"
open -a "Adobe After Effects 2024"
```

### 2️⃣ 拡張機能を開く
1. After Effects で `Window` → `Extensions` → `Expression Control (Monaco)`
2. パネルが開く

### 3️⃣ 動作確認
1. **コンポジションを作成**（Cmd+N / Ctrl+N）
2. **平面レイヤーを作成**（Cmd+Y / Ctrl+Y）
3. **レイヤーを選択**
4. **パネルの「This Layer(s)」ボタンをクリック**
5. **「Transform → Position」を選択**
6. **Monaco Editor に以下を入力**:
   ```javascript
   wiggle(2, 50)
   ```
7. **「Apply Expression」ボタンをクリック**
8. **✅ レイヤーが揺れる！**

---

## ✨ Monaco Editor の機能を試す

### シンタックスハイライト
エディタに以下を入力してみてください：

```javascript
// コメント（グレー）
thisComp  // AE キーワード（水色）
wiggle(2, 50)  // AE 関数（緑）、数値（薄緑）
```

### オートコンプリート
1. エディタをクリア
2. `wig` と入力
3. **補完候補が自動表示される** ✨
4. `Tab` または `Enter` で補完
5. `wiggle(${1:freq}, ${2:amp})` が挿入される

### その他のキーワード
試してみてください：
- `thisComp` → 水色
- `thisLayer` → 水色
- `time` → 水色
- `value` → 水色
- `ease` → 緑色
- `linear` → 緑色

---

## 🎯 実践例

### 例 1: シンプルな揺れ
```javascript
wiggle(3, 20)
```

### 例 2: 時間に応じた変化
```javascript
value + [Math.sin(time * 2) * 100, 0]
```

### 例 3: 条件分岐
```javascript
if (time < 2) {
  value
} else {
  wiggle(5, 50)
}
```

### 例 4: 他のレイヤーを参照
```javascript
thisComp.layer("レイヤー 1").transform.position
```

### 例 5: 不透明度の変化
```javascript
50 + 50 * Math.sin(time * 2)
```

---

## 🐛 問題が起きたら

### Monaco Editor が表示されない
1. After Effects を完全に再起動
2. パネル上で右クリック → デバッグ → デベロッパーツール
3. コンソールで以下を確認：
   - `✅ Monaco Editor loaded` が表示されるか
   - エラーがないか

### Worker エラー
```
Failed to construct 'Worker'...
```
→ `lib/vs/` フォルダにファイルがあるか確認：
```bash
ls -la lib/vs/loader.js
```

### エクスプレッションが適用されない
1. レイヤーが選択されているか確認
2. プロパティが選択されているか確認
3. コンソールでエラーを確認

---

## 📚 次のステップ

✅ 基本機能を試したら：
- [`TEST_CHECKLIST.md`](./TEST_CHECKLIST.md) - 全機能のテスト
- [`SETUP_GUIDE.md`](./SETUP_GUIDE.md) - 詳細な設定とカスタマイズ
- [`README.md`](./README.md) - プロジェクト全体のドキュメント

✨ 今後の拡張：
- プロジェクト内のコンポ/レイヤー名の補完
- AE へのリアルタイムエラー表示
- webpack によるバンドル最適化

---

**🎉 Monaco Editor が動いたら成功です！お疲れさまでした！**

