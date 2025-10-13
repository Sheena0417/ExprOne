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

function removeSymlink() {
    const extensionsPath = getExtensionsPath();
    const extensionName = 'ExpressionControl';
    const targetPath = path.join(extensionsPath, extensionName);
    
    try {
        if (fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { recursive: true, force: true });
            console.log(`✅ Debug extension uninstalled successfully!`);
            console.log(`Removed: ${targetPath}`);
        } else {
            console.log('⚠️ Extension was not installed or already removed.');
        }
        
    } catch (error) {
        console.error('❌ Failed to uninstall debug extension:', error.message);
        process.exit(1);
    }
}

console.log('Uninstalling Expression Control debug extension...');
removeSymlink();
