import { getFirstLayer } from "./getFirstLayer.js";
import { listVisibleExpressionProps } from "./listVisibleExpressionProps.js";
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
    var scanBtn = topGroup.add("button", undefined, "This Layer");
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
    exprInput.preferredSize = [300, 120];

    var currentProp = null;

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

        // 🔁 選択されたプロパティが記入済みリストに存在しない場合
        if (!matched && changedDropdown === propDropdown) {
            exprDropdown.selection = 0; // "-----"
        }
    }

    scanBtn.onClick = function () {
        var layer = getFirstLayer();
        if (!layer) return;

        var all = listVisibleExpressionProps(layer);
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

    win.layout.layout(true);
    win.onResizing = win.onResize = function () {
        this.layout.resize();
    };

    return win;
}
