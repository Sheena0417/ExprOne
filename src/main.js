// import { listVisibleExpressionProps } from "./listVisibleExpressionProps.js"
// import { getFirstLayer } from "./getFirstLayer.js"

// export function main() {
//     layer = getFirstLayer()
//     list = listVisibleExpressionProps(layer)
//     alert("表示中かつエクスプレッション可能なプロパティ:\n\n" + list.join("\n"));
// }

import { buildUI } from "./uiPanel.js";

export function main(thisObj) {
    const panel = buildUI(thisObj);
    if (panel instanceof Window) {
        panel.center();
        panel.show();
    }
}
