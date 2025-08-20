import { getSelectedLayers } from "./getSelectedLayers.js";
import { listVisibleExpressionProps } from "./listVisibleExpressionProps.js";
import { listCommonExpressionProps } from "./listCommonExpressionProps.js";
import { listExistingExpressions } from "./listExistingExpressions.js";

export function buildUI(thisObj) {
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

    // テキストエリア
    var exprInput = win.add("edittext", undefined, "", {
        multiline: true,
        scrolling: true
    });
    exprInput.alignment = ["fill", "fill"];
    exprInput.minimumSize = [300, 100];

    // Apply ボタン（別グループで高さ固定）
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
            exprDropdown.selection = 0; // "-----"
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
