import { listVisibleExpressionProps } from "./listVisibleExpressionProps.js";

export function listCommonExpressionProps(layers) {
    if (!layers || layers.length === 0) return [];

    // 各レイヤーの { name, ref }[] を取得
    var allPropsPerLayer = [];
    for (var i = 0; i < layers.length; i++) {
        allPropsPerLayer.push(listVisibleExpressionProps(layers[i]));
    }

    // 各レイヤーごとに name の一覧に変換
    var nameLists = allPropsPerLayer.map(function (propList) {
        return propList.map(function (p) { return p.name; });
    });

    // 共通部分の name を抽出（交差集合）
    var commonNames = nameLists[0];
    for (var j = 1; j < nameLists.length; j++) {
        commonNames = commonNames.filter(function (name) {
            return nameLists[j].indexOf(name) !== -1;
        });
    }

    // 最初のレイヤーから一致する { name, ref } を抽出して返す
    var firstLayerProps = allPropsPerLayer[0];
    var result = [];

    for (var k = 0; k < firstLayerProps.length; k++) {
        var prop = firstLayerProps[k];
        if (commonNames.indexOf(prop.name) !== -1) {
            result.push(prop);
        }
    }

    return result;
}
