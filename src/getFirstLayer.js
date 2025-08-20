export function getFirstLayer(){
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem) || comp.selectedLayers.length !== 1) {
        alert("1つのレイヤーを選択してください。");
        return;
    }

    var layer = comp.selectedLayers[0];
    return layer;
}