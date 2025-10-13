export function getSelectedLayers() {
    var comp = app.project.activeItem;

    if (!(comp instanceof CompItem)) {
        alert("コンポジションをアクティブにしてください。");
        return [];
    }

    if (comp.selectedLayers.length === 0) {
        alert("1つ以上のレイヤーを選択してください。");
        return [];
    }

    return comp.selectedLayers;
}
