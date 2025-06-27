export function main(){
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem) || comp.selectedLayers.length !== 1) {
        alert("レイヤーを選択してください。");
        return;
    }

    var layer = comp.selectedLayers[0];
    var styles = layer.property("ADBE Layer Styles");
    if (!styles) {
        alert("Layer Styles が見つかりません");
        return;
    }

    var result = [];

    for (var i = 1; i <= styles.numProperties; i++) {
        var group = styles.property(i);

        // 表示中（enabled & active）かつエクスプレッション設定可能なプロパティのみ抽出
        if (group.enabled && group.active) {
            for (var j = 1; j <= group.numProperties; j++) {
                var prop = group.property(j);
                if (prop.canSetExpression) {
                    result.push(group.name + " → " + prop.name);
                }
            }
        }
    }

    if (result.length > 0) {
        alert("表示中かつエクスプレッション可能なレイヤースタイル:\n\n" + result.join("\n"));
    } else {
        alert("該当するレイヤースタイルのプロパティはありません。");
    }

}