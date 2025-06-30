export function listVisibleExpressionProps(selectedLayer) {

    var result = [];

    function scanGroup(group, path, isLayerStyles) {
        if (!group) return;

        for (var i = 1; i <= group.numProperties; i++) {
            var prop = group.property(i);
            var fullPath = path + " → " + prop.name;

            if (prop.numProperties > 0 && !(prop instanceof Property)) {
                if (isLayerStyles) {
                    if (prop.enabled && prop.active) {
                        scanGroup(prop, fullPath, false);
                    }
                } else {
                    scanGroup(prop, fullPath, false);
                }
            } else {
                try {
                    if (prop.canSetExpression) {
                        result.push(fullPath);
                    }
                } catch (e) {}
            }
        }
    }

    // グループの定義（表示順を保証）
    var groups = [
        { name: "ADBE Text Properties", label: "Text", cond: true },
        { name: "ADBE Root Vectors Group", label: "Contents", cond: true },
        { name: "ADBE Transform Group", label: "Transform", cond: true }
    ];

    // ジオメトリオプション（3Dレイヤーのみ）
    var geoMatchNames = [
        "ADBE Geometry Options Group", // 通常の3Dレイヤー
        "ADBE Plane Options Group",    // 平面レイヤー
        "ADBE Extrsn Options Group"    // 押し出し3D用（テキストなど）
    ];

    var materialMatch = "ADBE Material Options Group";

    // 各グループをスキャン（順番維持）
    for (var i = 0; i < groups.length; i++) {
        var info = groups[i];
        var group = layer.property(info.name);
        if (group) {
            scanGroup(group, info.label, false);
        }
    }

    // 3Dの場合だけ追加
    if (layer.threeDLayer) {
        var foundGeometry = false;
        for (var j = 0; j < geoMatchNames.length; j++) {
            var g = layer.property(geoMatchNames[j]);
            if (g) {
                scanGroup(g, "Geometry Options", false);
                foundGeometry = true;
                break;
            }
        }

        var mat = layer.property(materialMatch);
        if (mat) {
            scanGroup(mat, "Material Options", false);
        }
    }

    // レイヤースタイル（有効なものだけ）
    var layerStyles = layer.property("ADBE Layer Styles");
    if (layerStyles) {
        for (var k = 1; k <= layerStyles.numProperties; k++) {
            var styleGroup = layerStyles.property(k);
            if (styleGroup && styleGroup.numProperties > 0 && styleGroup.enabled && styleGroup.active) {
                scanGroup(styleGroup, "Layer Styles → " + styleGroup.name, true);
            }
        }
    }

    if (result.length > 0) {
        alert("Expression-enabled properties:\n\n" + result.join("\n"));
    } else {
        alert("No expression-enabled properties found.");
    }
};
