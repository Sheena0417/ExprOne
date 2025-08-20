export function listExistingExpressions(propList) {
    var result = [];

    for (var i = 0; i < propList.length; i++) {
        var prop = propList[i];
        try {
            if (prop.ref && prop.ref.expression && prop.ref.expression !== "") {
                result.push(prop);
            }
        } catch (e) {}
    }

    return result;
}
