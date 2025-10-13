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

    // --- Text ---
    var textGroup = selectedLayer.property("ADBE Text Properties");
    if (textGroup) {
        scanGroup(textGroup, "Text", false);
    }

    // --- Contents ---
    var contentsGroup = selectedLayer.property("ADBE Root Vectors Group");
    if (contentsGroup) {
        scanGroup(contentsGroup, "Contents", false);
    }

    // --- Effects ---
    var effects = selectedLayer.property("ADBE Effect Parade");
    if (effects) {
        for (var i = 1; i <= effects.numProperties; i++) {
            var effect = effects.property(i);
            if (!effect) continue;

            var baseLabel = "Effects → " + effect.name;

            for (var j = 1; j <= effect.numProperties; j++) {
                var subProp = effect.property(j);
                if (subProp && subProp.canSetExpression) {
                    result.push({
                        name: baseLabel + " → " + subProp.name,
                        ref: subProp
                    });
                }
            }
        }
    }

    // --- Transform ---
    var transformGroup = selectedLayer.property("ADBE Transform Group");
    if (transformGroup) {
        scanGroup(transformGroup, "Transform", false);
    }

    // --- Light Options ---
    var lightOptions = selectedLayer.property("ADBE Light Options Group");
    if (lightOptions) {
        scanGroup(lightOptions, "Light Options", false);
    }

    // --- Camera Options ---
    var cameraOptions = selectedLayer.property("ADBE Camera Options Group");
    if (cameraOptions) {
        scanGroup(cameraOptions, "Camera Options", false);
    }

    // --- Geometry / Material Options ---
    var geoMatchNames = [
        "ADBE Geometry Options Group",
        "ADBE Plane Options Group",
        "ADBE Extrsn Options Group"
    ];

    if (selectedLayer.threeDLayer) {
        for (var i = 0; i < geoMatchNames.length; i++) {
            var group = selectedLayer.property(geoMatchNames[i]);
            if (group) {
                scanGroup(group, "Geometry Options", false);
                break;
            }
        }

        var materialGroup = selectedLayer.property("ADBE Material Options Group");
        if (materialGroup) {
            scanGroup(materialGroup, "Material Options", false);
        }
    }

    // --- Layer Styles ---
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
