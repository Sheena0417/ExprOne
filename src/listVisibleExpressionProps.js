export function listVisibleExpressionProps(selectedLayer) {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem) || comp.selectedLayers.length !== 1) {
        alert("1つのレイヤーを選択してください。");
        return;
    }

    var layer = comp.selectedLayers[0];
    var result = [];

    function scanGroup(group, path) {
        for (var i = 1; i <= group.numProperties; i++) {
            var prop = group.property(i);
            var fullPath = path + " → " + prop.name;

            // グループなら再帰的にチェック
            if (prop.numProperties > 0 && !(prop instanceof Property)) {
                scanGroup(prop, fullPath);
            } else {
                // 表示中でエクスプレッションが設定可能なプロパティだけリストアップ
                try {
                    if (prop.canSetExpression && prop.enabled !== false) {
                        result.push(fullPath);
                    }
                } catch (e) {
                    // 一部プロパティでenabledにアクセスできない場合がある
                }
            }
        }
    }

    // 通常プロパティ（Transform, Text, etc.）
    scanGroup(layer, layer.name);

    return result;

};
