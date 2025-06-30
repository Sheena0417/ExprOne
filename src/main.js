import { listVisibleExpressionProps } from "./listVisibleExpressionProps.js"
import { getFirstLayer } from "./getFirstLayer.js";

export function main() {
    layer = getFirstLayer()
    list = listVisibleExpressionProps(layer)
    // alert("表示中かつエクスプレッション可能なプロパティ:\n\n" + list.join("\n"));
}