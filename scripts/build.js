// Custom build script to bypass TypeScript type checking
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const glob = require('glob');

// Source and destination directories
const SRC_DIR = path.join(__dirname, '..', 'src');
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Create dist directory if it doesn't exist
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Simple script that uses ts-node to compile each file individually
console.log('Compiling TypeScript files without type checking...');

try {
  // Just use babel to transpile the files directly
  execSync('npx babel src --out-dir dist --extensions ".ts,.tsx" --copy-files', {
    stdio: 'inherit',
    env: {
      ...process.env,
      BABEL_DISABLE_CACHE: '1'
    }
  });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
} 