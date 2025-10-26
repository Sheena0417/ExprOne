/**
 * ExprOne ExtendScript
 * After Effects Expression control script for CEP Extension
 */

// Global variables (cache for layers and properties)
var cachedLayers = [];
var cachedProps = [];

// Utility: Error logging
function logError(msg, error) {
    if (error) {
        $.writeln("Error: " + msg + " - " + error.toString());
    } else {
        $.writeln("Error: " + msg);
    }
}

// Get selected layers (return as string format)
function getSelectedLayers() {
    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            return "ERROR:Please activate a composition.";
        }
        if (comp.selectedLayers.length === 0) {
            return "ERROR:Please select one or more layers.";
        }

        // Save to global cache
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
        logError("Getting layer selection", e);
        return "ERROR:" + e.toString();
    }
}

// Property scan (based on working JSX)
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
        cachedProps = []; // Clear global cache

        // Recursive function to scan groups
        function scanGroup(group, path, isLayerStyles) {
            if (!group) return;

            for (var i = 1; i <= group.numProperties; i++) {
                try {
                    var prop = group.property(i);
                    if (!prop) continue;

                    var fullPath = path + " → " + prop.name;

                    if (prop.numProperties > 0 && !(prop instanceof Property)) {
                        // Group property
                        if (isLayerStyles) {
                            if (prop.enabled && prop.active) {
                                scanGroup(prop, fullPath, false);
                            }
                        } else {
                            scanGroup(prop, fullPath, false);
                        }
                    } else {
                        // Individual property
                        if (prop.canSetExpression) {
                            var hasExpr = (prop.expression && prop.expression !== "");
                            result.push({
                                name: fullPath,
                                hasExpression: hasExpr
                            });
                            // Save property reference to cache (referenced by index)
                            cachedProps.push(prop);
                        }
                    }
                } catch (e) {
                    // Ignore property access errors
                }
            }
        }

        // Text property
        var textGroup = selectedLayer.property("ADBE Text Properties");
        if (textGroup) scanGroup(textGroup, "Text", false);

        // Contents property
        var contentsGroup = selectedLayer.property("ADBE Root Vectors Group");
        if (contentsGroup) scanGroup(contentsGroup, "Contents", false);

        // Effects
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

        // Transform property
        var transformGroup = selectedLayer.property("ADBE Transform Group");
        if (transformGroup) scanGroup(transformGroup, "Transform", false);

        // Light Options
        var lightOptions = selectedLayer.property("ADBE Light Options Group");
        if (lightOptions) scanGroup(lightOptions, "Light Options", false);

        // Camera Options
        var cameraOptions = selectedLayer.property("ADBE Camera Options Group");
        if (cameraOptions) scanGroup(cameraOptions, "Camera Options", false);

        // Geometry Options (3D layer)
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

        // Return as string format (compatibility with main.js)
        var output = "SUCCESS:";
        for (var m = 0; m < result.length; m++) {
            output += "|PROP:" + result[m].name;
            output += "|EXPR:" + (result[m].hasExpression ? "1" : "0");
        }

        return output;

    } catch (e) {
        logError("Property scan", e);
        return "ERROR:" + e.toString();
    }
}

// Get common properties (multiple layers)
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

        // Get property names for each layer
        for (var i = 0; i < layerIndices.length; i++) {
            var propResult = listVisibleExpressionProps(layerIndices[i]);
            if (propResult.indexOf("ERROR:") === 0) {
                return propResult;
            }

            // Parse after SUCCESS:
            var parts = propResult.split("|");
            var propNames = [];
            for (var j = 1; j < parts.length; j += 2) {
                if (parts[j].indexOf("PROP:") === 0) {
                    propNames.push(parts[j].substring(5));
                }
            }
            allPropsPerLayer.push(propNames);
        }

        // Extract common properties
        var commonNames = allPropsPerLayer[0];
        for (var k = 1; k < allPropsPerLayer.length; k++) {
            var newCommon = [];
            for (var l = 0; l < commonNames.length; l++) {
                // indexOf is not available in ExtendScript, so check manually
                var found = false;
                for (var m = 0; m < allPropsPerLayer[k].length; m++) {
                    if (allPropsPerLayer[k][m] === commonNames[l]) {
                        found = true;
                        break;
                    }
                }
                if (found) {
                    newCommon.push(commonNames[l]);
                }
            }
            commonNames = newCommon;
        }

        // Return as string format
        var output = "SUCCESS:";
        for (var n = 0; n < commonNames.length; n++) {
            output += "|PROP:" + commonNames[n];
            output += "|EXPR:0"; // For common properties, expression state is unknown
        }

        return output;

    } catch (e) {
        logError("Getting common properties", e);
        return "ERROR:" + e.toString();
    }
}

// Get expression content
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

        // Search from cached properties
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
        logError("Getting expression content", e);
        return "ERROR:" + e.toString();
    }
}

// Get full path of property
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

// Apply expression to multiple layers
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
                    errors.push("Layer " + layerIndices[i] + " not found");
                    continue;
                }

                // Split property path
                var pathParts = propertyName.split(" → ");

                // Search for property from layer
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
                    errors.push(layer.name + ": Property '" + propertyName + "' not found");
                    continue;
                }

                if (!targetProp.canSetExpression) {
                    errors.push(layer.name + ": Cannot set expression on this property");
                    continue;
                }

                targetProp.expression = expression;
                targetProp.expressionEnabled = true;
                successCount++;

            } catch (e) {
                errors.push(layer ? layer.name : "Layer " + layerIndices[i] + ": " + e.toString());
            }
        }

        app.endUndoGroup();

        // Manually build JSON string (for ExtendScript compatibility)
        var resultStr = '{"success":' + (successCount > 0 ? 'true' : 'false') +
            ',"count":' + successCount +
            ',"total":' + layerIndices.length;

        if (errors.length > 0) {
            // Escape special characters in error messages
            var errorMsg = errors.join("; ").replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            resultStr += ',"error":"' + errorMsg + '"';
        }

        resultStr += '}';

        return resultStr;

    } catch (e) {
        logError("Applying expression", e);
        var errorMsg = e.toString().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return '{"success":false,"error":"' + errorMsg + '"}';
    }
}

// Search for matching property in layer
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

// Get project information for autocompletion
function getProjectInfo() {
    try {
        var compositions = [];
        var compLayers = {};  // Store layer information for each composition
        var effects = [];

        // Get all compositions in the project
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem) {
                compositions.push(item.name);

                // Get layers for each composition
                var layersInComp = [];
                for (var j = 1; j <= item.numLayers; j++) {
                    layersInComp.push(item.layer(j).name);
                }
                compLayers[item.name] = layersInComp;
            }
        }

        // Get effects from selected layers in active composition
        var comp = app.project.activeItem;
        if (comp instanceof CompItem) {
            // Get effects from selected layers
            if (comp.selectedLayers.length > 0) {
                var layer = comp.selectedLayers[0];
                var effectsGroup = layer.property("ADBE Effect Parade");
                if (effectsGroup) {
                    for (var k = 1; k <= effectsGroup.numProperties; k++) {
                        effects.push(effectsGroup.property(k).name);
                    }
                }
            }
        }

        // Build result string
        var result = "SUCCESS:COMPS:";
        for (var c = 0; c < compositions.length; c++) {
            if (c > 0) result += ",";
            result += compositions[c].replace(/,/g, "\\,").replace(/\|/g, "\\|");
        }

        // Add layer information for each composition
        result += "|COMP_LAYERS:";
        var compCount = 0;
        for (var compName in compLayers) {
            if (compLayers.hasOwnProperty(compName)) {
                if (compCount > 0) result += ";;";  // Separator between compositions

                // Add composition name and layer list
                result += compName.replace(/,/g, "\\,").replace(/\|/g, "\\|").replace(/;/g, "\\;") + "::";

                var layers = compLayers[compName];
                for (var l = 0; l < layers.length; l++) {
                    if (l > 0) result += ",";
                    result += layers[l].replace(/,/g, "\\,").replace(/\|/g, "\\|").replace(/;/g, "\\;");
                }
                compCount++;
            }
        }

        result += "|EFFECTS:";
        for (var e = 0; e < effects.length; e++) {
            if (e > 0) result += ",";
            result += effects[e].replace(/,/g, "\\,").replace(/\|/g, "\\|");
        }

        return result;
    } catch (e) {
        logError("Get Project Info", e);
        return "ERROR:" + e.toString();
    }
}

// Get expression error for a property
function getExpressionError(layerIndex, propertyName) {
    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            return "ERROR:No active composition.";
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return "ERROR:Layer not found.";
        }

        // Split property path
        var pathParts = propertyName.split(" → ");

        // Search for property from layer
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
            return "ERROR:Property not found.";
        }

        // Get expression error
        var errorMsg = targetProp.expressionError;
        if (errorMsg) {
            // Escape error message
            errorMsg = errorMsg.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
            return "SUCCESS:" + errorMsg;
        } else {
            return "SUCCESS:";  // No error
        }

    } catch (e) {
        logError("Get Expression Error", e);
        var errMsg = e.toString().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return "ERROR:" + errMsg;
    }
}

// Remove expression from current property
function removeCurrentExpression(layerIndex, propertyName) {
    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            return "ERROR:No active composition.";
        }

        var layer = comp.layer(layerIndex);
        if (!layer) {
            return "ERROR:Layer not found.";
        }

        // Split property path
        var pathParts = propertyName.split(" → ");

        // Search for property from layer
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
            return "ERROR:Property not found.";
        }

        // Remove expression
        targetProp.expression = "";

        return "SUCCESS:Expression removed from " + propertyName;

    } catch (e) {
        logError("Remove Current Expression", e);
        return "ERROR:" + e.toString();
    }
}

// Remove all expressions from selected layers
function removeAllExpressions(layerIndices) {
    try {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            return "ERROR:No active composition.";
        }

        var removedCount = 0;
        var layerArray = layerIndices.split(',');

        for (var i = 0; i < layerArray.length; i++) {
            var layerIndex = parseInt(layerArray[i]);
            var layer = comp.layer(layerIndex);

            if (layer) {
                // Remove expressions from all properties
                removeExpressionsFromLayer(layer);
                removedCount++;
            }
        }

        return "SUCCESS:Expressions removed from " + removedCount + " layer(s)";

    } catch (e) {
        logError("Remove All Expressions", e);
        return "ERROR:" + e.toString();
    }
}

// Helper function to remove expressions from all properties of a layer
function removeExpressionsFromLayer(layer) {
    try {
        // Remove expressions from transform properties
        if (layer.transform) {
            var transformProps = ["Anchor Point", "Position", "Scale", "Rotation", "Opacity"];
            for (var i = 0; i < transformProps.length; i++) {
                try {
                    var prop = layer.transform.property(transformProps[i]);
                    if (prop && prop.expression) {
                        prop.expression = "";
                    }
                } catch (e) {
                    // Property might not exist, continue
                }
            }
        }

        // Remove expressions from effects
        if (layer.effect) {
            for (var j = 1; j <= layer.effect.numProperties; j++) {
                var effect = layer.effect.property(j);
                if (effect) {
                    for (var k = 1; k <= effect.numProperties; k++) {
                        try {
                            var effectProp = effect.property(k);
                            if (effectProp && effectProp.expression) {
                                effectProp.expression = "";
                            }
                        } catch (e) {
                            // Property might not exist, continue
                        }
                    }
                }
            }
        }

        // Remove expressions from masks
        if (layer.mask) {
            for (var m = 1; m <= layer.mask.numProperties; m++) {
                var mask = layer.mask.property(m);
                if (mask) {
                    for (var n = 1; n <= mask.numProperties; n++) {
                        try {
                            var maskProp = mask.property(n);
                            if (maskProp && maskProp.expression) {
                                maskProp.expression = "";
                            }
                        } catch (e) {
                            // Property might not exist, continue
                        }
                    }
                }
            }
        }

    } catch (e) {
        logError("Remove Expressions From Layer", e);
    }
}
