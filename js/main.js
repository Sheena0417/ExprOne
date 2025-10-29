/**
 * ExprOne - Simple Version with Monaco Editor
 */

// Global variables
let csInterface;
let monacoEditor;
let selectedLayers = [];
let allProperties = [];
let currentProperty = null;
let projectInfo = {
    compositions: [],
    compLayers: {},  // Layer information per composition { "comp_name": ["layer1", "layer2", ...] }
    layerEffects: {},  // Effect information per layer { "comp_name::layer_name": ["effect1", "effect2", ...] }
    layerEffectProperties: {},  // Effect property information { "comp_name::layer_name::effect_name": ["prop1", "prop2", ...] }
    effects: []
};

// Debug information display (defined early)
// Uncomment if needed for debugging
function showDebug(message) {
    // const debugInfo = document.getElementById('debugInfo');
    // if (debugInfo) {
    //     const time = new Date().toLocaleTimeString();
    //     debugInfo.innerHTML = `[${time}] ${message}<br>` + debugInfo.innerHTML;
    // }
    console.log('DEBUG:', message);  // Continue logging to console
}

// Update status
function updateStatus(message) {
    const statusText = document.getElementById('statusText');
    if (statusText) {
        statusText.textContent = message;
    }
    console.log('Status:', message);
}

// Dynamically load Monaco Editor's loader.js
function loadMonacoLoader() {
    console.log('📦 Loading Monaco loader.js...');
    showDebug('📦 Loading Monaco Editor...');

    // Temporarily save Node.js require with a different name
    if (typeof window.require !== 'undefined') {
        console.log('💾 Saving Node.js require as nodeRequire');
        window.nodeRequire = window.require;
        delete window.require;  // Completely remove
        delete window.module;   // Also remove module (prevent AMD conflicts)
    }

    var script = document.createElement('script');
    script.src = './lib/vs/loader.js';
    script.async = false;  // Load synchronously

    script.onload = function () {
        console.log('✅ loader.js script loaded');

        // Check require immediately after onload (no setTimeout)
        console.log('🔍 Immediate require check:');
        console.log('  typeof window.require:', typeof window.require);
        console.log('  window.require:', window.require);

        // Check if require is defined
        if (typeof window.require !== 'undefined' && window.require) {
            console.log('  typeof window.require.config:', typeof window.require.config);

            if (typeof window.require.config === 'function') {
                console.log('✅ Monaco require.config is available!');
                showDebug('✅ Monaco Loader loaded successfully');

                // Save Monaco require
                window.monacoRequire = window.require;

                initializeMonacoEditor();
            } else {
                console.error('❌ require exists but config is not a function');
                console.error('  window.require:', window.require);
                showDebug('❌ require.config not found');
            }
        } else {
            console.error('❌ window.require is not defined after loading loader.js');
            showDebug('❌ Failed to load Monaco Loader');

            // Fallback: Check global scope
            console.log('🔍 Checking global scope...');
            console.log('  window keys:', Object.keys(window).filter(k => k.includes('require') || k.includes('define')));
        }
    };
    script.onerror = function (error) {
        console.error('❌ Failed to load loader.js:', error);
        showDebug('❌ Failed to load loader.js');

        // Restore Node.js require
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
        triggerCharacters: ['('],
        provideCompletionItems: function (model, position) {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn
            };

            const suggestions = [];

            // Get text before cursor position and analyze context
            const textBeforeCursor = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            });

            console.log('Text before cursor:', textBeforeCursor);

            // Check for comp("compName").layer("layerName").effect("effectName")( pattern (effect property completion)
            const compLayerEffectPropPattern = /comp\(["']([^"']+)["']\)\.layer\(["']([^"']+)["']\)\.effect\(["']([^"']+)["']\)\(/;
            const effectPropMatch = textBeforeCursor.match(compLayerEffectPropPattern);

            // Check for thisComp.layer("layerName").effect("effectName")( pattern (effect property completion)
            const thisCompLayerEffectPropPattern = /thisComp\.layer\(["']([^"']+)["']\)\.effect\(["']([^"']+)["']\)\(/;
            const thisCompEffectPropMatch = textBeforeCursor.match(thisCompLayerEffectPropPattern);

            // Check for direct effect("effectName")( pattern (effect property completion on selected layer)
            const directEffectPropPattern = /(?:^|[^.])effect\(["']([^"']+)["']\)\(/;
            const directEffectPropMatch = textBeforeCursor.match(directEffectPropPattern);

            // Check for comp("compName").layer("layerName").e pattern (effect completion)
            const compLayerEffectPattern = /comp\(["']([^"']+)["']\)\.layer\(["']([^"']+)["']\)\.e/;
            const effectMatch = textBeforeCursor.match(compLayerEffectPattern);

            // Check for thisComp.layer("layerName").e pattern (effect completion)
            const thisCompLayerEffectPattern = /thisComp\.layer\(["']([^"']+)["']\)\.e/;
            const thisCompEffectMatch = textBeforeCursor.match(thisCompLayerEffectPattern);

            // Check for comp("compName").lay pattern (matches partial "layer")
            const compLayerPattern = /comp\(["']([^"']+)["']\)\.l/;
            const compMatch = textBeforeCursor.match(compLayerPattern);

            // Also check for thisComp.lay pattern
            const thisCompLayerPattern = /thisComp\.l/;
            const thisCompMatch = textBeforeCursor.match(thisCompLayerPattern);

            if (effectPropMatch) {
                // comp("test").layer("test").effect("Color Control")( context: suggest properties from the effect
                const compName = effectPropMatch[1];
                const layerName = effectPropMatch[2];
                const effectName = effectPropMatch[3];
                const effectKey = compName + '::' + layerName + '::' + effectName;
                console.log('Detected comp().layer().effect() property context for:', effectKey);

                if (projectInfo.layerEffectProperties[effectKey]) {
                    projectInfo.layerEffectProperties[effectKey].forEach(prop => {
                        suggestions.push({
                            label: `"${prop}"`,
                            kind: monaco.languages.CompletionItemKind.Property,
                            insertText: `"${prop}")`,
                            documentation: `Property of ${effectName}: ${prop}`,
                            range: range
                        });
                    });
                }

                return { suggestions: suggestions };
            } else if (thisCompEffectPropMatch) {
                // thisComp.layer("test").effect("Color Control")( context: suggest properties from all matching effects
                const layerName = thisCompEffectPropMatch[1];
                const effectName = thisCompEffectPropMatch[2];
                console.log('Detected thisComp.layer().effect() property context for:', layerName, effectName);

                // Search all comps for this layer+effect combination and collect properties
                const allProps = new Set();
                Object.keys(projectInfo.layerEffectProperties).forEach(key => {
                    const parts = key.split('::');
                    if (parts.length === 3 && parts[1] === layerName && parts[2] === effectName) {
                        projectInfo.layerEffectProperties[key].forEach(prop => allProps.add(prop));
                    }
                });

                allProps.forEach(prop => {
                    suggestions.push({
                        label: `"${prop}"`,
                        kind: monaco.languages.CompletionItemKind.Property,
                        insertText: `"${prop}")`,
                        documentation: `Property of ${effectName}: ${prop}`,
                        range: range
                    });
                });

                return { suggestions: suggestions };
            } else if (directEffectPropMatch) {
                // effect("Color Control")( context: suggest properties from the effect on selected layer
                const effectName = directEffectPropMatch[1];
                console.log('Detected direct effect() property context for:', effectName);

                // Get the selected layer's name from selectedLayers
                if (selectedLayers.length > 0) {
                    const layerName = selectedLayers[0].name;
                    console.log('Selected layer:', layerName);

                    // Search all comps for this layer+effect combination and collect properties
                    const allProps = new Set();
                    Object.keys(projectInfo.layerEffectProperties).forEach(key => {
                        const parts = key.split('::');
                        if (parts.length === 3 && parts[1] === layerName && parts[2] === effectName) {
                            console.log('Found matching effect properties for:', key);
                            projectInfo.layerEffectProperties[key].forEach(prop => allProps.add(prop));
                        }
                    });

                    allProps.forEach(prop => {
                        suggestions.push({
                            label: `"${prop}"`,
                            kind: monaco.languages.CompletionItemKind.Property,
                            insertText: `"${prop}")`,
                            documentation: `Property of ${effectName}: ${prop}`,
                            range: range
                        });
                    });
                }

                return { suggestions: suggestions };
            } else if (effectMatch) {
                // comp("test").layer("test").e context: suggest effects from the specified layer
                const compName = effectMatch[1];
                const layerName = effectMatch[2];
                const layerKey = compName + '::' + layerName;
                console.log('Detected comp().layer().effect context for:', layerKey);

                if (projectInfo.layerEffects[layerKey]) {
                    projectInfo.layerEffects[layerKey].forEach(effect => {
                        suggestions.push({
                            label: `effect("${effect}")`,
                            kind: monaco.languages.CompletionItemKind.Reference,
                            insertText: `effect("${effect}")`,
                            documentation: `Effect on ${layerName}: ${effect}`,
                            range: range
                        });
                    });
                }

                return { suggestions: suggestions };
            } else if (thisCompEffectMatch) {
                // thisComp.layer("test").e context: search for effects from all comps
                const layerName = thisCompEffectMatch[1];
                console.log('Detected thisComp.layer().effect context for:', layerName);
                console.log('projectInfo.layerEffects:', projectInfo.layerEffects);

                // Search all comps for this layer name and collect effects
                const allEffects = new Set();
                Object.keys(projectInfo.layerEffects).forEach(key => {
                    console.log('Checking key:', key);
                    const parts = key.split('::');
                    if (parts.length === 2 && parts[1] === layerName) {
                        console.log('Match found! Effects:', projectInfo.layerEffects[key]);
                        projectInfo.layerEffects[key].forEach(effect => allEffects.add(effect));
                    }
                });

                console.log('All effects collected:', Array.from(allEffects));

                allEffects.forEach(effect => {
                    suggestions.push({
                        label: `effect("${effect}")`,
                        kind: monaco.languages.CompletionItemKind.Reference,
                        insertText: `effect("${effect}")`,
                        documentation: `Effect on ${layerName}: ${effect}`,
                        range: range
                    });
                });

                return { suggestions: suggestions };
            } else if (compMatch) {
                // comp("test").lay context: suggest only layers from the specified comp
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
            } else if (thisCompMatch) {
                // thisComp.lay context: suggest layers from active composition
                console.log('Detected thisComp.layer context');

                // Get layers from active composition
                // If selectedLayers exists, use layers from the comp that the first layer belongs to
                // Otherwise, use layers from projectInfo.compLayers

                // Show all layers from all compositions (when active comp cannot be determined)
                const allLayers = new Set();
                Object.values(projectInfo.compLayers).forEach(layers => {
                    layers.forEach(layer => allLayers.add(layer));
                });

                allLayers.forEach(layer => {
                    suggestions.push({
                        label: `layer("${layer}")`,
                        kind: monaco.languages.CompletionItemKind.Reference,
                        insertText: `layer("${layer}")`,
                        documentation: `Layer: ${layer}`,
                        range: range
                    });
                });

                return { suggestions: suggestions };
            }

            // Normal context: show all completion suggestions

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

// Monaco Environment configuration (Local Blob Worker)
window.MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
        // Get extension root path
        const extensionPath = window.location.href.replace(/\/[^\/]*$/, '');

        // Construct worker file path
        let workerPath;
        if (label === 'typescript' || label === 'javascript') {
            workerPath = extensionPath + '/lib/vs/language/typescript/ts.worker.js';
        } else {
            workerPath = extensionPath + '/lib/vs/editor/editor.worker.js';
        }

        // Return as Blob URL (to make Worker work with file:// protocol)
        return URL.createObjectURL(new Blob([`
            self.MonacoEnvironment = { baseUrl: '${extensionPath}/lib/vs/' };
            importScripts('${workerPath}');
        `], { type: 'text/javascript' }));
    }
};

// Initialization
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Initializing ExprOne...');
    console.log('DOM is ready');

    // Debug: Check button existence
    const testBtn = document.getElementById('thisLayersBtn');
    console.log('Button exists at init:', !!testBtn);

    initializeCSInterface();

    // Dynamically load Monaco Editor's loader.js
    loadMonacoLoader();

    console.log('About to setup event listeners...');
    setupEventListeners();
    console.log('Event listeners setup complete');
});

// Initialize CSInterface
function initializeCSInterface() {
    csInterface = new CSInterface();

    // Set ExtendScript file path
    const extensionRoot = csInterface.getSystemPath(SystemPath.EXTENSION);
    const jsxFile = extensionRoot + '/jsx/expressionControl.jsx';

    console.log('Loading ExtendScript from:', jsxFile);

    // Load ExtendScript
    csInterface.evalScript(`$.evalFile("${jsxFile}")`, function (result) {
        console.log('ExtendScript load result:', result);
        showDebug(`📜 JSX load result: ${result || 'success'}`);

        if (result === 'undefined' || result === '') {
            updateStatus('ExtendScript loaded ✓');

            // Test: Check if function is defined
            csInterface.evalScript('typeof getSelectedLayers', function (typeResult) {
                console.log('getSelectedLayers type:', typeResult);
                showDebug(`✅ getSelectedLayers: ${typeResult}`);

                if (typeResult !== 'function') {
                    showDebug('❌ JSX function not defined!');
                }
            });

            // Check applyExpressionToLayers function
            csInterface.evalScript('typeof applyExpressionToLayers', function (typeResult) {
                console.log('applyExpressionToLayers type:', typeResult);
                showDebug(`✅ applyExpressionToLayers: ${typeResult}`);

                if (typeResult !== 'function') {
                    showDebug('❌ applyExpressionToLayers not defined!');
                }
            });
        } else {
            console.error('ExtendScript error:', result);
            updateStatus('ExtendScript error');
            showDebug(`❌ JSX load error: ${result}`);
        }
    });
}

// Initialize Monaco Editor
function initializeMonacoEditor() {
    // Use local Monaco Editor
    require.config({ paths: { vs: './lib/vs' } });

    require(['vs/editor/editor.main'], function () {
        console.log('✅ Monaco Editor loaded');

        // Register After Effects Expression language
        monaco.languages.register({ id: 'ae-expression' });

        // Syntax highlighting configuration
        monaco.languages.setMonarchTokensProvider('ae-expression', {
            tokenizer: {
                root: [
                    // AE keywords
                    [/\b(thisComp|thisLayer|thisProperty|time|value|index)\b/, 'keyword.ae'],
                    // AE functions
                    [/\b(wiggle|linear|ease|easeIn|easeOut|loopIn|loopOut|random|clamp)\b/, 'function.ae'],
                    // AE properties
                    [/\b(position|scale|rotation|opacity|anchorPoint)\b/, 'property.ae'],
                    // JS keywords
                    [/\b(if|else|for|while|function|var|let|const|return)\b/, 'keyword.js'],
                    // Comments
                    [/\/\/.*$/, 'comment'],
                    // Strings
                    [/"([^"\\]|\\.)*"/, 'string'],
                    [/'([^'\\]|\\.)*'/, 'string'],
                    // Numbers
                    [/\d+(\.\d+)?/, 'number'],
                    // Operators
                    [/[{}()\[\]]/, 'delimiter.bracket'],
                    [/[;,.]/, 'delimiter'],
                    [/[+\-*/%=!<>]/, 'operator']
                ]
            }
        });

        // Custom theme
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

        // Create editor
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

// Event listener setup
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
            showDebug('🖱️ This Layer(s) button clicked');
            refreshLayers();
        });
    } else {
        console.error('❌ thisLayersBtn not found!');
        showDebug('❌ This Layer(s) button not found');
    }

    // Custom dropdown events
    if (customSelectButton) {
        customSelectButton.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleCustomDropdown();
        });
    }

    // Search filter
    if (propertySearchInput) {
        propertySearchInput.addEventListener('input', function (e) {
            filterProperties(e.target.value);
        });
    }

    // Close dropdown when clicking outside
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

// Layer scanning
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

        // Get layer information
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
                        // Split data per composition (separated by ;;)
                        const compEntries = compLayersData.split(';;');

                        compEntries.forEach(entry => {
                            if (entry) {
                                // Split comp name and layer list (separated by ::)
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
                } else if (part.indexOf('LAYER_EFFECTS:') === 0) {
                    const layerEffectsData = part.substring(14);
                    projectInfo.layerEffects = {};

                    if (layerEffectsData) {
                        // Split data per layer (separated by ;;)
                        const layerEntries = layerEffectsData.split(';;');

                        layerEntries.forEach(entry => {
                            if (entry) {
                                // Split comp::layer key and effect list (separated by the THIRD ::)
                                // Format: "Comp Name::Layer Name::Effect1,Effect2"
                                const parts = entry.split('::');
                                if (parts.length >= 3) {
                                    // Reconstruct the key as "compName::layerName"
                                    const layerKey = parts[0] + '::' + parts[1];

                                    // The rest is the effects list
                                    const effectsStr = parts.slice(2).join('::');
                                    const effects = effectsStr ? effectsStr.split(',').map(e =>
                                        e.replace(/\\,/g, ',')
                                         .replace(/\\\|/g, '|')
                                         .replace(/\\;/g, ';')
                                    ) : [];

                                    projectInfo.layerEffects[layerKey] = effects;
                                }
                            }
                        });
                    }
                } else if (part.indexOf('LAYER_EFFECT_PROPERTIES:') === 0) {
                    const layerEffectPropsData = part.substring(24);
                    projectInfo.layerEffectProperties = {};

                    if (layerEffectPropsData) {
                        // Split data per effect (separated by ;;)
                        const effectEntries = layerEffectPropsData.split(';;');

                        effectEntries.forEach(entry => {
                            if (entry) {
                                // Split comp::layer::effect key and property list (separated by the FOURTH ::)
                                // Format: "Comp Name::Layer Name::Effect Name::Prop1,Prop2"
                                const parts = entry.split('::');
                                if (parts.length >= 4) {
                                    // Reconstruct the key as "compName::layerName::effectName"
                                    const effectKey = parts[0] + '::' + parts[1] + '::' + parts[2];

                                    // The rest is the properties list
                                    const propsStr = parts.slice(3).join('::');
                                    const props = propsStr ? propsStr.split(',').map(p =>
                                        p.replace(/\\,/g, ',')
                                         .replace(/\\\|/g, '|')
                                         .replace(/\\;/g, ';')
                                    ) : [];

                                    projectInfo.layerEffectProperties[effectKey] = props;
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
            console.log('Layer effects keys:', Object.keys(projectInfo.layerEffects));
            console.log('Layer effects data:', projectInfo.layerEffects);
            console.log('Layer effect properties keys:', Object.keys(projectInfo.layerEffectProperties));
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
        showDebug(`📞 JSX call: listVisibleExpressionProps(${layerIndex})`);
        csInterface.evalScript(`listVisibleExpressionProps(${layerIndex})`, function (result) {
            console.log('Raw result from listVisibleExpressionProps:', result);
            console.log('Result type:', typeof result);
            console.log('Result length:', result ? result.length : 'null');
            showDebug(`📥 JSX response: ${result ? result.substring(0, 100) : 'null'}`);

            // Output complete data to console
            console.log('=== FULL JSX RESPONSE ===');
            console.log(result);
            console.log('=== END ===');

            handlePropertiesResult(result);
        });
    } else {
        const layerIndices = selectedLayers.map(l => l.index).join(',');
        console.log('Calling listCommonExpressionProps with indices:', layerIndices);
        showDebug(`📞 JSX call: listCommonExpressionProps([${layerIndices}])`);
        csInterface.evalScript(`listCommonExpressionProps([${layerIndices}])`, function (result) {
            console.log('Raw result from listCommonExpressionProps:', result);
            showDebug(`📥 JSX response: ${result ? result.substring(0, 50) + '...' : 'null'}`);
            handlePropertiesResult(result);
        });
    }
}

// Property result processing
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

// Toggle custom dropdown
function toggleCustomDropdown() {
    const dropdown = document.getElementById('customSelectDropdown');
    if (dropdown.style.display === 'none') {
        dropdown.style.display = 'block';
        document.getElementById('propertySearchInput').value = '';
        filterProperties('');  // Reset search
    } else {
        dropdown.style.display = 'none';
    }
}

function closeCustomDropdown() {
    const dropdown = document.getElementById('customSelectDropdown');
    dropdown.style.display = 'none';
}

// Property search filter
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

// Select property in custom dropdown
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

    // Highlight selected state
    document.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.target.classList.add('selected');

    // Close dropdown
    closeCustomDropdown();

    // Load existing expression
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

// On property selection
function onPropertySelected(event) {
    const selectedOption = event.target.selectedOptions[0];

    // Do nothing if empty option ("Select a property...") is selected
    if (!selectedOption || !selectedOption.value || !selectedOption.dataset.property) {
        currentProperty = null;
        if (window.editor) {
            window.editor.setValue('');  // Clear editor
        }
        return;
    }

    currentProperty = JSON.parse(selectedOption.dataset.property);
    console.log('Selected property:', currentProperty.name);

    // Load existing expression
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

        // Escape expression string (escape double quotes and backslashes)
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
