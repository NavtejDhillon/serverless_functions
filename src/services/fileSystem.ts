import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Define paths
export const FUNCTIONS_DIR = path.join(process.cwd(), 'functions');
export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
export const DIST_FUNCTIONS_DIR = path.join(process.cwd(), 'dist', 'functions');

/**
 * Ensure all required directories exist
 */
export const ensureFunctionDirectories = (): void => {
  const directories = [
    FUNCTIONS_DIR,
    UPLOADS_DIR,
    DIST_FUNCTIONS_DIR,
    path.join(process.cwd(), 'tmp')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

/**
 * Compile TypeScript file to JavaScript
 */
export const compileTypeScriptFile = async (filePath: string): Promise<string> => {
  try {
    const fileName = path.basename(filePath);
    const fileNameWithoutExt = fileName.replace('.ts', '');
    const outputPath = path.join(DIST_FUNCTIONS_DIR, `${fileNameWithoutExt}.js`);
    
    // Run TypeScript compiler
    await execAsync(`npx tsc --outDir ${DIST_FUNCTIONS_DIR} ${filePath}`);
    
    console.log(`Successfully compiled ${fileName} to ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error compiling TypeScript file:', error);
    throw new Error(`Failed to compile TypeScript file: ${error}`);
  }
};

/**
 * Get list of all function files
 */
export const listFunctionFiles = (): { name: string; path: string; type: string }[] => {
  if (!fs.existsSync(FUNCTIONS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(FUNCTIONS_DIR);
  return files.map(file => {
    const filePath = path.join(FUNCTIONS_DIR, file);
    const stats = fs.statSync(filePath);
    if (stats.isFile()) {
      const extension = path.extname(file);
      return {
        name: path.basename(file, extension),
        path: filePath,
        type: extension.substring(1) // Remove the leading dot
      };
    }
    return null;
  }).filter(file => file !== null) as { name: string; path: string; type: string }[];
};

/**
 * Delete a function file
 */
export const deleteFunction = (functionName: string): boolean => {
  try {
    const jsPath = path.join(FUNCTIONS_DIR, `${functionName}.js`);
    const tsPath = path.join(FUNCTIONS_DIR, `${functionName}.ts`);
    const compiledJsPath = path.join(DIST_FUNCTIONS_DIR, `${functionName}.js`);
    
    // Delete the files if they exist
    if (fs.existsSync(jsPath)) fs.unlinkSync(jsPath);
    if (fs.existsSync(tsPath)) fs.unlinkSync(tsPath);
    if (fs.existsSync(compiledJsPath)) fs.unlinkSync(compiledJsPath);
    
    return true;
  } catch (error) {
    console.error(`Error deleting function ${functionName}:`, error);
    return false;
  }
}; 