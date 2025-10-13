/**
 * Expression Control - API Helper
 * After Effects Expression API用のヘルパー関数
 */

// After Effects 固有の関数と定数
const AE_FUNCTIONS = [
    // 基本関数
    'linear', 'ease', 'easeIn', 'easeOut', 'easeInOut',
    'wiggle', 'random', 'noise', 'smooth',
    'loopIn', 'loopOut', 'pingpong', 'cycle',
    'valueAtTime', 'velocityAtTime', 'speedAtTime',
    
    // 数学関数
    'Math.sin', 'Math.cos', 'Math.tan', 'Math.asin', 'Math.acos', 'Math.atan', 'Math.atan2',
    'Math.sqrt', 'Math.pow', 'Math.exp', 'Math.log', 'Math.abs',
    'Math.floor', 'Math.ceil', 'Math.round', 'Math.min', 'Math.max',
    'Math.PI', 'Math.E',
    
    // 文字列関数
    'toString', 'toFixed', 'substring', 'indexOf', 'replace',
    
    // 配列・ベクトル関数
    'length', 'normalize', 'dot', 'cross', 'lookAt',
    'fromWorld', 'toWorld', 'fromComp', 'toComp',
    
    // 時間関数
    'timeToFrames', 'framesToTime', 'timeToNTSCTimecode', 'timeToTimecode',
    
    // レイヤー関数
    'thisLayer', 'thisComp', 'thisProperty',
    'marker', 'nearestKey', 'key', 'numKeys',
    
    // テキスト関数
    'text.sourceText', 'text.font', 'text.fontSize', 'text.fillColor',
    'text.strokeColor', 'text.strokeWidth'
];

// After Effects プロパティ
const AE_PROPERTIES = [
    'time', 'index', 'value', 'velocity', 'speed',
    'position', 'anchorPoint', 'scale', 'rotation', 'opacity',
    'width', 'height', 'comp', 'layer', 'effect',
    'inPoint', 'outPoint', 'startTime', 'duration',
    'hasParent', 'parent', 'name', 'source'
];

// エクスプレッションテンプレート
const EXPRESSION_TEMPLATES = {
    wiggle: {
        name: 'Wiggle（揺れ）',
        code: 'wiggle(2, 50)',
        description: 'ランダムな揺れを追加'
    },
    bounce: {
        name: 'Bounce（バウンス）',
        code: `freq = 2.5;
decay = 6;
n = 0;
if (numKeys > 0){
    n = nearestKey(time).index;
    if (key(n).time > time) n--;
}
if (n == 0){
    t = 0;
} else {
    t = time - key(n).time;
}

if (n > 0 && t < 1){
    v = velocityAtTime(key(n).time - thisComp.frameDuration/10);
    amp = .5;
    w = freq*Math.PI*2;
    value + v*amp*Math.sin(w*t)/Math.exp(decay*t)/w;
} else {
    value;
}`,
        description: 'キーフレーム後のバウンス効果'
    },
    loop: {
        name: 'Loop（ループ）',
        code: 'loopOut("cycle")',
        description: 'アニメーションをループ'
    },
    scale_from_center: {
        name: 'Scale from Center',
        code: `s = thisComp.layer("コントロールレイヤー").effect("スライダー制御")("スライダー");
[s, s]`,
        description: '中心からのスケール制御'
    },
    time_remap: {
        name: 'Time Remap',
        code: 'linear(time, inPoint, outPoint, 0, 1) * (outPoint - inPoint) + inPoint',
        description: 'タイムリマップ制御'
    },
    text_counter: {
        name: 'Text Counter',
        code: 'Math.floor(linear(time, 0, 3, 0, 100))',
        description: 'カウンター表示'
    },
    random_position: {
        name: 'Random Position',
        code: `seedRandom(index, true);
x = random(0, thisComp.width);
y = random(0, thisComp.height);
[x, y]`,
        description: 'ランダム位置配置'
    },
    follow_path: {
        name: 'Follow Path',
        code: `path = thisComp.layer("パスレイヤー").content("シェイプ 1").content("パス 1").path;
t = linear(time, 0, 5, 0, 1);
path.pointOnPath(t)`,
        description: 'パスに沿った移動'
    }
};

// エクスプレッション検証
function validateExpressionSyntax(expression) {
    const errors = [];
    
    // 括弧の対応チェック
    const brackets = {
        '(': ')',
        '[': ']',
        '{': '}'
    };
    
    for (const [open, close] of Object.entries(brackets)) {
        const openCount = (expression.match(new RegExp(`\\${open}`, 'g')) || []).length;
        const closeCount = (expression.match(new RegExp(`\\${close}`, 'g')) || []).length;
        
        if (openCount !== closeCount) {
            errors.push(`${open}${close} の対応が取れていません`);
        }
    }
    
    // セミコロンチェック
    const lines = expression.split('\n');
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}')) {
            // 単一行の式やコメント行は除外
            if (!trimmed.startsWith('//') && !trimmed.startsWith('/*') && trimmed.indexOf('=') === -1) {
                // エラーとしては扱わず、警告程度に
            }
        }
    });
    
    // 使用禁止キーワード
    const forbiddenKeywords = ['eval', 'alert', 'confirm', 'prompt'];
    forbiddenKeywords.forEach(keyword => {
        if (expression.indexOf(keyword) !== -1) {
            errors.push(`使用できないキーワード: ${keyword}`);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// エクスプレッションフォーマット
function formatExpression(expression) {
    let formatted = expression;
    
    // 基本的なインデント
    let indent = 0;
    const lines = formatted.split('\n');
    const indentedLines = lines.map(line => {
        const trimmed = line.trim();
        
        if (trimmed.endsWith('{')) {
            const result = '  '.repeat(indent) + trimmed;
            indent++;
            return result;
        } else if (trimmed.startsWith('}')) {
            indent = Math.max(0, indent - 1);
            return '  '.repeat(indent) + trimmed;
        } else {
            return '  '.repeat(indent) + trimmed;
        }
    });
    
    return indentedLines.join('\n');
}

// エクスプレッション補完候補
function getCompletionSuggestions(context, position) {
    const suggestions = [];
    
    // 関数の補完
    AE_FUNCTIONS.forEach(func => {
        suggestions.push({
            label: func,
            kind: 'function',
            insertText: func.includes('(') ? func : func + '()',
            detail: 'After Effects Function',
            documentation: `After Effects標準関数: ${func}`
        });
    });
    
    // プロパティの補完
    AE_PROPERTIES.forEach(prop => {
        suggestions.push({
            label: prop,
            kind: 'property',
            insertText: prop,
            detail: 'After Effects Property',
            documentation: `After Effectsプロパティ: ${prop}`
        });
    });
    
    // テンプレートの補完
    Object.entries(EXPRESSION_TEMPLATES).forEach(([key, template]) => {
        suggestions.push({
            label: template.name,
            kind: 'snippet',
            insertText: template.code,
            detail: 'Expression Template',
            documentation: template.description
        });
    });
    
    return suggestions;
}

// エクスプレッション情報取得
function getExpressionInfo(expression) {
    const info = {
        functions: [],
        properties: [],
        variables: [],
        complexity: 'simple'
    };
    
    // 使用されている関数を検出
    AE_FUNCTIONS.forEach(func => {
        if (expression.indexOf(func) !== -1) {
            info.functions.push(func);
        }
    });
    
    // 使用されているプロパティを検出
    AE_PROPERTIES.forEach(prop => {
        if (expression.indexOf(prop) !== -1) {
            info.properties.push(prop);
        }
    });
    
    // 変数を検出
    const variableMatches = expression.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g);
    if (variableMatches) {
        info.variables = variableMatches.map(match => match.replace(/\s*=/, ''));
    }
    
    // 複雑さを判定
    const lineCount = expression.split('\n').length;
    const functionCount = info.functions.length;
    
    if (lineCount > 10 || functionCount > 5) {
        info.complexity = 'complex';
    } else if (lineCount > 3 || functionCount > 2) {
        info.complexity = 'medium';
    }
    
    return info;
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AE_FUNCTIONS,
        AE_PROPERTIES,
        EXPRESSION_TEMPLATES,
        validateExpressionSyntax,
        formatExpression,
        getCompletionSuggestions,
        getExpressionInfo
    };
}
