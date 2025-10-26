/**
 * ExprOne - Simple Version with Monaco Editor
 */

// グローバル変数
let csInterface;
let monacoEditor;
let selectedLayers = [];
let allProperties = [];
let currentProperty = null;
let projectInfo = {
    compositions: [],
    compLayers: {},  // コンポジションごとのレイヤー情報 { "comp名": ["layer1", "layer2", ...] }
    effects: []
};

// デバッグ情報表示（画面上に表示） - 先に定義
// ※必要に応じてコメント解除してください
function showDebug(message) {
    // const debugInfo = document.getElementById('debugInfo');
    // if (debugInfo) {
    //     const time = new Date().toLocaleTimeString();
    //     debugInfo.innerHTML = `[${time}] ${message}<br>` + debugInfo.innerHTML;
    // }
    console.log('DEBUG:', message);  // コンソールには引き続き出力
}

// ステータス更新
function updateStatus(message) {
    const statusText = document.getElementById('statusText');
    if (statusText) {
        statusText.textContent = message;
    }
    console.log('Status:', message);
}

// Monaco Editor の loader.js を動的に読み込む
function loadMonacoLoader() {
    console.log('📦 Loading Monaco loader.js...');
    showDebug('📦 Monaco Editor を読み込み中...');

    // Node.jsのrequireを一時的に退避して別名で保存
    if (typeof window.require !== 'undefined') {
        console.log('💾 Saving Node.js require as nodeRequire');
        window.nodeRequire = window.require;
        delete window.require;  // 完全に削除
        delete window.module;   // moduleも削除（AMDとの競合を防ぐ）
    }

    var script = document.createElement('script');
    script.src = './lib/vs/loader.js';
    script.async = false;  // 同期的に読み込む

    script.onload = function () {
        console.log('✅ loader.js script loaded');

        // onloadの直後にrequireをチェック（setTimeoutなし）
        console.log('🔍 Immediate require check:');
        console.log('  typeof window.require:', typeof window.require);
        console.log('  window.require:', window.require);

        // requireが定義されているかチェック
        if (typeof window.require !== 'undefined' && window.require) {
            console.log('  typeof window.require.config:', typeof window.require.config);

            if (typeof window.require.config === 'function') {
                console.log('✅ Monaco require.config is available!');
                showDebug('✅ Monaco Loader 読み込み完了');

                // Monaco requireを保存
                window.monacoRequire = window.require;

                initializeMonacoEditor();
            } else {
                console.error('❌ require exists but config is not a function');
                console.error('  window.require:', window.require);
                showDebug('❌ require.config が見つかりません');
            }
        } else {
            console.error('❌ window.require is not defined after loading loader.js');
            showDebug('❌ Monaco Loader の読み込みに失敗');

            // フォールバック: グローバルスコープを確認
            console.log('🔍 Checking global scope...');
            console.log('  window keys:', Object.keys(window).filter(k => k.includes('require') || k.includes('define')));
        }
    };
    script.onerror = function (error) {
        console.error('❌ Failed to load loader.js:', error);
        showDebug('❌ loader.js の読み込みに失敗しました');

        // Node.jsのrequireを復元
        if (window.nodeRequire) {
            window.require = window.nodeRequire;
        }
    };

    document.head.appendChild(script);
    console.log('📝 loader.js script tag added to document');
}

// AE Expression Completion Lists (organized by category)
const aeKeywords = [
    { label: 'thisComp', doc: 'Current composition' },
    { label: 'thisLayer', doc: 'Current layer' },
    { label: 'thisProperty', doc: 'Current property' },
    // { label: 'time', doc: 'Current time in seconds' },
    { label: 'time*', doc: 'Current time in seconds (asterisk for multiplication)' },
    { label: 'value', doc: 'Original property value' },
    { label: 'index', doc: 'Layer index' },
    { label: 'colorDepth', doc: 'Bit depth of composition' },
    { label: 'posterizeTime', doc: 'Lock time to specific frame rate' }
];

const aeInterpolation = [
    { label: 'linear', params: '${1:t}, ${2:value1}, ${3:value2}', doc: 'Linear interpolation' },
    { label: 'ease', params: '${1:t}, ${2:value1}, ${3:value2}', doc: 'Ease interpolation' },
    { label: 'easeIn', params: '${1:t}, ${2:value1}, ${3:value2}', doc: 'Ease-in interpolation' },
    { label: 'easeOut', params: '${1:t}, ${2:value1}, ${3:value2}', doc: 'Ease-out interpolation' }
];

const aeRandom = [
    { label: 'random', params: '${1:maxValOrArray}', doc: 'Random number between 0 and max' },
    { label: 'gaussRandom', params: '${1:maxValOrArray}', doc: 'Gaussian random distribution' },
    { label: 'noise', params: '${1:valOrArray}', doc: 'Noise function' },
    { label: 'seedRandom', params: '${1:seed}, ${2:timeless}', doc: 'Set random seed' }
];

const aeLoop = [
    { label: 'loopIn', params: '"${1:type}", ${2:numKeyframes}', doc: 'Loop keyframes before current time. Types: cycle, pingpong, offset, continue' },
    { label: 'loopOut', params: '"${1:type}", ${2:numKeyframes}', doc: 'Loop keyframes after current time' },
    { label: 'loopInDuration', params: '"${1:type}", ${2:duration}', doc: 'Loop duration before current time' },
    { label: 'loopOutDuration', params: '"${1:type}", ${2:duration}', doc: 'Loop duration after current time' }
];

const aeTime = [
    { label: 'valueAtTime', params: '${1:t}', doc: 'Value at specified time' },
    { label: 'velocityAtTime', params: '${1:t}', doc: 'Velocity at specified time' },
    { label: 'speedAtTime', params: '${1:t}', doc: 'Speed at specified time' },
    { label: 'timeToFrames', params: '${1:t}, ${2:fps}', doc: 'Convert time to frame number' },
    { label: 'framesToTime', params: '${1:frames}, ${2:fps}', doc: 'Convert frame number to time' },
    { label: 'timeToTimecode', params: '${1:t}, ${2:timecodeBase}, ${3:isDuration}', doc: 'Convert time to timecode string' }
];

const aeKeyframe = [
    { label: 'key', params: '${1:index}', doc: 'Get keyframe by index' },
    { label: 'nearestKey', params: '${1:t}', doc: 'Get nearest keyframe to time' },
    { label: 'numKeys', params: '', doc: 'Number of keyframes' }
];

const aeVectorMath = [
    { label: 'add', params: '${1:vec1}, ${2:vec2}', doc: 'Add two vectors' },
    { label: 'sub', params: '${1:vec1}, ${2:vec2}', doc: 'Subtract vectors' },
    { label: 'mul', params: '${1:vec}, ${2:amount}', doc: 'Multiply vector' },
    { label: 'div', params: '${1:vec}, ${2:amount}', doc: 'Divide vector' },
    { label: 'clamp', params: '${1:value}, ${2:min}, ${3:max}', doc: 'Clamp value between min and max' },
    { label: 'dot', params: '${1:vec1}, ${2:vec2}', doc: 'Dot product of vectors' },
    { label: 'cross', params: '${1:vec1}, ${2:vec2}', doc: 'Cross product of vectors' },
    { label: 'normalize', params: '${1:vec}', doc: 'Normalize vector' },
    { label: 'length', params: '${1:vec}', doc: 'Length of vector' },
    { label: 'length', params: '${1:point1}, ${2:point2}', doc: 'Distance between two points' },
    { label: 'lookAt', params: '${1:fromPoint}, ${2:atPoint}', doc: 'Calculate rotation to look at point' }
];

const aeColor = [
    { label: 'rgbToHsl', params: '${1:rgbaArray}', doc: 'Convert RGB to HSL' },
    { label: 'hslToRgb', params: '${1:hslaArray}', doc: 'Convert HSL to RGB' },
    { label: 'hexToRgb', params: '"${1:hexString}"', doc: 'Convert hex color to RGB' }
];

const aeMath = [
    { label: 'Math.abs', params: '${1:value}', doc: 'Absolute value' },
    { label: 'Math.sin', params: '${1:value}', doc: 'Sine' },
    { label: 'Math.cos', params: '${1:value}', doc: 'Cosine' },
    { label: 'Math.tan', params: '${1:value}', doc: 'Tangent' },
    { label: 'Math.asin', params: '${1:value}', doc: 'Arcsine' },
    { label: 'Math.acos', params: '${1:value}', doc: 'Arccosine' },
    { label: 'Math.atan', params: '${1:value}', doc: 'Arctangent' },
    { label: 'Math.atan2', params: '${1:y}, ${2:x}', doc: 'Angle from x-axis to point' },
    { label: 'Math.sqrt', params: '${1:value}', doc: 'Square root' },
    { label: 'Math.pow', params: '${1:base}, ${2:exponent}', doc: 'Power' },
    { label: 'Math.exp', params: '${1:value}', doc: 'e to the power' },
    { label: 'Math.log', params: '${1:value}', doc: 'Natural logarithm' },
    { label: 'Math.floor', params: '${1:value}', doc: 'Round down' },
    { label: 'Math.ceil', params: '${1:value}', doc: 'Round up' },
    { label: 'Math.round', params: '${1:value}', doc: 'Round to nearest integer' },
    { label: 'Math.min', params: '${1:val1}, ${2:val2}', doc: 'Minimum of values' },
    { label: 'Math.max', params: '${1:val1}, ${2:val2}', doc: 'Maximum of values' }
];

const aeAnimation = [
    { label: 'wiggle', params: '${1},${2}', doc: 'Random wiggle motion' },
    // { label: 'wiggle(', params: '${1:freq}, ${2:amp}', doc: 'Random wiggle motion' },
    { label: 'smooth', params: '${1:width}, ${2:samples}', doc: 'Smooth temporal variation' },
    { label: 'sourceRectAtTime', params: '${1:t}, ${2:includeExtents}', doc: 'Source rectangle at time' }
];

// Register completion provider for AE expressions
function registerCompletionProvider() {
    monaco.languages.registerCompletionItemProvider('ae-expression', {
        provideCompletionItems: function (model, position) {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn
            };

            const suggestions = [];

            // カーソル位置の前のテキストを取得してコンテキストを解析
            const textBeforeCursor = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            });

            console.log('Text before cursor:', textBeforeCursor);

            // comp("コンプ名").lay のパターンをチェック (layer の途中でもマッチ)
            const compLayerPattern = /comp\(["']([^"']+)["']\)\.l/;
            const compMatch = textBeforeCursor.match(compLayerPattern);

            if (compMatch) {
                // comp("test").lay のコンテキスト: 該当するコンプのレイヤーのみを補完
                const compName = compMatch[1];
                console.log('Detected comp().layer context for:', compName);

                if (projectInfo.compLayers[compName]) {
                    projectInfo.compLayers[compName].forEach(layer => {
                        suggestions.push({
                            label: `layer("${layer}")`,
                            kind: monaco.languages.CompletionItemKind.Reference,
                            insertText: `layer("${layer}")`,
                            documentation: `Layer in ${compName}: ${layer}`,
                            range: range
                        });
                    });
                }

                return { suggestions: suggestions };
            }

            // 通常のコンテキスト: すべての補完候補を表示

            // Add keywords
            aeKeywords.forEach(item => {
                suggestions.push({
                    label: item.label,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: item.label,
                    documentation: item.doc,
                    range: range
                });
            });

            // Helper function to add function completions
            function addFunctions(list) {
                list.forEach(item => {
                    suggestions.push({
                        label: item.label,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: item.params ? `${item.label}(${item.params})` : `${item.label}()`,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: item.doc,
                        range: range
                    });
                });
            }

            // Add all function categories
            addFunctions(aeInterpolation);
            addFunctions(aeRandom);
            addFunctions(aeLoop);
            addFunctions(aeTime);
            addFunctions(aeKeyframe);
            addFunctions(aeVectorMath);
            addFunctions(aeColor);
            addFunctions(aeMath);
            addFunctions(aeAnimation);

            // Dynamic suggestions: Compositions
            projectInfo.compositions.forEach(comp => {
                suggestions.push({
                    label: `comp("${comp}")`,
                    kind: monaco.languages.CompletionItemKind.Reference,
                    insertText: `comp("${comp}")`,
                    documentation: `Composition: ${comp}`,
                    range: range
                });
            });

            // Dynamic suggestions: Effects
            projectInfo.effects.forEach(effect => {
                suggestions.push({
                    label: `effect("${effect}")`,
                    kind: monaco.languages.CompletionItemKind.Reference,
                    insertText: `effect("${effect}")`,
                    documentation: `Effect: ${effect}`,
                    range: range
                });
            });

            return { suggestions: suggestions };
        }
    });
}

// Monaco Environment設定（ローカル Blob Worker）
window.MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
        // 拡張機能のルートパスを取得
        const extensionPath = window.location.href.replace(/\/[^\/]*$/, '');

        // Workerファイルのパスを構築
        let workerPath;
        if (label === 'typescript' || label === 'javascript') {
            workerPath = extensionPath + '/lib/vs/language/typescript/ts.worker.js';
        } else {
            workerPath = extensionPath + '/lib/vs/editor/editor.worker.js';
        }

        // Blob URLで返す（file://プロトコルでWorkerを動作させるため）
        return URL.createObjectURL(new Blob([`
            self.MonacoEnvironment = { baseUrl: '${extensionPath}/lib/vs/' };
            importScripts('${workerPath}');
        `], { type: 'text/javascript' }));
    }
};

// 初期化
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Initializing ExprOne...');
    console.log('DOM is ready');

    // デバッグ: ボタンの存在確認
    const testBtn = document.getElementById('thisLayersBtn');
    console.log('Button exists at init:', !!testBtn);

    initializeCSInterface();

    // Monaco Editor の loader.js を動的に読み込む
    loadMonacoLoader();

    console.log('About to setup event listeners...');
    setupEventListeners();
    console.log('Event listeners setup complete');
});

// CSInterface初期化
function initializeCSInterface() {
    csInterface = new CSInterface();

    // ExtendScriptファイルのパスを設定
    const extensionRoot = csInterface.getSystemPath(SystemPath.EXTENSION);
    const jsxFile = extensionRoot + '/jsx/expressionControl.jsx';

    console.log('Loading ExtendScript from:', jsxFile);

    // ExtendScriptをロード
    csInterface.evalScript(`$.evalFile("${jsxFile}")`, function (result) {
        console.log('ExtendScript load result:', result);
        showDebug(`📜 JSX読込結果: ${result || 'success'}`);

        if (result === 'undefined' || result === '') {
            updateStatus('ExtendScript loaded ✓');

            // テスト: 関数が定義されているか確認
            csInterface.evalScript('typeof getSelectedLayers', function (typeResult) {
                console.log('getSelectedLayers type:', typeResult);
                showDebug(`✅ getSelectedLayers: ${typeResult}`);

                if (typeResult !== 'function') {
                    showDebug('❌ JSX関数が定義されていません！');
                }
            });

            // applyExpressionToLayers関数の確認
            csInterface.evalScript('typeof applyExpressionToLayers', function (typeResult) {
                console.log('applyExpressionToLayers type:', typeResult);
                showDebug(`✅ applyExpressionToLayers: ${typeResult}`);

                if (typeResult !== 'function') {
                    showDebug('❌ applyExpressionToLayers が定義されていません！');
                }
            });
        } else {
            console.error('ExtendScript error:', result);
            updateStatus('ExtendScript error');
            showDebug(`❌ JSX読込エラー: ${result}`);
        }
    });
}

// Monaco Editor初期化
function initializeMonacoEditor() {
    // ローカルの Monaco Editor を使用
    require.config({ paths: { vs: './lib/vs' } });

    require(['vs/editor/editor.main'], function () {
        console.log('✅ Monaco Editor loaded');

        // After Effects Expression言語を登録
        monaco.languages.register({ id: 'ae-expression' });

        // シンタックスハイライト設定
        monaco.languages.setMonarchTokensProvider('ae-expression', {
            tokenizer: {
                root: [
                    // AE キーワード
                    [/\b(thisComp|thisLayer|thisProperty|time|value|index)\b/, 'keyword.ae'],
                    // AE 関数
                    [/\b(wiggle|linear|ease|easeIn|easeOut|loopIn|loopOut|random|clamp)\b/, 'function.ae'],
                    // AE プロパティ
                    [/\b(position|scale|rotation|opacity|anchorPoint)\b/, 'property.ae'],
                    // JS キーワード
                    [/\b(if|else|for|while|function|var|let|const|return)\b/, 'keyword.js'],
                    // コメント
                    [/\/\/.*$/, 'comment'],
                    // 文字列
                    [/"([^"\\]|\\.)*"/, 'string'],
                    [/'([^'\\]|\\.)*'/, 'string'],
                    // 数値
                    [/\d+(\.\d+)?/, 'number'],
                    // 演算子
                    [/[{}()\[\]]/, 'delimiter.bracket'],
                    [/[;,.]/, 'delimiter'],
                    [/[+\-*/%=!<>]/, 'operator']
                ]
            }
        });

        // カスタムテーマ
        monaco.editor.defineTheme('ae-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'keyword.ae', foreground: '4FC3F7', fontStyle: 'bold' },
                { token: 'function.ae', foreground: '81C784', fontStyle: 'bold' },
                { token: 'property.ae', foreground: 'FFB74D' },
                { token: 'keyword.js', foreground: 'BA68C8' },
                { token: 'comment', foreground: '757575', fontStyle: 'italic' },
                { token: 'string', foreground: 'FFD54F' },
                { token: 'number', foreground: 'AED581' }
            ],
            colors: {
                'editor.background': '#1e1e1e'
            }
        });

        // Register autocompletion provider
        registerCompletionProvider();

        // エディター作成
        monacoEditor = monaco.editor.create(document.getElementById('monacoEditor'), {
            value: '// After Effects Expression\nvalue',
            language: 'ae-expression',
            theme: 'ae-dark',
            fontSize: 13,
            lineNumbers: 'on',
            automaticLayout: true,
            minimap: { enabled: false },
            wordWrap: 'on',
            scrollBeyondLastLine: false
        });

        console.log('✅ Monaco Editor initialized');
        updateStatus('Ready');
    });
}

// イベントリスナー設定
function setupEventListeners() {
    console.log('Setting up event listeners...');

    const thisLayersBtn = document.getElementById('thisLayersBtn');
    const applyBtn = document.getElementById('applyBtn');
    const customSelectButton = document.getElementById('customSelectButton');
    const customSelectDropdown = document.getElementById('customSelectDropdown');
    const propertySearchInput = document.getElementById('propertySearchInput');
    const removeCurrentExpressionBtn = document.getElementById('removeCurrentExpressionBtn');
    const removeAllExpressionsBtn = document.getElementById('removeAllExpressionsBtn');

    console.log('thisLayersBtn:', thisLayersBtn);
    console.log('applyBtn:', applyBtn);
    console.log('customSelectButton:', customSelectButton);

    if (thisLayersBtn) {
        console.log('✅ Adding click listener to thisLayersBtn');
        thisLayersBtn.addEventListener('click', function () {
            console.log('🖱️ thisLayersBtn clicked!');
            showDebug('🖱️ This Layer(s) ボタンがクリックされました');
            refreshLayers();
        });
    } else {
        console.error('❌ thisLayersBtn not found!');
        showDebug('❌ This Layer(s) ボタンが見つかりません');
    }

    // カスタムドロップダウンのイベント
    if (customSelectButton) {
        customSelectButton.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleCustomDropdown();
        });
    }

    // 検索フィルター
    if (propertySearchInput) {
        propertySearchInput.addEventListener('input', function (e) {
            filterProperties(e.target.value);
        });
    }

    // ドロップダウン外をクリックで閉じる
    document.addEventListener('click', function (e) {
        if (customSelectDropdown && customSelectDropdown.style.display === 'block') {
            if (!customSelectDropdown.contains(e.target) && e.target !== customSelectButton) {
                closeCustomDropdown();
            }
        }
    });

    if (applyBtn) {
        applyBtn.addEventListener('click', applyExpression);
    }

    if (removeCurrentExpressionBtn) {
        removeCurrentExpressionBtn.addEventListener('click', removeCurrentExpression);
    }

    if (removeAllExpressionsBtn) {
        removeAllExpressionsBtn.addEventListener('click', removeAllExpressions);
    }
}

// レイヤースキャン
function refreshLayers() {
    console.log('🔍 Scanning layers...');
    showDebug('🔍 refreshLayers() called');
    updateStatus('Loading layer info...');

    const layerInfo = document.getElementById('layerInfo');
    layerInfo.textContent = '🔄 Updating layer info...';

    // Check if composition is active
    csInterface.evalScript('app.project.activeItem ? "OK" : "NO_COMP"', function (testResult) {
        console.log('Comp check:', testResult);

        if (testResult === 'NO_COMP') {
            layerInfo.textContent = '❌ No active composition';
            updateStatus('Error: No composition');
            return;
        }

        // レイヤー情報を取得
        csInterface.evalScript('getSelectedLayers()', function (result) {
            console.log('getSelectedLayers result:', result);

            try {
                if (result.indexOf('ERROR:') === 0) {
                    const errorMsg = result.substring(6);
                    layerInfo.textContent = '❌ Error: ' + errorMsg;
                    updateStatus('Error: ' + errorMsg);
                    return;
                }

                if (result.indexOf('SUCCESS:') === 0) {
                    const parts = result.split('|');
                    const count = parseInt(parts[0].substring(8));

                    selectedLayers = [];
                    for (let i = 1; i < parts.length; i++) {
                        const layerParts = parts[i].split(':');
                        if (layerParts.length >= 2) {
                            selectedLayers.push({
                                index: parseInt(layerParts[0]),
                                name: layerParts.slice(1).join(':')
                            });
                        }
                    }

                    if (count === 1) {
                        layerInfo.textContent = `✅ Layer: ${selectedLayers[0].name}`;
                    } else {
                        layerInfo.textContent = `✅ Selected layers: ${count} (showing common properties)`;
                    }

                    // Load properties
                    loadProperties();
                } else {
                    layerInfo.textContent = '❌ Unexpected result format';
                    updateStatus('Error: Invalid format');
                }
            } catch (e) {
                console.error('Parse error:', e);
                layerInfo.textContent = '❌ Parse error';
                updateStatus('Error: Parse failed');
            }
        });
    });
}

// Update project info for autocompletion
function updateProjectInfo() {
    csInterface.evalScript('getProjectInfo()', function (result) {
        console.log('Project info result:', result);

        if (result && result.indexOf('SUCCESS:') === 0) {
            const data = result.substring(8); // Remove "SUCCESS:"
            const parts = data.split('|');

            parts.forEach(part => {
                if (part.indexOf('COMPS:') === 0) {
                    const comps = part.substring(6);
                    projectInfo.compositions = comps ? comps.split(',').map(c => c.replace(/\\,/g, ',').replace(/\\\|/g, '|')) : [];
                } else if (part.indexOf('COMP_LAYERS:') === 0) {
                    const compLayersData = part.substring(12);
                    projectInfo.compLayers = {};

                    if (compLayersData) {
                        // コンポジションごとのデータを分割 (;; で区切られている)
                        const compEntries = compLayersData.split(';;');

                        compEntries.forEach(entry => {
                            if (entry) {
                                // コンプ名とレイヤーリストを分割 (:: で区切られている)
                                const separatorIndex = entry.indexOf('::');
                                if (separatorIndex !== -1) {
                                    const compName = entry.substring(0, separatorIndex)
                                        .replace(/\\,/g, ',')
                                        .replace(/\\\|/g, '|')
                                        .replace(/\\;/g, ';');

                                    const layersStr = entry.substring(separatorIndex + 2);
                                    const layers = layersStr ? layersStr.split(',').map(l =>
                                        l.replace(/\\,/g, ',')
                                         .replace(/\\\|/g, '|')
                                         .replace(/\\;/g, ';')
                                    ) : [];

                                    projectInfo.compLayers[compName] = layers;
                                }
                            }
                        });
                    }
                } else if (part.indexOf('EFFECTS:') === 0) {
                    const effects = part.substring(8);
                    projectInfo.effects = effects ? effects.split(',').map(e => e.replace(/\\,/g, ',').replace(/\\\|/g, '|')) : [];
                }
            });

            console.log('Project info updated:', projectInfo);
        }
    });
}

// Load properties
function loadProperties() {
    if (selectedLayers.length === 0) return;

    console.log('📋 Loading properties...');
    console.log('Selected layers:', selectedLayers);
    updateStatus('Loading properties...');

    // Update project info for autocompletion
    updateProjectInfo();

    if (selectedLayers.length === 1) {
        const layerIndex = selectedLayers[0].index;
        console.log('Calling listVisibleExpressionProps with index:', layerIndex);
        showDebug(`📞 JSX呼出: listVisibleExpressionProps(${layerIndex})`);
        csInterface.evalScript(`listVisibleExpressionProps(${layerIndex})`, function (result) {
            console.log('Raw result from listVisibleExpressionProps:', result);
            console.log('Result type:', typeof result);
            console.log('Result length:', result ? result.length : 'null');
            showDebug(`📥 JSX応答: ${result ? result.substring(0, 100) : 'null'}`);

            // 完全なデータをコンソールに出力
            console.log('=== FULL JSX RESPONSE ===');
            console.log(result);
            console.log('=== END ===');

            handlePropertiesResult(result);
        });
    } else {
        const layerIndices = selectedLayers.map(l => l.index).join(',');
        console.log('Calling listCommonExpressionProps with indices:', layerIndices);
        showDebug(`📞 JSX呼出: listCommonExpressionProps([${layerIndices}])`);
        csInterface.evalScript(`listCommonExpressionProps([${layerIndices}])`, function (result) {
            console.log('Raw result from listCommonExpressionProps:', result);
            showDebug(`📥 JSX応答: ${result ? result.substring(0, 50) + '...' : 'null'}`);
            handlePropertiesResult(result);
        });
    }
}

// プロパティ結果処理
function handlePropertiesResult(result) {
    console.log('Properties result:', result);
    console.log('Result starts with ERROR:', result.indexOf('ERROR:') === 0);
    console.log('Result starts with SUCCESS:', result.indexOf('SUCCESS:') === 0);

    if (!result || result === 'undefined' || result === '') {
        console.error('❌ Empty or undefined result from JSX');
        updateStatus('Error: No result from JSX');
        return;
    }

    if (result.indexOf('ERROR:') === 0) {
        const errorMsg = result.substring(6);
        console.error('❌ JSX Error:', errorMsg);
        updateStatus('Error: ' + errorMsg);
        return;
    }

    if (result.indexOf('SUCCESS:') === 0) {
        console.log('✅ SUCCESS detected, parsing...');
        const parts = result.split('|');
        console.log('Split parts count:', parts.length);
        console.log('First 10 parts:', parts.slice(0, 10));
        allProperties = [];

        let startIndex = 1;
        if (parts[1] && parts[1].indexOf('DEBUG:') === 0) {
            console.log('DEBUG marker found, starting from index 2');
            startIndex = 2;
        }

        console.log('Starting to parse from index:', startIndex);

        for (let i = startIndex; i < parts.length; i += 2) {
            console.log(`Parsing index ${i}: "${parts[i]}" and ${i + 1}: "${parts[i + 1]}"`);

            if (i + 1 < parts.length &&
                parts[i].indexOf('PROP:') === 0 &&
                parts[i + 1].indexOf('EXPR:') === 0) {

                const propName = parts[i].substring(5);
                const hasExpression = parts[i + 1].substring(5) === '1';

                console.log(`✅ Found property: ${propName}, hasExpr: ${hasExpression}`);

                allProperties.push({
                    name: propName,
                    hasExpression: hasExpression,
                    layerIndex: selectedLayers.length === 1 ? selectedLayers[0].index : -1
                });
            } else {
                console.log(`❌ Skipping index ${i}, pattern mismatch`);
            }
        }

        console.log('Parsed properties:', allProperties.length);
        console.log('All properties:', allProperties);
        showDebug(`📋 Parsed ${allProperties.length} properties`);
        updatePropertyList();

        if (selectedLayers.length > 1) {
            updateStatus(`${allProperties.length} common properties loaded`);
        } else {
            updateStatus(`${allProperties.length} properties loaded`);
        }
    }
}

// カスタムドロップダウンの開閉
function toggleCustomDropdown() {
    const dropdown = document.getElementById('customSelectDropdown');
    if (dropdown.style.display === 'none') {
        dropdown.style.display = 'block';
        document.getElementById('propertySearchInput').value = '';
        filterProperties('');  // 検索をリセット
    } else {
        dropdown.style.display = 'none';
    }
}

function closeCustomDropdown() {
    const dropdown = document.getElementById('customSelectDropdown');
    dropdown.style.display = 'none';
}

// プロパティ検索フィルター
function filterProperties(searchText) {
    const options = document.querySelectorAll('.custom-select-option:not(.disabled)');
    const lowerSearch = searchText.toLowerCase();

    options.forEach(option => {
        const propName = option.dataset.propertyName || option.textContent;
        if (propName.toLowerCase().includes(lowerSearch)) {
            option.style.display = 'block';
        } else {
            option.style.display = 'none';
        }
    });
}

// カスタムドロップダウンでプロパティを選択
function selectCustomProperty(propertyData) {
    currentProperty = propertyData;
    console.log('Selected property:', currentProperty.name);

    // Update button text
    const button = document.getElementById('customSelectButton');
    if (currentProperty.hasExpression) {
        button.textContent = '● ' + currentProperty.name;
    } else {
        button.textContent = currentProperty.name;
    }
    button.title = currentProperty.name + (currentProperty.hasExpression ? ' (Expression applied)' : '');

    // 選択状態をハイライト
    document.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.target.classList.add('selected');

    // ドロップダウンを閉じる
    closeCustomDropdown();

    // 既存のエクスプレッションを読み込み
    if (currentProperty.hasExpression && currentProperty.layerIndex !== -1) {
        csInterface.evalScript(`getExpressionContent(${currentProperty.layerIndex}, "${currentProperty.name}")`, function (result) {
            console.log('Expression content result:', result);

            if (result.indexOf('SUCCESS:') === 0) {
                const expression = result.substring(8);
                if (monacoEditor && expression) {
                    monacoEditor.setValue(expression);
                }
            }
        });
    } else {
        if (monacoEditor) {
            monacoEditor.setValue('');
        }
    }
}

// Update property list
function updatePropertyList() {
    const optionsContainer = document.getElementById('customSelectOptions');
    if (!optionsContainer) return;

    optionsContainer.innerHTML = '';

    if (allProperties.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'custom-select-option disabled';
        emptyDiv.textContent = 'No properties found';
        optionsContainer.appendChild(emptyDiv);
        return;
    }

    allProperties.forEach(prop => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'custom-select-option';

        // Add class and icon for properties with expression
        if (prop.hasExpression) {
            optionDiv.classList.add('has-expression');
            optionDiv.textContent = '● ' + prop.name;
        } else {
            optionDiv.textContent = prop.name;
        }

        optionDiv.title = prop.name + (prop.hasExpression ? ' (Expression applied)' : '');
        optionDiv.dataset.propertyName = prop.name;
        optionDiv.dataset.property = JSON.stringify(prop);

        optionDiv.addEventListener('click', function () {
            selectCustomProperty(JSON.parse(this.dataset.property));
        });

        optionsContainer.appendChild(optionDiv);
    });

    // Reset button text
    const button = document.getElementById('customSelectButton');
    button.textContent = 'Select a property...';
}

// プロパティ選択時
function onPropertySelected(event) {
    const selectedOption = event.target.selectedOptions[0];

    // 空のオプション（「プロパティを選択...」）が選択された場合は何もしない
    if (!selectedOption || !selectedOption.value || !selectedOption.dataset.property) {
        currentProperty = null;
        if (window.editor) {
            window.editor.setValue('');  // エディタをクリア
        }
        return;
    }

    currentProperty = JSON.parse(selectedOption.dataset.property);
    console.log('Selected property:', currentProperty.name);

    // 既存のエクスプレッションを読み込み
    if (currentProperty.hasExpression && currentProperty.layerIndex !== -1) {
        csInterface.evalScript(`getExpressionContent(${currentProperty.layerIndex}, "${currentProperty.name}")`, function (result) {
            console.log('Expression content result:', result);

            if (result.indexOf('SUCCESS:') === 0) {
                const expression = result.substring(8);
                if (monacoEditor) {
                    monacoEditor.setValue(expression);
                }
                updateStatus('Expression loaded');
            }
        });
    } else {
        if (monacoEditor) {
            monacoEditor.setValue('// Enter expression\nvalue');
        }
    }
}

// Check for expression errors and display in Monaco Editor
function checkExpressionError() {
    if (!currentProperty || !monacoEditor) return;

    // Only check errors for single layer
    if (selectedLayers.length !== 1) return;

    const layerIndex = selectedLayers[0].index;
    const propertyName = currentProperty.name;

    console.log('🔍 Checking expression error for:', propertyName);

    csInterface.evalScript(`getExpressionError(${layerIndex}, "${propertyName}")`, function (result) {
        console.log('Expression error result:', result);

        if (!result || result.indexOf('ERROR:') === 0) {
            console.log('❌ Failed to get expression error');
            return;
        }

        if (result.indexOf('SUCCESS:') === 0) {
            const errorMsg = result.substring(8);

            if (errorMsg && errorMsg.trim() !== '') {
                console.log('⚠️ Expression error detected:', errorMsg);

                // Extract line number from error message
                // AE errors are in the format "Error at line X: message"
                let lineNumber = 1;
                const lineMatch = errorMsg.match(/line (\d+)/i);
                if (lineMatch) {
                    lineNumber = parseInt(lineMatch[1]);
                }

                // Simplify error message - extract only the essential error part
                // Pattern: "SyntaxError: ...", "ReferenceError: ...", "TypeError: ...", etc.
                let simplifiedError = errorMsg;
                const errorTypeMatch = errorMsg.match(/(SyntaxError|ReferenceError|TypeError|Error):\s*([^\n\\]+)/);
                if (errorTypeMatch) {
                    simplifiedError = `${errorTypeMatch[1]}: ${errorTypeMatch[2]}`;
                } else {
                    // Fallback: remove "Expression Disabled" and path information
                    simplifiedError = errorMsg
                        .replace(/Expression Disabled\\n/g, '')
                        .replace(/Error at line \d+ in property '[^']+' of layer \d+ \('[^']+'\) in comp '[^']+'\.\s*/g, '')
                        .replace(/\\n/g, ' ')
                        .trim();
                }

                // Remove all \n characters and extra whitespace
                simplifiedError = simplifiedError.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();

                console.log('📝 Simplified error:', simplifiedError);

                // Display error in Monaco Editor
                const model = monacoEditor.getModel();
                monaco.editor.setModelMarkers(model, 'ae-runtime', [{
                    startLineNumber: lineNumber,
                    startColumn: 1,
                    endLineNumber: lineNumber,
                    endColumn: model.getLineMaxColumn(lineNumber),
                    message: simplifiedError,
                    severity: monaco.MarkerSeverity.Error
                }]);

                updateStatus('⚠️ Expression error detected');
            } else {
                console.log('✅ No expression errors');

                // Clear error markers (only AE runtime errors)
                const model = monacoEditor.getModel();
                monaco.editor.setModelMarkers(model, 'ae-runtime', []);

                updateStatus('✅ Expression applied successfully');
            }
        }
    });
}

// Apply expression
function applyExpression() {
    if (!currentProperty) {
        alert('No property selected');
        return;
    }

    if (selectedLayers.length === 0) {
        alert('No layers selected');
        return;
    }

    const expression = monacoEditor ? monacoEditor.getValue() : '';
    if (!expression.trim()) {
        alert('Expression is empty');
        return;
    }

    console.log('🚀 Applying expression...');
    console.log('  Expression:', expression);
    console.log('  Property:', currentProperty.name);
    console.log('  Layers:', selectedLayers.map(l => l.index));
    updateStatus('Applying expression...');

    // Check if applyExpressionToLayers function is defined
    csInterface.evalScript('typeof applyExpressionToLayers', function (typeResult) {
        console.log('🔍 Pre-apply check - applyExpressionToLayers type:', typeResult);

        if (typeResult !== 'function') {
            console.error('❌ applyExpressionToLayers is not defined!');
            alert('❌ JSX function not found. Please restart After Effects.');
            updateStatus('JSX function error');
            return;
        }

        // エクスプレッション文字列をエスケープ（二重引用符とバックスラッシュをエスケープ）
        const escapedExpression = expression.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        const layerIndices = selectedLayers.map(l => l.index).join(',');
        const escapedPropertyName = currentProperty.name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

        const jsxCode = `applyExpressionToLayers([${layerIndices}], "${escapedPropertyName}", "${escapedExpression}")`;
        console.log('  JSX code:', jsxCode);

        csInterface.evalScript(jsxCode, function (result) {
            console.log('Apply result:', result);
            console.log('Apply result type:', typeof result);
            console.log('Apply result length:', result ? result.length : 0);

            try {
                const data = JSON.parse(result);
                if (data.success) {
                    // alert(`✅ Applied to ${data.count} layer(s)`);  // Success alert (commented out for cleaner UX)
                    updateStatus(`Applied to ${data.count} layer(s)`);
                    console.log(`✅ Expression applied to ${data.count} layer(s)`);
                    // Update property list
                    loadProperties();

                    // Check for expression errors after applying
                    setTimeout(() => {
                        checkExpressionError();
                    }, 500);  // Wait for AE to evaluate the expression
                } else {
                    alert('❌ Failed to apply: ' + (data.error || 'Unknown error'));
                    updateStatus('Apply failed');
                }
            } catch (e) {
                console.error('Parse error:', e);
                alert('❌ Failed to apply expression');
                updateStatus('Apply failed');
            }
        });
    });
}

// Remove current expression
function removeCurrentExpression() {
    if (!currentProperty) {
        alert('No property selected');
        return;
    }

    if (selectedLayers.length === 0) {
        alert('No layers selected');
        return;
    }

    if (!currentProperty.hasExpression) {
        alert('No expression found on this property');
        return;
    }

    console.log('🗑️ Removing current expression...');
    console.log('  Property:', currentProperty.name);
    console.log('  Layer:', selectedLayers[0].index);
    updateStatus('Removing expression...');

    const layerIndex = selectedLayers[0].index;
    const escapedPropertyName = currentProperty.name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    const jsxCode = `removeCurrentExpression(${layerIndex}, "${escapedPropertyName}")`;
    console.log('  JSX code:', jsxCode);

    csInterface.evalScript(jsxCode, function (result) {
        console.log('Remove result:', result);

        if (result.indexOf('SUCCESS:') === 0) {
            updateStatus('Expression removed');
            console.log('✅ Expression removed successfully');

            // Clear editor
            if (monacoEditor) {
                monacoEditor.setValue('');
            }

            // Refresh properties to update UI
            loadProperties();
        } else {
            const errorMsg = result.indexOf('ERROR:') === 0 ? result.substring(6) : 'Unknown error';
            alert('❌ Failed to remove expression: ' + errorMsg);
            updateStatus('Remove failed');
        }
    });
}

// Remove all expressions from selected layers
function removeAllExpressions() {
    if (selectedLayers.length === 0) {
        alert('No layers selected');
        return;
    }

    const confirmMsg = `Are you sure you want to remove ALL expressions from ${selectedLayers.length} layer(s)?\n\nThis action cannot be undone.`;
    if (!confirm(confirmMsg)) {
        return;
    }

    console.log('🗑️ Removing all expressions...');
    console.log('  Layers:', selectedLayers.map(l => l.index));
    updateStatus('Removing all expressions...');

    const layerIndices = selectedLayers.map(l => l.index).join(',');
    const jsxCode = `removeAllExpressions("${layerIndices}")`;
    console.log('  JSX code:', jsxCode);

    csInterface.evalScript(jsxCode, function (result) {
        console.log('Remove all result:', result);

        if (result.indexOf('SUCCESS:') === 0) {
            updateStatus('All expressions removed');
            console.log('✅ All expressions removed successfully');

            // Clear editor
            if (monacoEditor) {
                monacoEditor.setValue('');
            }

            // Refresh properties to update UI
            loadProperties();
        } else {
            const errorMsg = result.indexOf('ERROR:') === 0 ? result.substring(6) : 'Unknown error';
            alert('❌ Failed to remove expressions: ' + errorMsg);
            updateStatus('Remove failed');
        }
    });
}

console.log('📝 ExprOne loaded');
