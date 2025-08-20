
function getSelectedLayers() {
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

function listVisibleExpressionProps(selectedLayer) {
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

    var textGroup = selectedLayer.property("ADBE Text Properties");
    if (textGroup) scanGroup(textGroup, "Text", false);

    var contentsGroup = selectedLayer.property("ADBE Root Vectors Group");
    if (contentsGroup) scanGroup(contentsGroup, "Contents", false);

    var effects = selectedLayer.property("ADBE Effect Parade");
    if (effects) {
        for (var i = 1; i <= effects.numProperties; i++) {
            var effect = effects.property(i);
            if (!effect) continue;
            var baseLabel = "Effects → " + effect.name;
            for (var j = 1; j <= effect.numProperties; j++) {
                var subProp = effect.property(j);
                if (subProp && subProp.canSetExpression) {
                    result.push({ name: baseLabel + " → " + subProp.name, ref: subProp });
                }
            }
        }
    }

    var transformGroup = selectedLayer.property("ADBE Transform Group");
    if (transformGroup) scanGroup(transformGroup, "Transform", false);

    var lightOptions = selectedLayer.property("ADBE Light Options Group");
    if (lightOptions) scanGroup(lightOptions, "Light Options", false);

    var cameraOptions = selectedLayer.property("ADBE Camera Options Group");
    if (cameraOptions) scanGroup(cameraOptions, "Camera Options", false);

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
        if (materialGroup) scanGroup(materialGroup, "Material Options", false);
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

function listCommonExpressionProps(layers) {
    if (!layers || layers.length === 0) return [];
    var allPropsPerLayer = [];
    for (var i = 0; i < layers.length; i++) {
        allPropsPerLayer.push(listVisibleExpressionProps(layers[i]));
    }

    var nameLists = allPropsPerLayer.map(function (propList) {
        return propList.map(function (p) { return p.name; });
    });

    var commonNames = nameLists[0];
    for (var j = 1; j < nameLists.length; j++) {
        commonNames = commonNames.filter(function (name) {
            return nameLists[j].indexOf(name) !== -1;
        });
    }

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

function listExistingExpressions(propList) {
    var result = [];
    for (var i = 0; i < propList.length; i++) {
        var prop = propList[i];
        try {
            if (prop.ref && prop.ref.expression && prop.ref.expression !== "") {
                result.push(prop);
            }
        } catch (e) {}
    }
    return result;
}

function buildUI(thisObj) {
    var win = (thisObj instanceof Panel)
        ? thisObj
        : new Window("palette", "Expression Panel", undefined, { resizeable: true });

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 10;
    win.margins = 10;

    var topGroup = win.add("group");
    var scanBtn = topGroup.add("button", undefined, "This Layer(s)");
    var propDropdown = topGroup.add("dropdownlist", undefined, []);
    propDropdown.preferredSize.width = 300;

    var exprListGroup = win.add("group");
    exprListGroup.orientation = "row";
    exprListGroup.alignChildren = ["left", "center"];
    exprListGroup.add("statictext", undefined, "Set Expressions:");
    var exprDropdown = exprListGroup.add("dropdownlist", undefined, []);
    exprDropdown.preferredSize.width = 300;

    var exprInput = win.add("edittext", undefined, "", {
        multiline: true,
        scrolling: true
    });
    exprInput.alignment = ["fill", "fill"];
    exprInput.minimumSize = [300, 100];

    var applyGroup = win.add("group");
    applyGroup.alignment = ["fill", "top"];
    applyGroup.maximumSize.height = 30;

    var applyBtn = applyGroup.add("button", undefined, "Apply Expression");
    applyBtn.alignment = ["fill", "top"];

    var currentProp = null;
    var selectedLayers = [];

    function syncDropdowns(changedDropdown) {
        var selected = changedDropdown.selection;
        if (!selected || !selected.prop) {
            exprInput.text = "";
            currentProp = null;
            return;
        }

        currentProp = selected.prop;

        try {
            exprInput.text = currentProp.expression || "";
        } catch (e) {
            exprInput.text = "// エラー: " + e.toString();
        }

        var otherDropdown = (changedDropdown === propDropdown) ? exprDropdown : propDropdown;
        var matched = false;
        for (var i = 0; i < otherDropdown.items.length; i++) {
            if (otherDropdown.items[i].prop === currentProp) {
                otherDropdown.selection = i;
                matched = true;
                break;
            }
        }

        if (!matched && changedDropdown === propDropdown) {
            exprDropdown.selection = 0;
        }
    }

    scanBtn.onClick = function () {
        selectedLayers = getSelectedLayers();
        if (selectedLayers.length === 0) return;

        var all = (selectedLayers.length === 1)
            ? listVisibleExpressionProps(selectedLayers[0])
            : listCommonExpressionProps(selectedLayers);

        var existing = listExistingExpressions(all);

        propDropdown.removeAll();
        exprDropdown.removeAll();

        for (var i = 0; i < all.length; i++) {
            var item = propDropdown.add("item", all[i].name);
            item.prop = all[i].ref;
        }

        exprDropdown.add("item", "-----").prop = null;
        for (var j = 0; j < existing.length; j++) {
            var item = exprDropdown.add("item", existing[j].name);
            item.prop = existing[j].ref;
        }

        if (propDropdown.items.length > 0) {
            propDropdown.selection = 0;
            syncDropdowns(propDropdown);
        } else {
            exprInput.text = "";
            currentProp = null;
        }
    };

    propDropdown.onChange = function () {
        syncDropdowns(propDropdown);
    };

    exprDropdown.onChange = function () {
        var sel = exprDropdown.selection;
        if (!sel || !sel.prop) return;
        syncDropdowns(exprDropdown);
    };

    applyBtn.onClick = function () {
        if (!currentProp || !currentProp.canSetExpression) {
            alert("プロパティが選択されていないか、エクスプレッションを設定できません。");
            return;
        }

        if (selectedLayers.length === 0) {
            alert("適用先のレイヤーが不明です。先に This Layer(s) ボタンを押してください。");
            return;
        }

        app.beginUndoGroup("Apply Expression to Layers");

        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            var targetProp = findMatchingPropInLayer(layer, currentProp);
            if (targetProp && targetProp.canSetExpression) {
                try {
                    targetProp.expression = exprInput.text;
                } catch (e) {
                    alert("エラー: " + e.toString());
                }
            }
        }

        app.endUndoGroup();
    };

    function findMatchingPropInLayer(layer, sourceProp) {
        var path = [];
        var p = sourceProp;
        while (p && p.parentProperty && !(p.parentProperty instanceof AVLayer)) {
            path.unshift(p.name);
            p = p.parentProperty;
        }

        var target = layer;
        for (var i = 0; i < path.length; i++) {
            target = target.property(path[i]);
            if (!target) return null;
        }

        return target;
    }

    win.layout.layout(true);
    win.onResizing = win.onResize = function () {
        this.layout.resize();
    };

    return win;
}

// AEが読み込んだときにUIを構築させる（return不要）
buildUI(this);
