/**
 * Expression Control - Simple Version with Monaco Editor
 */

// グローバル変数
let csInterface;
let monacoEditor;
let selectedLayers = [];
let allProperties = [];
let currentProperty = null;

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
    console.log('🚀 Initializing Expression Control...');
    initializeCSInterface();
    initializeMonacoEditor();
    setupEventListeners();
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
        if (result === 'undefined' || result === '') {
            updateStatus('ExtendScript loaded ✓');
        } else {
            console.error('ExtendScript error:', result);
            updateStatus('ExtendScript error');
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

        // オートコンプリート
        monaco.languages.registerCompletionItemProvider('ae-expression', {
            provideCompletionItems: function (model, position) {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };

                const suggestions = [
                    {
                        label: 'wiggle',
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: 'wiggle(${1:freq}, ${2:amp})',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'ランダムな揺れを生成',
                        range: range
                    },
                    {
                        label: 'thisComp',
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: 'thisComp',
                        documentation: '現在のコンポジション',
                        range: range
                    },
                    {
                        label: 'thisLayer',
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: 'thisLayer',
                        documentation: '現在のレイヤー',
                        range: range
                    },
                    {
                        label: 'time',
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: 'time',
                        documentation: '現在の時間（秒）',
                        range: range
                    },
                    {
                        label: 'value',
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: 'value',
                        documentation: 'プロパティの元の値',
                        range: range
                    }
                ];

                return { suggestions: suggestions };
            }
        });

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
        updateStatus('Monaco Editor ready ✓');
    });
}

// イベントリスナー設定
function setupEventListeners() {
    const thisLayersBtn = document.getElementById('thisLayersBtn');
    const propertySelect = document.getElementById('propertySelect');
    const applyBtn = document.getElementById('applyBtn');

    if (thisLayersBtn) {
        thisLayersBtn.addEventListener('click', refreshLayers);
    }

    if (propertySelect) {
        propertySelect.addEventListener('change', onPropertySelected);
    }

    if (applyBtn) {
        applyBtn.addEventListener('click', applyExpression);
    }
}

// レイヤースキャン
function refreshLayers() {
    console.log('🔍 Scanning layers...');
    updateStatus('レイヤー情報を取得中...');

    const layerInfo = document.getElementById('layerInfo');
    layerInfo.textContent = '🔄 レイヤー情報を更新中...';

    // まずコンポジションがアクティブか確認
    csInterface.evalScript('app.project.activeItem ? "OK" : "NO_COMP"', function (testResult) {
        console.log('Comp check:', testResult);

        if (testResult === 'NO_COMP') {
            layerInfo.textContent = '❌ コンポジションがアクティブではありません';
            updateStatus('エラー: コンポジションなし');
            return;
        }

        // レイヤー情報を取得
        csInterface.evalScript('getSelectedLayers()', function (result) {
            console.log('getSelectedLayers result:', result);

            try {
                if (result.indexOf('ERROR:') === 0) {
                    const errorMsg = result.substring(6);
                    layerInfo.textContent = '❌ エラー: ' + errorMsg;
                    updateStatus('エラー: ' + errorMsg);
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
                        layerInfo.textContent = `✅ レイヤー: ${selectedLayers[0].name}`;
                    } else {
                        layerInfo.textContent = `✅ 選択レイヤー: ${count}個`;
                    }

                    // プロパティを読み込み
                    loadProperties();
                } else {
                    layerInfo.textContent = '❌ 予期しない結果形式';
                    updateStatus('エラー: 結果形式エラー');
                }
            } catch (e) {
                console.error('Parse error:', e);
                layerInfo.textContent = '❌ 解析エラー';
                updateStatus('エラー: 解析失敗');
            }
        });
    });
}

// プロパティ読み込み
function loadProperties() {
    if (selectedLayers.length === 0) return;

    console.log('📋 Loading properties...');
    updateStatus('プロパティを読み込み中...');

    if (selectedLayers.length === 1) {
        const layerIndex = selectedLayers[0].index;
        csInterface.evalScript(`listVisibleExpressionProps(${layerIndex})`, function (result) {
            handlePropertiesResult(result);
        });
    } else {
        const layerIndices = selectedLayers.map(l => l.index).join(',');
        csInterface.evalScript(`listCommonExpressionProps([${layerIndices}])`, function (result) {
            handlePropertiesResult(result);
        });
    }
}

// プロパティ結果処理
function handlePropertiesResult(result) {
    console.log('Properties result:', result);

    if (result.indexOf('ERROR:') === 0) {
        updateStatus('エラー: ' + result.substring(6));
        return;
    }

    if (result.indexOf('SUCCESS:') === 0) {
        const parts = result.split('|');
        allProperties = [];

        let startIndex = 1;
        if (parts[1] && parts[1].indexOf('DEBUG:') === 0) {
            startIndex = 2;
        }

        for (let i = startIndex; i < parts.length; i += 2) {
            if (i + 1 < parts.length &&
                parts[i].indexOf('PROP:') === 0 &&
                parts[i + 1].indexOf('EXPR:') === 0) {

                const propName = parts[i].substring(5);
                const hasExpression = parts[i + 1].substring(5) === '1';

                allProperties.push({
                    name: propName,
                    hasExpression: hasExpression,
                    layerIndex: selectedLayers.length === 1 ? selectedLayers[0].index : -1
                });
            }
        }

        console.log('Parsed properties:', allProperties.length);
        updatePropertyList();
        updateStatus(`${allProperties.length}個のプロパティを読み込みました`);
    }
}

// プロパティリスト更新
function updatePropertyList() {
    const propertySelect = document.getElementById('propertySelect');
    if (!propertySelect) return;

    propertySelect.innerHTML = '';

    if (allProperties.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'プロパティが見つかりません';
        option.disabled = true;
        propertySelect.appendChild(option);
        return;
    }

    allProperties.forEach(prop => {
        const option = document.createElement('option');
        option.value = prop.name;
        option.textContent = prop.name + (prop.hasExpression ? ' ⚡' : '');
        option.dataset.property = JSON.stringify(prop);
        propertySelect.appendChild(option);
    });
}

// プロパティ選択時
function onPropertySelected(event) {
    const selectedOption = event.target.selectedOptions[0];
    if (!selectedOption || !selectedOption.dataset.property) return;

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
                updateStatus('エクスプレッションを読み込みました');
            }
        });
    } else {
        if (monacoEditor) {
            monacoEditor.setValue('// エクスプレッションを入力\nvalue');
        }
    }
}

// エクスプレッション適用
function applyExpression() {
    if (!currentProperty) {
        alert('プロパティが選択されていません');
        return;
    }

    if (selectedLayers.length === 0) {
        alert('レイヤーが選択されていません');
        return;
    }

    const expression = monacoEditor ? monacoEditor.getValue() : '';
    if (!expression.trim()) {
        alert('エクスプレッションが空です');
        return;
    }

    console.log('🚀 Applying expression...');
    updateStatus('エクスプレッションを適用中...');

    // JSON文字列をエスケープ
    const escapedExpression = JSON.stringify(expression);
    const layerIndices = selectedLayers.map(l => l.index).join(',');

    csInterface.evalScript(
        `applyExpressionToLayers([${layerIndices}], "${currentProperty.name}", ${escapedExpression})`,
        function (result) {
            console.log('Apply result:', result);

            try {
                const data = JSON.parse(result);
                if (data.success) {
                    alert(`✅ ${data.count}個のレイヤーに適用しました`);
                    updateStatus(`適用完了: ${data.count}個のレイヤー`);
                    // プロパティリストを更新
                    loadProperties();
                } else {
                    alert('❌ 適用失敗: ' + (data.error || '不明なエラー'));
                    updateStatus('適用失敗');
                }
            } catch (e) {
                console.error('Parse error:', e);
                alert('❌ 適用に失敗しました');
                updateStatus('適用失敗');
            }
        }
    );
}

// ステータス更新
function updateStatus(message) {
    const statusText = document.getElementById('statusText');
    if (statusText) {
        statusText.textContent = message;
    }
    console.log('Status:', message);
}

console.log('📝 Expression Control loaded');
