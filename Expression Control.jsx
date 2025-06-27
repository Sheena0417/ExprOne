(function (thisObj) {
    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", "Expression Control", undefined, { resizeable: true });

        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 10;
        win.margins = 10;

        var scanGroup = win.add("group");
        var scanBtn = scanGroup.add("button", undefined, "this layer");
        var allPropsDropdown = scanGroup.add("dropdownlist", undefined, []);
        allPropsDropdown.preferredSize.width = 250;

        var existingGroup = win.add("group");
        existingGroup.orientation = "row";
        existingGroup.add("statictext", undefined, "Existing expressions:");
        var exprPropsDropdown = existingGroup.add("dropdownlist", undefined, []);
        exprPropsDropdown.preferredSize.width = 250;

        var textEdit = win.add("edittext", undefined, "", { multiline: true });
        textEdit.preferredSize = [300, 120];

        var applyBtn = win.add("button", undefined, "Apply Expression");

        function scanExpressionProps(group, path, results, existing) {
            for (var i = 1; i <= group.numProperties; i++) {
                var prop = group.property(i);
                if (!prop) continue;

                var newPath = path.length > 0 ? path + " -> " + prop.name : prop.name;

                if (
                    prop.canSetExpression &&
                    prop.propertyType === PropertyType.PROPERTY &&
                    typeof prop.expression !== "undefined"
                ) {
                    results.push({ ref: prop, name: newPath });
                    if (prop.expression && prop.expression !== "") {
                        existing.push({ ref: prop, name: newPath });
                    }
                }

                if (
                    prop.propertyType === PropertyType.INDEXED_GROUP ||
                    prop.propertyType === PropertyType.NAMED_GROUP
                ) {
                    scanExpressionProps(prop, newPath, results, existing);
                }
            }
        }

        scanBtn.onClick = function () {
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                alert("Please open a composition.");
                return;
            }

            var layer = comp.selectedLayers[0];
            if (!layer) {
                alert("Please select one layer.");
                return;
            }

            allPropsDropdown.removeAll();
            exprPropsDropdown.removeAll();
            var props = [], exprProps = [];

            scanExpressionProps(layer, "", props, exprProps);

            for (var i = 0; i < props.length; i++) {
                var item = allPropsDropdown.add("item", props[i].name);
                item.prop = props[i].ref;
            }

            var blank = exprPropsDropdown.add("item", "-----");
            blank.prop = null;
            for (var j = 0; j < exprProps.length; j++) {
                var item = exprPropsDropdown.add("item", exprProps[j].name);
                item.prop = exprProps[j].ref;
            }

            // 初期状態を空欄にしておく
            allPropsDropdown.selection = null;
            exprPropsDropdown.selection = 0;
            textEdit.text = "";
        };

        function syncDropdowns(changedDropdown) {
            var selectedItem = changedDropdown.selection;
            if (!selectedItem) return;
            var targetProp = selectedItem.prop;

            if (targetProp) {
                try {
                    textEdit.text = targetProp.expression || "";
                } catch (e) {
                    textEdit.text = "";
                }
            } else {
                textEdit.text = "";
            }

            var otherDropdown = (changedDropdown === allPropsDropdown) ? exprPropsDropdown : allPropsDropdown;
            for (var i = 0; i < otherDropdown.items.length; i++) {
                if (otherDropdown.items[i].prop === targetProp) {
                    otherDropdown.selection = i;
                    return;
                }
            }
            if (changedDropdown === allPropsDropdown) exprPropsDropdown.selection = 0;
        }

        allPropsDropdown.onChange = function () {
            syncDropdowns(allPropsDropdown);
        };

        exprPropsDropdown.onChange = function () {
            syncDropdowns(exprPropsDropdown);
        };

        applyBtn.onClick = function () {
            var item = allPropsDropdown.selection;
            if (!item || !item.prop) {
                alert("Please select a property.");
                return;
            }

            app.beginUndoGroup("Set Expression");
            try {
                item.prop.expression = textEdit.text;
            } catch (e) {
                alert("Error applying expression:\n" + e.toString());
            }
            app.endUndoGroup();
        };

        win.layout.layout(true);
        win.onResizing = win.onResize = function () {
            this.layout.resize();
        };

        return win;
    }

    var myPanel = buildUI(thisObj);
    if (myPanel instanceof Window) {
        myPanel.center();
        myPanel.show();
    }
})(this);
