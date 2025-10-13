/**
 * Expression Control - Simple Version with Monaco Editor
 */

// グローバル変数
let csInterface;
let monacoEditor;
let selectedLayers = [];
let allProperties = [];
let currentProperty = null;

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
    console.log('Setting up event listeners...');

    const thisLayersBtn = document.getElementById('thisLayersBtn');
    const applyBtn = document.getElementById('applyBtn');
    const customSelectButton = document.getElementById('customSelectButton');
    const customSelectDropdown = document.getElementById('customSelectDropdown');
    const propertySearchInput = document.getElementById('propertySearchInput');

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
}

// レイヤースキャン
function refreshLayers() {
    console.log('🔍 Scanning layers...');
    showDebug('🔍 refreshLayers() が呼ばれました');
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
    console.log('Selected layers:', selectedLayers);
    updateStatus('プロパティを読み込み中...');

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
        updateStatus('エラー: JSX から結果が返されませんでした');
        return;
    }

    if (result.indexOf('ERROR:') === 0) {
        const errorMsg = result.substring(6);
        console.error('❌ JSX Error:', errorMsg);
        updateStatus('エラー: ' + errorMsg);
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
        showDebug(`📋 ${allProperties.length}個のプロパティを解析しました`);
        updatePropertyList();
        updateStatus(`${allProperties.length}個のプロパティを読み込みました`);
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

    // ボタンのテキストを更新
    const button = document.getElementById('customSelectButton');
    if (currentProperty.hasExpression) {
        button.textContent = '● ' + currentProperty.name;
    } else {
        button.textContent = currentProperty.name;
    }
    button.title = currentProperty.name + (currentProperty.hasExpression ? ' (エクスプレッション記入済み)' : '');

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

// プロパティリスト更新
function updatePropertyList() {
    const optionsContainer = document.getElementById('customSelectOptions');
    if (!optionsContainer) return;

    optionsContainer.innerHTML = '';

    if (allProperties.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'custom-select-option disabled';
        emptyDiv.textContent = 'プロパティが見つかりません';
        optionsContainer.appendChild(emptyDiv);
        return;
    }

    allProperties.forEach(prop => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'custom-select-option';

        // エクスプレッション記入済みの場合、クラスとアイコンを追加
        if (prop.hasExpression) {
            optionDiv.classList.add('has-expression');
            optionDiv.textContent = '● ' + prop.name;
        } else {
            optionDiv.textContent = prop.name;
        }

        optionDiv.title = prop.name + (prop.hasExpression ? ' (エクスプレッション記入済み)' : '');
        optionDiv.dataset.propertyName = prop.name;
        optionDiv.dataset.property = JSON.stringify(prop);

        optionDiv.addEventListener('click', function () {
            selectCustomProperty(JSON.parse(this.dataset.property));
        });

        optionsContainer.appendChild(optionDiv);
    });

    // ボタンのテキストをリセット
    const button = document.getElementById('customSelectButton');
    button.textContent = 'プロパティを選択...';
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
    console.log('  Expression:', expression);
    console.log('  Property:', currentProperty.name);
    console.log('  Layers:', selectedLayers.map(l => l.index));
    updateStatus('エクスプレッションを適用中...');

    // まず、applyExpressionToLayers関数が定義されているか確認
    csInterface.evalScript('typeof applyExpressionToLayers', function (typeResult) {
        console.log('🔍 Pre-apply check - applyExpressionToLayers type:', typeResult);

        if (typeResult !== 'function') {
            console.error('❌ applyExpressionToLayers is not defined!');
            alert('❌ JSX関数が見つかりません。After Effectsを再起動してください。');
            updateStatus('JSX関数エラー');
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
                    // alert(`✅ ${data.count}個のレイヤーに適用しました`);  // 成功アラート（後で必要になるかもしれないのでコメントアウト）
                    updateStatus(`適用完了: ${data.count}個のレイヤー`);
                    console.log(`✅ ${data.count}個のレイヤーにエクスプレッションを適用しました`);
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
        });
    });
}

console.log('📝 Expression Control loaded');
