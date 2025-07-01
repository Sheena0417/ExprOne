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
                        result.push({ name: fullPath, ref: prop });
                    }
                } catch (e) {}
            }
        }
    }

    var groups = [
        { name: "ADBE Text Properties", label: "Text" },
        { name: "ADBE Root Vectors Group", label: "Contents" },
        { name: "ADBE Transform Group", label: "Transform" }
    ];

    var geoMatchNames = [
        "ADBE Geometry Options Group",
        "ADBE Plane Options Group",
        "ADBE Extrsn Options Group"
    ];
    var materialMatch = "ADBE Material Options Group";

    for (var i = 0; i < groups.length; i++) {
        var info = groups[i];
        var group = selectedLayer.property(info.name);
        if (group) {
            scanGroup(group, info.label, false);
        }
    }

    if (selectedLayer.threeDLayer) {
        for (var j = 0; j < geoMatchNames.length; j++) {
            var g = selectedLayer.property(geoMatchNames[j]);
            if (g) {
                scanGroup(g, "Geometry Options", false);
                break;
            }
        }

        var mat = selectedLayer.property(materialMatch);
        if (mat) {
            scanGroup(mat, "Material Options", false);
        }
    }

    var layerStyles = selectedLayer.property("ADBE Layer Styles");
    if (layerStyles) {
        for (var k = 1; k <= layerStyles.numProperties; k++) {
            var styleGroup = layerStyles.property(k);
            if (styleGroup && styleGroup.numProperties > 0 && styleGroup.enabled && styleGroup.active) {
                scanGroup(styleGroup, "Layer Styles → " + styleGroup.name, true);
            }
        }
    }

    return result;
}
