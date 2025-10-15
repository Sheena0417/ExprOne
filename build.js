const fs = require('fs');
const path = require('path');

console.log('Building ExprOne CEP Extension...');

// ビルド情報を生成
const buildInfo = {
    version: require('./package.json').version,
    buildDate: new Date().toISOString(),
    buildNumber: Date.now()
};

// ビルド情報をファイルに保存
fs.writeFileSync('build-info.json', JSON.stringify(buildInfo, null, 2));

console.log(`Build completed: v${buildInfo.version} (${buildInfo.buildDate})`);
console.log('Ready for packaging or installation.');
