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

// Extract dependencies from a function file
export const extractDependencies = (code: string): Record<string, string> => {
  const dependencies: Record<string, string> = {};
  
  // Option 1: Extract from special comment block
  const dependenciesMatch = code.match(/@dependencies\s*{([^}]*)}/);
  if (dependenciesMatch && dependenciesMatch[1]) {
    try {
      // Parse the JSON in the comment
      const depsJson = `{${dependenciesMatch[1]}}`;
      Object.assign(dependencies, JSON.parse(depsJson));
    } catch (error) {
      console.error('Error parsing dependencies JSON:', error);
    }
  }
  
  // Option 2: Extract from require statements
  const requireMatches = code.match(/require\(['"]([^'"@][^'"]*)['"]\)/g);
  if (requireMatches) {
    requireMatches.forEach(match => {
      const packageName = match.match(/require\(['"]([^'"@][^'"]*)['"]\)/)?.[1];
      if (packageName && !packageName.startsWith('.') && !Object.keys(dependencies).includes(packageName)) {
        dependencies[packageName] = "latest";
      }
    });
  }
  
  return dependencies;
};

// Install dependencies for a function
export const installDependencies = async (functionName: string, dependencies: Record<string, string>): Promise<{stdout: string, stderr: string} | null> => {
  if (Object.keys(dependencies).length === 0) return null;
  
  const functionDir = path.join(FUNCTIONS_DIR, functionName.replace(/\.[^/.]+$/, "")); // Remove extension
  
  if (!fs.existsSync(functionDir)) {
    fs.mkdirSync(functionDir, { recursive: true });
  }
  
  // Create package.json
  const packageJson = {
    name: functionName.replace(/\.[^/.]+$/, ""),
    version: "1.0.0",
    dependencies: dependencies
  };
  
  // Write package.json
  fs.writeFileSync(
    path.join(functionDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Install dependencies
  return new Promise((resolve, reject) => {
    const child = require('child_process').exec(`cd ${functionDir} && npm install`, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        console.error(`Error installing dependencies: ${error.message}`);
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });

    // Log output in real-time
    child.stdout.on('data', (data: string) => {
      console.log(`[${functionName} dependencies] ${data}`);
    });

    child.stderr.on('data', (data: string) => {
      console.error(`[${functionName} dependencies] ${data}`);
    });
  });
};

// Environment variable management
export const getFunctionEnvPath = (functionName: string): string => {
  return path.join(FUNCTIONS_DIR, `${functionName}.env`);
};

export const saveFunctionEnv = (functionName: string, envVars: Record<string, string>): boolean => {
  try {
    const envPath = getFunctionEnvPath(functionName);
    let content = '';
    
    for (const [key, value] of Object.entries(envVars)) {
      content += `${key}=${value}\n`;
    }
    
    fs.writeFileSync(envPath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error saving environment variables for ${functionName}:`, error);
    return false;
  }
};

export const getFunctionEnv = (functionName: string): Record<string, string> => {
  try {
    const envPath = getFunctionEnvPath(functionName);
    
    if (!fs.existsSync(envPath)) {
      return {};
    }
    
    const content = fs.readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};
    
    content.split('\n').forEach(line => {
      if (!line.trim() || line.startsWith('#')) return;
      
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('='); // Handle values containing = character
      
      if (key && value !== undefined) {
        env[key.trim()] = value.trim();
      }
    });
    
    return env;
  } catch (error) {
    console.error(`Error loading environment variables for ${functionName}:`, error);
    return {};
  }
}; 