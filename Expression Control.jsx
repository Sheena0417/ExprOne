(function (thisObj) {
    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", "Expression Control", undefined, { resizeable: true });

        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 10;
        win.margins = 10;

        var propDropdown = win.add("dropdownlist", undefined, []);
        propDropdown.preferredSize.width = 200;

        var getBtn = win.add("button", undefined, "This Layer");

        var exprInput = win.add("edittext", undefined, "", {
            multiline: true,
            scrolling: true
        });
        exprInput.preferredSize = [200, 100];

        var applyBtn = win.add("button", undefined, "Apply Expression");

        getBtn.onClick = function () {
            propDropdown.removeAll();

            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                alert("Please open a composition.");
                return;
            }

            var layers = comp.selectedLayers;
            if (layers.length === 0) {
                alert("Please select at least one layer.");
                return;
            }

            var props = layers[0].property("ADBE Transform Group");
            if (!props) {
                alert("No Transform group found.");
                return;
            }

            for (var i = 1; i <= props.numProperties; i++) {
                var prop = props.property(i);
                if (prop.canSetExpression) {
                    propDropdown.add("item", prop.name);
                }
            }

            if (propDropdown.items.length > 0) {
                propDropdown.selection = 0;
            }
        };

        applyBtn.onClick = function () {
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                alert("Please open a composition.");
                return;
            }

            var layers = comp.selectedLayers;
            if (layers.length === 0) {
                alert("Please select at least one layer.");
                return;
            }

            var layer = layers[0];
            var props = layer.property("ADBE Transform Group");
            var selection = propDropdown.selection;
            if (!selection) {
                alert("Please select a property.");
                return;
            }

            var prop = props.property(selection.text);
            if (prop && prop.canSetExpression) {
                app.beginUndoGroup("Apply Expression");
                prop.expression = exprInput.text;
                app.endUndoGroup();
            } else {
                alert("Cannot apply expression to this property.");
            }
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
