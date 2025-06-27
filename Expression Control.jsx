(function (thisObj) {
    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Expression Control", undefined, {resizeable: true});

        if (win !== null) {
            win.orientation = "column";
            win.alignChildren = ["fill", "top"];
            win.spacing = 10;
            win.margins = 10;

            // ドロップダウン：プロパティリスト（仮）
            var propDropdown = win.add("dropdownlist", undefined, ["Position", "Opacity", "Scale"]);
            propDropdown.selection = 0;

            // エクスプレッション追加ボタン
            var addExprBtn = win.add("button", undefined, "Add Expression");

            addExprBtn.onClick = function () {
                var comp = app.project.activeItem;
                if (!(comp instanceof CompItem)) {
                    alert("Please select a composition.");
                    return;
                }
                if (comp.selectedLayers.length === 0) {
                    alert("Please select a layer.");
                    return;
                }

                var propName = propDropdown.selection.text;
                var expr = "time"; // とりあえず time を追加

                app.beginUndoGroup("Add Expression");
                for (var i = 0; i < comp.selectedLayers.length; i++) {
                    var layer = comp.selectedLayers[i];
                    var prop = layer.property(propName);
                    if (prop && prop.canSetExpression) {
                        prop.expression = expr;
                    }
                }
                app.endUndoGroup();
            };

            win.layout.layout(true);
        }

        return win;
    }

    var myPanel = buildUI(thisObj);
    if (myPanel instanceof Window) {
        myPanel.center();
        myPanel.show();
    }
})(this);
