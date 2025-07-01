import { getFirstLayer } from "./getFirstLayer.js";
import { listVisibleExpressionProps } from "./listVisibleExpressionProps.js";

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

    var exprInput = win.add("edittext", undefined, "", {
        multiline: true,
        scrolling: true
    });
    exprInput.preferredSize = [300, 120];

    var currentProp = null;

    scanBtn.onClick = function () {
        var layer = getFirstLayer();
        if (!layer) return;

        var list = listVisibleExpressionProps(layer);
        propDropdown.removeAll();

        for (var i = 0; i < list.length; i++) {
            var item = propDropdown.add("item", list[i].name);
            item.prop = list[i].ref;
        }

        if (propDropdown.items.length > 0) {
            propDropdown.selection = 0;
            propDropdown.onChange(); // 強制発火
        } else {
            exprInput.text = "";
            currentProp = null;
        }
    };

    propDropdown.onChange = function () {
        var selection = propDropdown.selection;
        if (!selection || !selection.prop) {
            exprInput.text = "";
            currentProp = null;
            return;
        }

        currentProp = selection.prop;
        try {
            exprInput.text = currentProp.expression || "";
        } catch (e) {
            exprInput.text = "// エラー：" + e.toString();
        }
    };

    win.layout.layout(true);
    win.onResizing = win.onResize = function () {
        this.layout.resize();
    };

    return win;
}
