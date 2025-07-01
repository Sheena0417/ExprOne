import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function watchSrcPlugin() {
  return {
    name: 'watch-src',
    buildStart() {
      const srcDir = path.resolve(__dirname, 'src');
      const files = getAllFiles(srcDir);
      for (const file of files) {
        this.addWatchFile(file);
      }
    }
  };
}

function getAllFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (entry.isFile()) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

export default {
  input: 'src/expressionControl.js',
  output: {
    file: 'dist/out.js',
    format: 'iife',
  },
  plugins: [
    watchSrcPlugin()
  ]
};
