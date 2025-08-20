/**
 * Expression Control - Main JavaScript
 * CEP Extension UI Controller
 */

// グローバル変数
let csInterface;
let monacoEditor;
let currentProperties = [];
let selectedLayers = [];
let currentProperty = null;
let isDarkTheme = false;

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeCSInterface();
    initializeUI();
    initializeMonacoEditor();
    setupEventListeners();
    loadTheme();
});

// CSInterface初期化
function initializeCSInterface() {
    csInterface = new CSInterface();
    
    // ExtendScriptファイルのパスを設定
    const extensionRoot = csInterface.getSystemPath(SystemPath.EXTENSION);
    const jsxFile = extensionRoot + '/jsx/expressionControl.jsx';
    
    // ExtendScriptをロード
    csInterface.evalScript(`$.evalFile("${jsxFile}")`, function(result) {
        if (result === 'undefined' || result === '') {
            showNotification('ExtendScriptが正常にロードされました', 'success');
        } else {
            console.log('ExtendScript load result:', result);
        }
    });
}

// UI初期化
function initializeUI() {
    // テーマ切り替えボタン
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', toggleTheme);
    
    // 更新ボタン
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', refreshAll);
    
    // レイヤースキャンボタン
    const scanLayersBtn = document.getElementById('scanLayersBtn');
    scanLayersBtn.addEventListener('click', scanSelectedLayers);
    
    // プロパティタブ
    const allPropsTab = document.getElementById('allPropsTab');
    const existingExprsTab = document.getElementById('existingExprsTab');
    
    allPropsTab.addEventListener('click', () => switchTab('all'));
    existingExprsTab.addEventListener('click', () => switchTab('existing'));
    
    // プロパティ選択
    const allPropsSelect = document.getElementById('allPropsSelect');
    const existingExprsSelect = document.getElementById('existingExprsSelect');
    
    allPropsSelect.addEventListener('change', onPropertySelected);
    existingExprsSelect.addEventListener('change', onPropertySelected);
    
    // エディターアクション
    const formatBtn = document.getElementById('formatBtn');
    const validateBtn = document.getElementById('validateBtn');
    const clearBtn = document.getElementById('clearBtn');
    const applyBtn = document.getElementById('applyBtn');
    
    formatBtn.addEventListener('click', formatExpression);
    validateBtn.addEventListener('click', validateExpression);
    clearBtn.addEventListener('click', clearExpression);
    applyBtn.addEventListener('click', applyExpression);
    
    // 通知クローズ
    const notificationClose = document.querySelector('.notification-close');
    if (notificationClose) {
        notificationClose.addEventListener('click', hideNotification);
    }
}

// Monaco Editor初期化
function initializeMonacoEditor() {
    require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.45.0/min/vs' } });
    
    require(['vs/editor/editor.main'], function() {
        // After Effects Expression言語の定義
        monaco.languages.register({ id: 'ae-expression' });
        
        // シンタックスハイライト設定
        monaco.languages.setMonarchTokensProvider('ae-expression', {
            tokenizer: {
                root: [
                    [/\b(if|else|for|while|function|var|return|true|false|null|undefined)\b/, 'keyword'],
                    [/\b(Math|time|index|value|thisComp|thisLayer|effect|text|sourceText)\b/, 'type'],
                    [/\b(linear|ease|easeIn|easeOut|random|noise|wiggle|loopIn|loopOut)\b/, 'function'],
                    [/\/\/.*$/, 'comment'],
                    [/\/\*[\s\S]*?\*\//, 'comment'],
                    [/"([^"\\]|\\.)*$/, 'string.invalid'],
                    [/"([^"\\]|\\.)*"/, 'string'],
                    [/'([^'\\]|\\.)*$/, 'string.invalid'],
                    [/'([^'\\]|\\.)*'/, 'string'],
                    [/\d+(\.\d+)?/, 'number'],
                    [/[{}()\[\]]/, 'delimiter.bracket'],
                    [/[<>]=?|[!=]=?|&&|\|\||[+\-*/%]/, 'operator']
                ]
            }
        });
        
        // オートコンプリート設定
        monaco.languages.registerCompletionItemProvider('ae-expression', {
            provideCompletionItems: function(model, position) {
                const suggestions = [
                    {
                        label: 'wiggle',
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: 'wiggle(${1:freq}, ${2:amp})',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'ランダムな揺れを生成'
                    },
                    {
                        label: 'linear',
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: 'linear(${1:t}, ${2:tMin}, ${3:tMax}, ${4:value1}, ${5:value2})',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: '線形補間'
                    },
                    {
                        label: 'ease',
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: 'ease(${1:t}, ${2:tMin}, ${3:tMax}, ${4:value1}, ${5:value2})',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'イージング補間'
                    },
                    {
                        label: 'time',
                        kind: monaco.languages.CompletionItemKind.Variable,
                        insertText: 'time',
                        documentation: '現在の時間（秒）'
                    },
                    {
                        label: 'value',
                        kind: monaco.languages.CompletionItemKind.Variable,
                        insertText: 'value',
                        documentation: 'プロパティの元の値'
                    },
                    {
                        label: 'index',
                        kind: monaco.languages.CompletionItemKind.Variable,
                        insertText: 'index',
                        documentation: 'レイヤーのインデックス'
                    }
                ];
                
                return { suggestions: suggestions };
            }
        });
        
        // エディター作成
        monacoEditor = monaco.editor.create(document.getElementById('monacoEditor'), {
            value: '// エクスプレッションをここに入力してください\n',
            language: 'ae-expression',
            theme: isDarkTheme ? 'vs-dark' : 'vs',
            fontSize: 12,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
            minimap: { enabled: false },
            wordWrap: 'on',
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3
        });
        
        // エディターイベント
        monacoEditor.onDidChangeModelContent(function() {
            updateStatusBar();
            checkApplyButtonState();
        });
        
        monacoEditor.onDidChangeCursorPosition(function() {
            updateStatusBar();
        });
        
        updateStatusBar();
    });
}

// イベントリスナー設定
function setupEventListeners() {
    // ウィンドウリサイズ
    window.addEventListener('resize', function() {
        if (monacoEditor) {
            monacoEditor.layout();
        }
    });
    
    // キーボードショートカット
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 's':
                    e.preventDefault();
                    applyExpression();
                    break;
                case 'f':
                    e.preventDefault();
                    formatExpression();
                    break;
                case 'r':
                    e.preventDefault();
                    refreshAll();
                    break;
            }
        }
    });
}

// テーマ切り替え
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
    
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.textContent = isDarkTheme ? '☀️' : '🌙';
    
    if (monacoEditor) {
        monaco.editor.setTheme(isDarkTheme ? 'vs-dark' : 'vs');
    }
    
    localStorage.setItem('expressionControlTheme', isDarkTheme ? 'dark' : 'light');
}

// テーマ読み込み
function loadTheme() {
    const savedTheme = localStorage.getItem('expressionControlTheme');
    if (savedTheme === 'dark') {
        toggleTheme();
    }
}

// 全体更新
function refreshAll() {
    showLoading(true);
    scanSelectedLayers();
}

// 選択レイヤーをスキャン
function scanSelectedLayers() {
    showLoading(true);
    
    csInterface.evalScript('ExpressionControlAPI.getSelectedLayers()', function(result) {
        try {
            const data = JSON.parse(result);
            
            if (data.error) {
                showNotification(data.error, 'error');
                showLoading(false);
                return;
            }
            
            selectedLayers = data.layers;
            updateLayerInfo(data);
            loadProperties();
            
        } catch (e) {
            showNotification('レイヤー情報の取得に失敗しました', 'error');
            showLoading(false);
        }
    });
}

// レイヤー情報更新
function updateLayerInfo(data) {
    const layerInfo = document.getElementById('layerInfo');
    if (data.count === 1) {
        layerInfo.innerHTML = `<span class="info-text">選択レイヤー: ${data.layers[0].name}</span>`;
    } else {
        layerInfo.innerHTML = `<span class="info-text">選択レイヤー: ${data.count}個のレイヤー</span>`;
    }
}

// プロパティ読み込み
function loadProperties() {
    if (selectedLayers.length === 0) {
        showLoading(false);
        return;
    }
    
    const layerIndices = selectedLayers.map(layer => layer.index);
    let scriptCall;
    
    if (layerIndices.length === 1) {
        scriptCall = `ExpressionControlAPI.listVisibleExpressionProps(${layerIndices[0]})`;
    } else {
        scriptCall = `ExpressionControlAPI.listCommonExpressionProps([${layerIndices.join(',')}])`;
    }
    
    csInterface.evalScript(scriptCall, function(result) {
        try {
            const data = JSON.parse(result);
            
            if (data.error) {
                showNotification(data.error, 'error');
                showLoading(false);
                return;
            }
            
            currentProperties = data.properties;
            updatePropertyLists();
            showLoading(false);
            showNotification(`${data.properties.length}個のプロパティを読み込みました`, 'success');
            
        } catch (e) {
            showNotification('プロパティ情報の取得に失敗しました', 'error');
            showLoading(false);
        }
    });
}

// プロパティリスト更新
function updatePropertyLists() {
    const allPropsSelect = document.getElementById('allPropsSelect');
    const existingExprsSelect = document.getElementById('existingExprsSelect');
    
    // 全プロパティリスト
    allPropsSelect.innerHTML = '';
    currentProperties.forEach((prop, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = prop.name;
        option.title = `値: ${prop.value}`;
        if (prop.hasExpression) {
            option.style.fontWeight = 'bold';
        }
        allPropsSelect.appendChild(option);
    });
    
    // 既存エクスプレッションリスト
    existingExprsSelect.innerHTML = '';
    const existingExpressions = currentProperties.filter(prop => prop.hasExpression);
    
    if (existingExpressions.length === 0) {
        const option = document.createElement('option');
        option.disabled = true;
        option.textContent = 'エクスプレッションが設定されているプロパティはありません';
        existingExprsSelect.appendChild(option);
    } else {
        existingExpressions.forEach((prop, index) => {
            const option = document.createElement('option');
            option.value = currentProperties.indexOf(prop);
            option.textContent = prop.name;
            option.title = `エクスプレッション: ${prop.expression.substring(0, 50)}...`;
            existingExprsSelect.appendChild(option);
        });
    }
}

// タブ切り替え
function switchTab(tab) {
    const allPropsTab = document.getElementById('allPropsTab');
    const existingExprsTab = document.getElementById('existingExprsTab');
    const allPropsPanel = document.getElementById('allPropsPanel');
    const existingExprsPanel = document.getElementById('existingExprsPanel');
    
    if (tab === 'all') {
        allPropsTab.classList.add('active');
        existingExprsTab.classList.remove('active');
        allPropsPanel.classList.add('active');
        existingExprsPanel.classList.remove('active');
    } else {
        allPropsTab.classList.remove('active');
        existingExprsTab.classList.add('active');
        allPropsPanel.classList.remove('active');
        existingExprsPanel.classList.add('active');
    }
}

// プロパティ選択時
function onPropertySelected(event) {
    const selectedIndex = parseInt(event.target.value);
    if (isNaN(selectedIndex) || !currentProperties[selectedIndex]) {
        return;
    }
    
    currentProperty = currentProperties[selectedIndex];
    
    if (monacoEditor) {
        monacoEditor.setValue(currentProperty.expression || '');
    }
    
    // 他のタブも同期
    const allPropsSelect = document.getElementById('allPropsSelect');
    const existingExprsSelect = document.getElementById('existingExprsSelect');
    
    if (event.target === allPropsSelect) {
        // 既存エクスプレッションタブで同じプロパティを選択
        for (let i = 0; i < existingExprsSelect.options.length; i++) {
            if (parseInt(existingExprsSelect.options[i].value) === selectedIndex) {
                existingExprsSelect.selectedIndex = i;
                break;
            }
        }
    } else {
        // 全プロパティタブで同じプロパティを選択
        for (let i = 0; i < allPropsSelect.options.length; i++) {
            if (parseInt(allPropsSelect.options[i].value) === selectedIndex) {
                allPropsSelect.selectedIndex = i;
                break;
            }
        }
    }
    
    checkApplyButtonState();
    updateStatusText(`プロパティ選択: ${currentProperty.name}`);
}

// エクスプレッションフォーマット
function formatExpression() {
    if (!monacoEditor) return;
    
    const value = monacoEditor.getValue();
    // 簡単なフォーマット処理
    const formatted = value
        .replace(/;/g, ';\n')
        .replace(/\{/g, '{\n')
        .replace(/\}/g, '\n}')
        .replace(/\n\s*\n/g, '\n');
    
    monacoEditor.setValue(formatted);
    showNotification('エクスプレッションをフォーマットしました', 'success');
}

// エクスプレッション検証
function validateExpression() {
    if (!monacoEditor) return;
    
    const expression = monacoEditor.getValue();
    
    csInterface.evalScript(`ExpressionControlAPI.validateExpression(${JSON.stringify(expression)})`, function(result) {
        try {
            const data = JSON.parse(result);
            
            if (data.success && data.valid) {
                showNotification('エクスプレッションは有効です', 'success');
            } else if (data.errors && data.errors.length > 0) {
                showNotification(`エラー: ${data.errors.join(', ')}`, 'error');
            }
            
        } catch (e) {
            showNotification('検証中にエラーが発生しました', 'error');
        }
    });
}

// エクスプレッションクリア
function clearExpression() {
    if (monacoEditor) {
        monacoEditor.setValue('');
        showNotification('エクスプレッションをクリアしました', 'success');
    }
}

// エクスプレッション適用
function applyExpression() {
    if (!currentProperty || !monacoEditor || selectedLayers.length === 0) {
        showNotification('プロパティまたはレイヤーが選択されていません', 'error');
        return;
    }
    
    const expression = monacoEditor.getValue();
    const layerIndices = selectedLayers.map(layer => layer.index);
    const propertyPath = currentProperty.path;
    
    showLoading(true);
    
    const scriptCall = `ExpressionControlAPI.applyExpression([${layerIndices.join(',')}], ${JSON.stringify(propertyPath)}, ${JSON.stringify(expression)})`;
    
    csInterface.evalScript(scriptCall, function(result) {
        try {
            const data = JSON.parse(result);
            
            if (data.success) {
                const successCount = data.results.filter(r => r.success).length;
                const errorCount = data.results.filter(r => !r.success).length;
                
                if (errorCount === 0) {
                    showNotification(`${successCount}個のレイヤーにエクスプレッションを適用しました`, 'success');
                } else {
                    showNotification(`${successCount}個成功、${errorCount}個エラー`, 'warning');
                }
                
                // プロパティリストを更新
                loadProperties();
            } else {
                showNotification('エクスプレッションの適用に失敗しました', 'error');
            }
            
        } catch (e) {
            showNotification('エクスプレッション適用中にエラーが発生しました', 'error');
        }
        
        showLoading(false);
    });
}

// ステータスバー更新
function updateStatusBar() {
    if (!monacoEditor) return;
    
    const position = monacoEditor.getPosition();
    const lineColumn = document.getElementById('lineColumn');
    lineColumn.textContent = `行: ${position.lineNumber}, 列: ${position.column}`;
}

// ステータステキスト更新
function updateStatusText(text) {
    const statusText = document.getElementById('statusText');
    statusText.textContent = text;
}

// 適用ボタン状態チェック
function checkApplyButtonState() {
    const applyBtn = document.getElementById('applyBtn');
    const hasProperty = currentProperty !== null;
    const hasLayers = selectedLayers.length > 0;
    
    applyBtn.disabled = !hasProperty || !hasLayers;
}

// ローディング表示制御
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

// 通知表示
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const text = notification.querySelector('.notification-text');
    
    text.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    // 自動で非表示
    setTimeout(() => {
        hideNotification();
    }, 3000);
}

// 通知非表示
function hideNotification() {
    const notification = document.getElementById('notification');
    notification.classList.add('hidden');
}
