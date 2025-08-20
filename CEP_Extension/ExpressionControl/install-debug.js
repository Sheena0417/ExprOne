const fs = require('fs');
const path = require('path');
const os = require('os');

function getExtensionsPath() {
    const platform = os.platform();
    const homeDir = os.homedir();
    
    switch (platform) {
        case 'win32':
            return path.join(homeDir, 'AppData', 'Roaming', 'Adobe', 'CEP', 'extensions');
        case 'darwin':
            return path.join(homeDir, 'Library', 'Application Support', 'Adobe', 'CEP', 'extensions');
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}

function createSymlink() {
    const extensionsPath = getExtensionsPath();
    const extensionName = 'ExpressionControl';
    const targetPath = path.join(extensionsPath, extensionName);
    const sourcePath = __dirname;
    
    try {
        // 拡張機能ディレクトリが存在しない場合は作成
        if (!fs.existsSync(extensionsPath)) {
            fs.mkdirSync(extensionsPath, { recursive: true });
            console.log(`Created extensions directory: ${extensionsPath}`);
        }
        
        // 既存のシンボリックリンクまたはディレクトリを削除
        if (fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { recursive: true, force: true });
            console.log(`Removed existing extension: ${targetPath}`);
        }
        
        // シンボリックリンクを作成
        fs.symlinkSync(sourcePath, targetPath, 'dir');
        console.log(`✅ Debug extension installed successfully!`);
        console.log(`Source: ${sourcePath}`);
        console.log(`Target: ${targetPath}`);
        console.log('');
        console.log('🔄 Please restart After Effects to load the extension.');
        console.log('📍 You can find "Expression Control" in Window > Extensions menu.');
        
    } catch (error) {
        console.error('❌ Failed to install debug extension:', error.message);
        console.log('');
        console.log('💡 Try running as administrator/sudo if permission denied.');
        process.exit(1);
    }
}

console.log('Installing Expression Control for debugging...');
createSymlink();
