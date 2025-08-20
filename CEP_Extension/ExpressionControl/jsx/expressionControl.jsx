/**
 * Expression Control ExtendScript
 * CEP Extension用に最適化されたAfter Effects Expression制御スクリプト
 */

// ユーティリティ関数
function logError(msg, error) {
    if (error) {
        $.writeln("Error: " + msg + " - " + error.toString());
    } else {
        $.writeln("Error: " + msg);
    }
}

function safeExecute(func, errorMsg) {
    try {
        return func();
    } catch (e) {
        logError(errorMsg, e);
        return null;
    }
}

// レイヤー取得関数
function getSelectedLayers() {
    return safeExecute(function () {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            return { error: "コンポジションをアクティブにしてください。" };
        }
        if (comp.selectedLayers.length === 0) {
            return { error: "1つ以上のレイヤーを選択してください。" };
        }

        var result = [];
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            var layer = comp.selectedLayers[i];
            result.push({
                name: layer.name,
                index: layer.index,
                type: layer.matchName
            });
        }

        return {
            success: true,
            layers: result,
            count: comp.selectedLayers.length
        };
    }, "レイヤー選択の取得");
}

// エクスプレッション可能なプロパティをスキャン
function listVisibleExpressionProps(layerIndex) {
    return safeExecute(function () {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            return { error: "アクティブなコンポジションがありません。" };
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return { error: "レイヤーが見つかりません。" };
        }

        var result = [];

        function scanGroup(group, path, isLayerStyles) {
            if (!group) return;

            for (var i = 1; i <= group.numProperties; i++) {
                try {
                    var prop = group.property(i);
                    if (!prop) continue;

                    var fullPath = path + " → " + prop.name;

                    if (prop.numProperties > 0 && !(prop instanceof Property)) {
                        // グループプロパティの場合
                        if (isLayerStyles) {
                            if (prop.enabled && prop.active) {
                                scanGroup(prop, fullPath, false);
                            }
                        } else {
                            scanGroup(prop, fullPath, false);
                        }
                    } else {
                        // 個別プロパティの場合
                        if (prop.canSetExpression) {
                            var propInfo = {
                                name: fullPath,
                                matchName: prop.matchName,
                                propertyType: prop.propertyType,
                                hasExpression: (prop.expression && prop.expression !== ""),
                                expression: prop.expression || "",
                                value: getPropertyValue(prop),
                                path: getPropertyPath(prop)
                            };
                            result.push(propInfo);
                        }
                    }
                } catch (e) {
                    // プロパティアクセスエラーは無視
                }
            }
        }

        // 各グループをスキャン
        var groups = [
            { name: "Text", matchName: "ADBE Text Properties" },
            { name: "Contents", matchName: "ADBE Root Vectors Group" },
            { name: "Transform", matchName: "ADBE Transform Group" },
            { name: "Light Options", matchName: "ADBE Light Options Group" },
            { name: "Camera Options", matchName: "ADBE Camera Options Group" },
            { name: "Material Options", matchName: "ADBE Material Options Group" }
        ];

        for (var g = 0; g < groups.length; g++) {
            var group = layer.property(groups[g].matchName);
            if (group) {
                scanGroup(group, groups[g].name, false);
            }
        }

        // エフェクトの処理
        var effects = layer.property("ADBE Effect Parade");
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
                                var propInfo = {
                                    name: baseLabel + " → " + subProp.name,
                                    matchName: subProp.matchName,
                                    propertyType: subProp.propertyType,
                                    hasExpression: (subProp.expression && subProp.expression !== ""),
                                    expression: subProp.expression || "",
                                    value: getPropertyValue(subProp),
                                    path: getPropertyPath(subProp)
                                };
                                result.push(propInfo);
                            }
                        } catch (e) { }
                    }
                } catch (e) { }
            }
        }

        // 3Dレイヤー用ジオメトリオプション
        if (layer.threeDLayer) {
            var geoMatchNames = [
                "ADBE Geometry Options Group",
                "ADBE Plane Options Group",
                "ADBE Extrsn Options Group"
            ];

            for (var k = 0; k < geoMatchNames.length; k++) {
                var group = layer.property(geoMatchNames[k]);
                if (group) {
                    scanGroup(group, "Geometry Options", false);
                    break;
                }
            }
        }

        // レイヤースタイル
        var layerStyles = layer.property("ADBE Layer Styles");
        if (layerStyles) {
            for (var l = 1; l <= layerStyles.numProperties; l++) {
                try {
                    var styleGroup = layerStyles.property(l);
                    if (styleGroup && styleGroup.numProperties > 0 &&
                        styleGroup.enabled && styleGroup.active) {
                        scanGroup(styleGroup, "Layer Styles → " + styleGroup.name, true);
                    }
                } catch (e) { }
            }
        }

        return {
            success: true,
            properties: result,
            layerName: layer.name
        };

    }, "プロパティスキャン");
}

// プロパティの値を取得（型に応じて）
function getPropertyValue(prop) {
    try {
        if (prop.propertyType === PropertyType.ThreeD_SPATIAL ||
            prop.propertyType === PropertyType.TwoD_SPATIAL ||
            prop.propertyType === PropertyType.ThreeD ||
            prop.propertyType === PropertyType.TwoD) {
            return prop.value.toString();
        } else {
            return prop.value;
        }
    } catch (e) {
        return "取得不可";
    }
}

// プロパティのパスを取得
function getPropertyPath(prop) {
    var path = [];
    var current = prop;

    while (current && current.parentProperty && !(current.parentProperty instanceof AVLayer)) {
        path.unshift(current.matchName);
        current = current.parentProperty;
    }

    return path;
}

// 複数レイヤーの共通プロパティを取得
function listCommonExpressionProps(layerIndices) {
    return safeExecute(function () {
        if (!layerIndices || layerIndices.length === 0) {
            return { error: "レイヤーが指定されていません。" };
        }

        var allPropsPerLayer = [];

        // 各レイヤーのプロパティを取得
        for (var i = 0; i < layerIndices.length; i++) {
            var props = listVisibleExpressionProps(layerIndices[i]);
            if (props && props.success) {
                allPropsPerLayer.push(props.properties);
            } else {
                return { error: "レイヤー " + layerIndices[i] + " の処理でエラーが発生しました。" };
            }
        }

        if (allPropsPerLayer.length === 0) {
            return { success: true, properties: [] };
        }

        // 共通プロパティを抽出
        var commonProps = allPropsPerLayer[0];

        for (var j = 1; j < allPropsPerLayer.length; j++) {
            var currentLayerProps = allPropsPerLayer[j];
            var newCommonProps = [];

            for (var k = 0; k < commonProps.length; k++) {
                var commonProp = commonProps[k];
                var found = false;

                for (var l = 0; l < currentLayerProps.length; l++) {
                    if (currentLayerProps[l].name === commonProp.name) {
                        found = true;
                        break;
                    }
                }

                if (found) {
                    newCommonProps.push(commonProp);
                }
            }

            commonProps = newCommonProps;
        }

        return {
            success: true,
            properties: commonProps,
            layerCount: layerIndices.length
        };

    }, "共通プロパティの取得");
}

// エクスプレッションが設定済みのプロパティを抽出
function listExistingExpressions(layerIndices) {
    return safeExecute(function () {
        var allProps;

        if (layerIndices.length === 1) {
            allProps = listVisibleExpressionProps(layerIndices[0]);
        } else {
            allProps = listCommonExpressionProps(layerIndices);
        }

        if (!allProps || !allProps.success) {
            return allProps;
        }

        var result = [];
        for (var i = 0; i < allProps.properties.length; i++) {
            var prop = allProps.properties[i];
            if (prop.hasExpression && prop.expression !== "") {
                result.push(prop);
            }
        }

        return {
            success: true,
            properties: result
        };

    }, "既存エクスプレッションの取得");
}

// エクスプレッションを適用
function applyExpression(layerIndices, propertyPath, expression) {
    return safeExecute(function () {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            return { error: "アクティブなコンポジションがありません。" };
        }

        app.beginUndoGroup("Apply Expression to Layers");

        var results = [];

        for (var i = 0; i < layerIndices.length; i++) {
            try {
                var layer = comp.layer(layerIndices[i]);
                if (!layer) {
                    results.push({
                        layerIndex: layerIndices[i],
                        success: false,
                        error: "レイヤーが見つかりません"
                    });
                    continue;
                }

                var targetProp = getPropertyByPath(layer, propertyPath);
                if (!targetProp) {
                    results.push({
                        layerIndex: layerIndices[i],
                        success: false,
                        error: "プロパティが見つかりません"
                    });
                    continue;
                }

                if (!targetProp.canSetExpression) {
                    results.push({
                        layerIndex: layerIndices[i],
                        success: false,
                        error: "このプロパティにはエクスプレッションを設定できません"
                    });
                    continue;
                }

                targetProp.expression = expression;
                results.push({
                    layerIndex: layerIndices[i],
                    layerName: layer.name,
                    success: true
                });

            } catch (e) {
                results.push({
                    layerIndex: layerIndices[i],
                    success: false,
                    error: e.toString()
                });
            }
        }

        app.endUndoGroup();

        return {
            success: true,
            results: results
        };

    }, "エクスプレッション適用");
}

// パスからプロパティを取得
function getPropertyByPath(layer, path) {
    try {
        var target = layer;
        for (var i = 0; i < path.length; i++) {
            target = target.property(path[i]);
            if (!target) return null;
        }
        return target;
    } catch (e) {
        return null;
    }
}

// エクスプレッションの検証
function validateExpression(expression) {
    return safeExecute(function () {
        // 基本的な構文チェック
        var errors = [];

        // 括弧の対応チェック
        var openBrackets = (expression.match(/\(/g) || []).length;
        var closeBrackets = (expression.match(/\)/g) || []).length;
        if (openBrackets !== closeBrackets) {
            errors.push("括弧の対応が取れていません");
        }

        var openSquare = (expression.match(/\[/g) || []).length;
        var closeSquare = (expression.match(/\]/g) || []).length;
        if (openSquare !== closeSquare) {
            errors.push("角括弧の対応が取れていません");
        }

        var openCurly = (expression.match(/\{/g) || []).length;
        var closeCurly = (expression.match(/\}/g) || []).length;
        if (openCurly !== closeCurly) {
            errors.push("波括弧の対応が取れていません");
        }

        // 基本的なキーワードチェック
        var forbiddenKeywords = ['eval', 'alert', 'confirm'];
        for (var i = 0; i < forbiddenKeywords.length; i++) {
            if (expression.indexOf(forbiddenKeywords[i]) !== -1) {
                errors.push("使用できないキーワードが含まれています: " + forbiddenKeywords[i]);
            }
        }

        return {
            success: true,
            valid: errors.length === 0,
            errors: errors
        };

    }, "エクスプレッション検証");
}

// 公開API
var ExpressionControlAPI = {
    getSelectedLayers: getSelectedLayers,
    listVisibleExpressionProps: listVisibleExpressionProps,
    listCommonExpressionProps: listCommonExpressionProps,
    listExistingExpressions: listExistingExpressions,
    applyExpression: applyExpression,
    validateExpression: validateExpression
};

// CEPから呼び出し可能にする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExpressionControlAPI;
}
