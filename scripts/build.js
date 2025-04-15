// Custom build script to bypass TypeScript type checking
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const glob = require('glob');
const os = require('os');

// Define colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Function to log messages with color
function log(message, color = colors.bright) {
  console.log(`${color}${message}${colors.reset}`);
}

// Function to execute shell commands
function execute(command, cwd) {
  try {
    log(`> ${command}`, colors.dim);
    execSync(command, { stdio: 'inherit', cwd: cwd || process.cwd() });
    return true;
  } catch (error) {
    log(`Error executing: ${command}`, colors.red);
    log(error.message);
    return false;
  }
}

// Function to create directory if it doesn't exist
function ensureDir(dir) {
  const fullPath = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    log(`Creating directory: ${dir}`, colors.dim);
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

// Main build process
function build() {
  log('====================================', colors.blue);
  log('   Building Serverless Platform     ', colors.blue);
  log('====================================', colors.blue);

  // 1. Install backend dependencies
  log('1. Installing backend dependencies...', colors.green);
  if (!execute('npm install')) return;

  // 2. Install frontend dependencies
  log('2. Installing frontend dependencies...', colors.green);
  if (!execute('npm install', './frontend')) return;

  // 3. Build frontend
  log('3. Building frontend...', colors.green);
  if (!execute('npm run build', './frontend')) return;

  // 4. Ensure public directory exists and clean it
  log('4. Setting up public directory...', colors.green);
  ensureDir('public');

  // 5. Copy frontend build to public
  log('5. Copying frontend build to public directory...', colors.green);
  const frontendDistPath = path.join(process.cwd(), 'frontend', 'dist');
  const publicPath = path.join(process.cwd(), 'public');
  
  // Clean public directory first
  try {
    fs.rmSync(publicPath, { recursive: true, force: true });
    fs.mkdirSync(publicPath, { recursive: true });
  } catch (error) {
    log('Error cleaning public directory', colors.red);
  }
  
  // Copy files
  try {
    copyFolderRecursiveSync(frontendDistPath, publicPath);
    log('Frontend files copied successfully', colors.green);
  } catch (error) {
    log('Error copying frontend files', colors.red);
    log(error.message);
    return;
  }

  // 6. Build backend
  log('6. Building backend...', colors.green);
  if (!execute('npm run build')) return;

  // 7. Ensure serverless directories exist
  log('7. Setting up serverless directories...', colors.green);
  ensureDir('functions');
  ensureDir('uploads');
  ensureDir('dist/functions');
  ensureDir('tmp');

  log('====================================', colors.blue);
  log('Build completed successfully!', colors.green);
  log('====================================', colors.blue);
  log('Run the application with: npm start');
  log('For development, use: npm run dev:all');
}

// Helper function to copy directories
function copyFolderRecursiveSync(source, target) {
  // Check if source exists
  if (!fs.existsSync(source)) {
    return;
  }

  // Create target folder if it doesn't exist
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  // Copy files and subdirectories
  const files = fs.readdirSync(source);
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    if (fs.lstatSync(sourcePath).isDirectory()) {
      // Recursive call for directories
      copyFolderRecursiveSync(sourcePath, targetPath);
    } else {
      // Copy file
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

// Run the build process
build(); 