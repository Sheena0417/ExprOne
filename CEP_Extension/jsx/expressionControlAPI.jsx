// Expression Control API - ExtendScript側
// 前のjsxファイルと同じ形式で簡潔に実装

// デバッグ用: レイヤーの基本情報を取得
function debugLayerInfo(layerIndex) {
    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            return "ERROR:アクティブなコンポジションがありません";
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return "ERROR:レイヤーが見つかりません";
        }

        var info = "LAYER_INFO:";
        info += "Name=" + layer.name;
        info += "|Type=" + (layer instanceof TextLayer ? "Text" :
            layer instanceof ShapeLayer ? "Shape" :
                layer instanceof AVLayer ? "AV" : "Unknown");
        info += "|HasContents=" + (layer.property("ADBE Root Vectors Group") ? "Yes" : "No");
        info += "|HasText=" + (layer.property("ADBE Text Properties") ? "Yes" : "No");
        info += "|HasTransform=" + (layer.property("ADBE Transform Group") ? "Yes" : "No");

        // シェイプレイヤーの詳細分析
        if (layer instanceof ShapeLayer) {
            var contentsGroup = layer.property("ADBE Root Vectors Group");
            if (contentsGroup) {
                info += "|ContentsCount=" + contentsGroup.numProperties;
                // 最初のいくつかのContentsを確認
                for (var i = 1; i <= Math.min(3, contentsGroup.numProperties); i++) {
                    try {
                        var contentItem = contentsGroup.property(i);
                        if (contentItem) {
                            info += "|Content" + i + "=" + contentItem.name + "(" + contentItem.numProperties + ")";
                        }
                    } catch (e) { }
                }
            }
        }

        return info;

    } catch (e) {
        return "ERROR:" + e.toString();
    }
}

function getSelectedLayers() {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
        return "ERROR:コンポジションをアクティブにしてください。";
    }
    if (comp.selectedLayers.length === 0) {
        return "ERROR:1つ以上のレイヤーを選択してください。";
    }

    var result = "SUCCESS:" + comp.selectedLayers.length;
    for (var i = 0; i < comp.selectedLayers.length; i++) {
        var layer = comp.selectedLayers[i];
        result += "|" + layer.index + ":" + layer.name;
    }
    return result;
}

function listVisibleExpressionProps(layerIndex) {
    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            return "ERROR:アクティブなコンポジションがありません";
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return "ERROR:レイヤーが見つかりません";
        }

        var result = [];
        scanLayerProperties(layer, result);

        // デバッグ: 各セクションのプロパティ数を確認
        var debugInfo = "";
        debugInfo += "Transform=" + (layer.property("ADBE Transform Group") ? layer.property("ADBE Transform Group").numProperties : 0);
        debugInfo += ",Contents=" + (layer.property("ADBE Root Vectors Group") ? layer.property("ADBE Root Vectors Group").numProperties : 0);
        debugInfo += ",Text=" + (layer.property("ADBE Text Properties") ? layer.property("ADBE Text Properties").numProperties : 0);
        debugInfo += ",Effects=" + (layer.property("ADBE Effect Parade") ? layer.property("ADBE Effect Parade").numProperties : 0);

        var resultStr = "SUCCESS:" + result.length + "|DEBUG:" + debugInfo;
        for (var i = 0; i < result.length; i++) {
            var prop = result[i];
            var hasExpr = (prop.ref.expression && prop.ref.expression !== "") ? "1" : "0";
            // プロパティ名にコロンが含まれる場合のため、安全な区切り文字を使用
            resultStr += "|PROP:" + prop.name + "|EXPR:" + hasExpr;
        }
        return resultStr;

    } catch (e) {
        return "ERROR:" + e.toString();
    }
}

function scanLayerProperties(layer, result) {
    function scanGroup(group, path, isLayerStyles) {
        if (!group) return;

        for (var i = 1; i <= group.numProperties; i++) {
            try {
                var prop = group.property(i);
                if (!prop) continue;

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
                    if (prop.canSetExpression) {
                        result.push({ name: fullPath, ref: prop });
                    }
                }
            } catch (e) { }
        }
    }

    // Transform（必ず最初に）
    var transformGroup = layer.property("ADBE Transform Group");
    if (transformGroup) {
        scanGroup(transformGroup, "Transform", false);
    }

    // Text Properties
    var textGroup = layer.property("ADBE Text Properties");
    if (textGroup) {
        scanGroup(textGroup, "Text", false);
    }

    // Contents (Shape/Vector) - より詳細にスキャン
    var contentsGroup = layer.property("ADBE Root Vectors Group");
    if (contentsGroup) {
        scanGroup(contentsGroup, "Contents", false);
    }

    // Effects - 前回の成功した形式に合わせて修正
    var effects = layer.property("ADBE Effect Parade");
    if (effects) {
        for (var i = 1; i <= effects.numProperties; i++) {
            try {
                var effect = effects.property(i);
                if (!effect) continue;
                var baseLabel = "Effects → " + effect.name;

                // 前回と同じ方式：直接プロパティをスキャン
                for (var j = 1; j <= effect.numProperties; j++) {
                    try {
                        var subProp = effect.property(j);
                        if (subProp && subProp.canSetExpression) {
                            result.push({ name: baseLabel + " → " + subProp.name, ref: subProp });
                        }
                    } catch (e) { }
                }
            } catch (e) { }
        }
    }

    // Light Options
    var lightOptions = layer.property("ADBE Light Options Group");
    if (lightOptions) {
        scanGroup(lightOptions, "Light Options", false);
    }

    // Camera Options
    var cameraOptions = layer.property("ADBE Camera Options Group");
    if (cameraOptions) {
        scanGroup(cameraOptions, "Camera Options", false);
    }

    // Material Options (3D layers)
    if (layer.threeDLayer) {
        var materialGroup = layer.property("ADBE Material Options Group");
        if (materialGroup) {
            scanGroup(materialGroup, "Material Options", false);
        }
    }

    // Layer Styles
    var layerStyles = layer.property("ADBE Layer Styles");
    if (layerStyles) {
        for (var k = 1; k <= layerStyles.numProperties; k++) {
            try {
                var styleGroup = layerStyles.property(k);
                if (styleGroup && styleGroup.numProperties > 0 && styleGroup.enabled && styleGroup.active) {
                    scanGroup(styleGroup, "Layer Styles → " + styleGroup.name, true);
                }
            } catch (e) { }
        }
    }
}

// エクスプレッション適用
function applyExpressionToProperty(layerIndex, propertyPath, expression) {
    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            return "ERROR:アクティブなコンポジションがありません";
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return "ERROR:レイヤーが見つかりません";
        }

        // プロパティパスを解析してプロパティを特定
        var pathParts = propertyPath.split(" → ");
        var currentProp = layer;

        for (var i = 0; i < pathParts.length; i++) {
            currentProp = currentProp.property(pathParts[i]);
            if (!currentProp) {
                return "ERROR:プロパティ「" + pathParts[i] + "」が見つかりません";
            }
        }

        if (!currentProp.canSetExpression) {
            return "ERROR:このプロパティにはエクスプレッションを設定できません";
        }

        app.beginUndoGroup("Apply Expression");
        currentProp.expression = expression;
        app.endUndoGroup();

        return "SUCCESS:エクスプレッションを適用しました";

    } catch (e) {
        return "ERROR:" + e.toString();
    }
}

// 既存エクスプレッションの内容を取得
function getExpressionContent(layerIndex, propertyPath) {
    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            return "ERROR:アクティブなコンポジションがありません";
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return "ERROR:レイヤーが見つかりません";
        }

        // プロパティパスを解析してプロパティを特定
        var pathParts = propertyPath.split(" → ");
        var currentProp = layer;

        for (var i = 0; i < pathParts.length; i++) {
            currentProp = currentProp.property(pathParts[i]);
            if (!currentProp) {
                return "ERROR:プロパティが見つかりません";
            }
        }

        var expression = currentProp.expression || "";
        return "SUCCESS:" + expression;

    } catch (e) {
        return "ERROR:" + e.toString();
    }
}