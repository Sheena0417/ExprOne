/**
 * Expression Control ExtendScript
 * CEP Extension用のAfter Effects Expression制御スクリプト
 */

// グローバル変数（レイヤーとプロパティのキャッシュ）
var cachedLayers = [];
var cachedProps = [];

// ユーティリティ: エラーログ
function logError(msg, error) {
    if (error) {
        $.writeln("Error: " + msg + " - " + error.toString());
    } else {
        $.writeln("Error: " + msg);
    }
}

// 選択レイヤー取得（文字列形式で返す）
function getSelectedLayers() {
    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            return "ERROR:Please activate a composition.";
        }
        if (comp.selectedLayers.length === 0) {
            return "ERROR:Please select one or more layers.";
        }

        // グローバルキャッシュに保存
        cachedLayers = [];
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            cachedLayers.push(comp.selectedLayers[i]);
        }

        var result = "SUCCESS:" + comp.selectedLayers.length;
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            var layer = comp.selectedLayers[i];
            result += "|" + layer.index + ":" + layer.name;
        }

        return result;
    } catch (e) {
        logError("レイヤー選択の取得", e);
        return "ERROR:" + e.toString();
    }
}

// プロパティスキャン（動作する JSX をベースに）
function listVisibleExpressionProps(layerIndex) {
    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            return "ERROR:No active composition.";
        }

        var selectedLayer = comp.layer(layerIndex);
        if (!selectedLayer) {
            return "ERROR:Layer not found.";
        }

        var result = [];
        cachedProps = []; // グローバルキャッシュをクリア

        // グループをスキャンする再帰関数
        function scanGroup(group, path, isLayerStyles) {
            if (!group) return;

            for (var i = 1; i <= group.numProperties; i++) {
                try {
                    var prop = group.property(i);
                    if (!prop) continue;

                    var fullPath = path + " → " + prop.name;

                    if (prop.numProperties > 0 && !(prop instanceof Property)) {
                        // グループプロパティ
                        if (isLayerStyles) {
                            if (prop.enabled && prop.active) {
                                scanGroup(prop, fullPath, false);
                            }
                        } else {
                            scanGroup(prop, fullPath, false);
                        }
                    } else {
                        // 個別プロパティ
                        if (prop.canSetExpression) {
                            var hasExpr = (prop.expression && prop.expression !== "");
                            result.push({
                                name: fullPath,
                                hasExpression: hasExpr
                            });
                            // プロパティの参照をキャッシュに保存（インデックスで参照）
                            cachedProps.push(prop);
                        }
                    }
                } catch (e) {
                    // プロパティアクセスエラーは無視
                }
            }
        }

        // Text プロパティ
        var textGroup = selectedLayer.property("ADBE Text Properties");
        if (textGroup) scanGroup(textGroup, "Text", false);

        // Contents プロパティ
        var contentsGroup = selectedLayer.property("ADBE Root Vectors Group");
        if (contentsGroup) scanGroup(contentsGroup, "Contents", false);

        // Effects（エフェクト）
        var effects = selectedLayer.property("ADBE Effect Parade");
        if (effects) {
            for (var i = 1; i <= effects.numProperties; i++) {
                try {
                    var effect = effects.property(i);
                    if (!effect) continue;
                    var baseLabel = "Effects → " + effect.name;
                    for (var j = 1; j <= effect.numProperties; j++) {
                        try {
                            var subProp = effect.property(j);
                            if (subProp && subProp.canSetExpression) {
                                var hasExpr = (subProp.expression && subProp.expression !== "");
                                result.push({
                                    name: baseLabel + " → " + subProp.name,
                                    hasExpression: hasExpr
                                });
                                cachedProps.push(subProp);
                            }
                        } catch (e) { }
                    }
                } catch (e) { }
            }
        }

        // Transform プロパティ
        var transformGroup = selectedLayer.property("ADBE Transform Group");
        if (transformGroup) scanGroup(transformGroup, "Transform", false);

        // Light Options
        var lightOptions = selectedLayer.property("ADBE Light Options Group");
        if (lightOptions) scanGroup(lightOptions, "Light Options", false);

        // Camera Options
        var cameraOptions = selectedLayer.property("ADBE Camera Options Group");
        if (cameraOptions) scanGroup(cameraOptions, "Camera Options", false);

        // Geometry Options（3Dレイヤー）
        if (selectedLayer.threeDLayer) {
            var geoMatchNames = [
                "ADBE Geometry Options Group",
                "ADBE Plane Options Group",
                "ADBE Extrsn Options Group"
            ];
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

        // Layer Styles
        var layerStyles = selectedLayer.property("ADBE Layer Styles");
        if (layerStyles) {
            for (var k = 1; k <= layerStyles.numProperties; k++) {
                try {
                    var styleGroup = layerStyles.property(k);
                    if (styleGroup && styleGroup.numProperties > 0 &&
                        styleGroup.enabled && styleGroup.active) {
                        scanGroup(styleGroup, "Layer Styles → " + styleGroup.name, true);
                    }
                } catch (e) { }
            }
        }

        // 文字列形式で返す（main.js との互換性）
        var output = "SUCCESS:";
        for (var m = 0; m < result.length; m++) {
            output += "|PROP:" + result[m].name;
            output += "|EXPR:" + (result[m].hasExpression ? "1" : "0");
        }

        return output;

    } catch (e) {
        logError("プロパティスキャン", e);
        return "ERROR:" + e.toString();
    }
}

// 共通プロパティ取得（複数レイヤー）
function listCommonExpressionProps(layerIndices) {
    try {
        if (!layerIndices || layerIndices.length === 0) {
            return "ERROR:No layers specified.";
        }

        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            return "ERROR:No active composition.";
        }

        var allPropsPerLayer = [];

        // 各レイヤーのプロパティ名を取得
        for (var i = 0; i < layerIndices.length; i++) {
            var propResult = listVisibleExpressionProps(layerIndices[i]);
            if (propResult.indexOf("ERROR:") === 0) {
                return propResult;
            }

            // SUCCESS: 以降をパース
            var parts = propResult.split("|");
            var propNames = [];
            for (var j = 1; j < parts.length; j += 2) {
                if (parts[j].indexOf("PROP:") === 0) {
                    propNames.push(parts[j].substring(5));
                }
            }
            allPropsPerLayer.push(propNames);
        }

        // 共通プロパティを抽出
        var commonNames = allPropsPerLayer[0];
        for (var k = 1; k < allPropsPerLayer.length; k++) {
            var newCommon = [];
            for (var l = 0; l < commonNames.length; l++) {
                if (allPropsPerLayer[k].indexOf(commonNames[l]) !== -1) {
                    newCommon.push(commonNames[l]);
                }
            }
            commonNames = newCommon;
        }

        // 文字列形式で返す
        var output = "SUCCESS:";
        for (var m = 0; m < commonNames.length; m++) {
            output += "|PROP:" + commonNames[m];
            output += "|EXPR:0"; // 共通プロパティの場合、エクスプレッション状態は不明
        }

        return output;

    } catch (e) {
        logError("共通プロパティの取得", e);
        return "ERROR:" + e.toString();
    }
}

// エクスプレッションの内容を取得
function getExpressionContent(layerIndex, propertyName) {
    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            return "ERROR:No active composition.";
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return "ERROR:Layer not found.";
        }

        // キャッシュされたプロパティから検索
        for (var i = 0; i < cachedProps.length; i++) {
            try {
                var prop = cachedProps[i];
                if (getPropertyFullPath(prop) === propertyName) {
                    if (prop.expression && prop.expression !== "") {
                        return "SUCCESS:" + prop.expression;
                    } else {
                        return "SUCCESS:";
                    }
                }
            } catch (e) { }
        }

        return "ERROR:Property not found.";

    } catch (e) {
        logError("エクスプレッション内容の取得", e);
        return "ERROR:" + e.toString();
    }
}

// プロパティのフルパスを取得
function getPropertyFullPath(prop) {
    var path = [];
    var current = prop;

    while (current && current.parentProperty) {
        if (current.parentProperty instanceof AVLayer) {
            break;
        }
        path.unshift(current.name);
        current = current.parentProperty;
    }

    return path.join(" → ");
}

// エクスプレッションを複数レイヤーに適用
function applyExpressionToLayers(layerIndices, propertyName, expression) {
    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            return '{"success":false,"error":"No active composition."}';
        }

        app.beginUndoGroup("Apply Expression to Layers");

        var successCount = 0;
        var errors = [];

        for (var i = 0; i < layerIndices.length; i++) {
            try {
                var layer = comp.layer(layerIndices[i]);
                if (!layer) {
                    errors.push("レイヤー " + layerIndices[i] + " が見つかりません");
                    continue;
                }

                // プロパティパスを分割
                var pathParts = propertyName.split(" → ");

                // レイヤーからプロパティを検索
                var targetProp = layer;
                var found = true;
                for (var j = 0; j < pathParts.length; j++) {
                    try {
                        targetProp = targetProp.property(pathParts[j]);
                        if (!targetProp) {
                            found = false;
                            break;
                        }
                    } catch (e) {
                        found = false;
                        break;
                    }
                }

                if (!found || !targetProp) {
                    errors.push(layer.name + ": プロパティ '" + propertyName + "' が見つかりません");
                    continue;
                }

                if (!targetProp.canSetExpression) {
                    errors.push(layer.name + ": エクスプレッションを設定できません");
                    continue;
                }

                targetProp.expression = expression;
                targetProp.expressionEnabled = true;
                successCount++;

            } catch (e) {
                errors.push(layer ? layer.name : "レイヤー " + layerIndices[i] + ": " + e.toString());
            }
        }

        app.endUndoGroup();

        // JSON文字列を手動で構築（ExtendScriptの互換性のため）
        var resultStr = '{"success":' + (successCount > 0 ? 'true' : 'false') +
            ',"count":' + successCount +
            ',"total":' + layerIndices.length;

        if (errors.length > 0) {
            // エラーメッセージ内の特殊文字をエスケープ
            var errorMsg = errors.join("; ").replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            resultStr += ',"error":"' + errorMsg + '"';
        }

        resultStr += '}';

        return resultStr;

    } catch (e) {
        logError("エクスプレッション適用", e);
        var errorMsg = e.toString().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return '{"success":false,"error":"' + errorMsg + '"}';
    }
}

// レイヤー内で一致するプロパティを検索
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
