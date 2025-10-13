// Expression Control API - ExtendScript側
// CEP拡張機能から呼び出される関数群

// グローバルAPIオブジェクト
var ExpressionControlAPI = {
    
    // 選択されたレイヤーを取得
    getSelectedLayers: function() {
        try {
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                return JSON.stringify({
                    error: "コンポジションをアクティブにしてください。",
                    layers: [],
                    count: 0
                });
            }
            
            if (comp.selectedLayers.length === 0) {
                return JSON.stringify({
                    error: "1つ以上のレイヤーを選択してください。",
                    layers: [],
                    count: 0
                });
            }
            
            var layers = [];
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                var layer = comp.selectedLayers[i];
                layers.push({
                    index: layer.index,
                    name: layer.name,
                    enabled: layer.enabled
                });
            }
            
            return JSON.stringify({
                success: true,
                layers: layers,
                count: layers.length
            });
            
        } catch (e) {
            return JSON.stringify({
                error: "エラー: " + e.toString(),
                layers: [],
                count: 0
            });
        }
    },
    
    // 単一レイヤーの表示可能エクスプレッションプロパティを取得
    listVisibleExpressionProps: function(layerIndex) {
        try {
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                return JSON.stringify({
                    error: "アクティブなコンポジションがありません",
                    properties: []
                });
            }
            
            var layer = comp.layer(layerIndex);
            if (!layer) {
                return JSON.stringify({
                    error: "レイヤーが見つかりません",
                    properties: []
                });
            }
            
            var result = this._scanLayerProperties(layer);
            
            return JSON.stringify({
                success: true,
                properties: result
            });
            
        } catch (e) {
            return JSON.stringify({
                error: "エラー: " + e.toString(),
                properties: []
            });
        }
    },
    
    // 複数レイヤーの共通エクスプレッションプロパティを取得
    listCommonExpressionProps: function(layerIndices) {
        try {
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                return JSON.stringify({
                    error: "アクティブなコンポジションがありません",
                    properties: []
                });
            }
            
            if (!layerIndices || layerIndices.length === 0) {
                return JSON.stringify({
                    error: "レイヤーインデックスが指定されていません",
                    properties: []
                });
            }
            
            // 各レイヤーのプロパティを取得
            var allPropsPerLayer = [];
            for (var i = 0; i < layerIndices.length; i++) {
                var layer = comp.layer(layerIndices[i]);
                if (layer) {
                    allPropsPerLayer.push(this._scanLayerProperties(layer));
                }
            }
            
            if (allPropsPerLayer.length === 0) {
                return JSON.stringify({
                    error: "有効なレイヤーが見つかりません",
                    properties: []
                });
            }
            
            // 共通のプロパティ名を特定
            var nameLists = [];
            for (var j = 0; j < allPropsPerLayer.length; j++) {
                var names = [];
                for (var k = 0; k < allPropsPerLayer[j].length; k++) {
                    names.push(allPropsPerLayer[j][k].name);
                }
                nameLists.push(names);
            }
            
            var commonNames = nameLists[0];
            for (var l = 1; l < nameLists.length; l++) {
                var filtered = [];
                for (var m = 0; m < commonNames.length; m++) {
                    var found = false;
                    for (var n = 0; n < nameLists[l].length; n++) {
                        if (commonNames[m] === nameLists[l][n]) {
                            found = true;
                            break;
                        }
                    }
                    if (found) {
                        filtered.push(commonNames[m]);
                    }
                }
                commonNames = filtered;
            }
            
            // 最初のレイヤーから共通プロパティを抽出
            var result = [];
            var firstLayerProps = allPropsPerLayer[0];
            for (var o = 0; o < firstLayerProps.length; o++) {
                var prop = firstLayerProps[o];
                var isCommon = false;
                for (var p = 0; p < commonNames.length; p++) {
                    if (prop.name === commonNames[p]) {
                        isCommon = true;
                        break;
                    }
                }
                if (isCommon) {
                    result.push(prop);
                }
            }
            
            return JSON.stringify({
                success: true,
                properties: result
            });
            
        } catch (e) {
            return JSON.stringify({
                error: "エラー: " + e.toString(),
                properties: []
            });
        }
    },
    
    // エクスプレッションを適用
    applyExpression: function(layerIndices, propertyPath, expression) {
        try {
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                return JSON.stringify({
                    success: false,
                    error: "アクティブなコンポジションがありません"
                });
            }
            
            app.beginUndoGroup("Apply Expression");
            
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
                    
                    var targetProp = this._findPropertyByPath(layer, propertyPath);
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
                        success: true,
                        message: "エクスプレッションを適用しました"
                    });
                    
                } catch (e) {
                    results.push({
                        layerIndex: layerIndices[i],
                        success: false,
                        error: "エラー: " + e.toString()
                    });
                }
            }
            
            app.endUndoGroup();
            
            return JSON.stringify({
                success: true,
                results: results
            });
            
        } catch (e) {
            return JSON.stringify({
                success: false,
                error: "エラー: " + e.toString()
            });
        }
    },
    
    // エクスプレッションの検証（簡易版）
    validateExpression: function(expression) {
        try {
            // 基本的な構文チェック
            var errors = [];
            
            if (!expression || expression.trim() === "") {
                errors.push("エクスプレッションが空です");
            }
            
            // 括弧のペアチェック
            var openParens = (expression.match(/\(/g) || []).length;
            var closeParens = (expression.match(/\)/g) || []).length;
            if (openParens !== closeParens) {
                errors.push("括弧の数が一致しません");
            }
            
            // 基本的なAfter Effects関数の存在チェック
            var aeKeywords = ['wiggle', 'time', 'value', 'index', 'thisComp', 'thisLayer'];
            var hasAEKeyword = false;
            for (var i = 0; i < aeKeywords.length; i++) {
                if (expression.indexOf(aeKeywords[i]) !== -1) {
                    hasAEKeyword = true;
                    break;
                }
            }
            
            return JSON.stringify({
                success: true,
                valid: errors.length === 0,
                errors: errors,
                hasAEKeywords: hasAEKeyword
            });
            
        } catch (e) {
            return JSON.stringify({
                success: false,
                error: "検証エラー: " + e.toString()
            });
        }
    },
    
    // プライベート関数: レイヤーのプロパティをスキャン
    _scanLayerProperties: function(layer) {
        var result = [];
        
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
                            result.push({
                                name: fullPath,
                                path: this._buildPropertyPath(prop),
                                value: prop.value.toString(),
                                hasExpression: (prop.expression && prop.expression !== ""),
                                expression: prop.expression || ""
                            });
                        }
                    }
                } catch (e) {
                    // プロパティアクセスエラーを無視
                }
            }
        }
        
        // Transform
        var transformGroup = layer.property("ADBE Transform Group");
        if (transformGroup) scanGroup(transformGroup, "Transform", false);
        
        // Effects
        var effects = layer.property("ADBE Effect Parade");
        if (effects) {
            for (var i = 1; i <= effects.numProperties; i++) {
                try {
                    var effect = effects.property(i);
                    if (!effect) continue;
                    var baseLabel = "Effects → " + effect.name;
                    scanGroup(effect, baseLabel, false);
                } catch (e) {}
            }
        }
        
        // Text Properties
        var textGroup = layer.property("ADBE Text Properties");
        if (textGroup) scanGroup(textGroup, "Text", false);
        
        // Contents (Shape/Vector)
        var contentsGroup = layer.property("ADBE Root Vectors Group");
        if (contentsGroup) scanGroup(contentsGroup, "Contents", false);
        
        return result;
    },
    
    // プライベート関数: プロパティパスを構築
    _buildPropertyPath: function(prop) {
        var path = [];
        var current = prop;
        
        while (current && current.parentProperty && !(current.parentProperty instanceof AVLayer)) {
            path.unshift(current.name);
            current = current.parentProperty;
        }
        
        return path.join(" → ");
    },
    
    // プライベート関数: パスでプロパティを検索
    _findPropertyByPath: function(layer, pathString) {
        var pathParts = pathString.split(" → ");
        var current = layer;
        
        for (var i = 0; i < pathParts.length; i++) {
            try {
                current = current.property(pathParts[i]);
                if (!current) return null;
            } catch (e) {
                return null;
            }
        }
        
        return current;
    }
};

// CEP拡張機能から呼び出されるグローバル関数として公開
this.ExpressionControlAPI = ExpressionControlAPI;
