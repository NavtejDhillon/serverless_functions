import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { spawn } from 'child_process';

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

// Extract dependencies from function code
export const extractDependencies = (code: string): Record<string, string> => {
  const dependencies: Record<string, string> = {};
  
  // Log the entire file content for debugging
  console.log("DEBUG: Full file content (truncated):", code.length > 500 ? code.substring(0, 500) + "..." : code);
  
  // Simple check if the code contains @dependencies before trying regex
  if (code.includes('@dependencies')) {
    console.log("DEBUG: Found @dependencies tag in the code");
    
    // Try a simpler approach: find lines with package names and versions
    // This looks for lines like: *   "package-name": "version",
    const lines = code.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Look for lines that might be dependencies in JSDoc
      if (trimmed.includes('"') && trimmed.includes(':') && !trimmed.startsWith('//')) {
        console.log("DEBUG: Potential dependency line:", trimmed);
        
        // Try to extract package name and version with a simple regex
        const match = trimmed.match(/"([^"]+)"\s*:\s*"([^"]+)"/);
        if (match && match.length >= 3) {
          const [, pkg, version] = match;
          dependencies[pkg] = version;
          console.log(`DEBUG: Extracted dependency: ${pkg} @ ${version}`);
        }
      }
    }
  } else {
    console.log("DEBUG: No @dependencies tag found in the code");
  }
  
  // ---- ALTERNATIVE METHOD: Directly look for require statements ----
  
  // Simple require pattern detection
  const requireRegex = /(?:const|let|var)\s+.*?=\s+require\(['"](.*?)['"](?:\)|(?:, {.*})?\))/g;
  let requireMatch;
  
  while ((requireMatch = requireRegex.exec(code)) !== null) {
    if (requireMatch[1]) {
      let pkgName = requireMatch[1].split('/')[0]; // Get base package name
      
      // Handle scoped packages (@org/package)
      if (pkgName.startsWith('@') && requireMatch[1].includes('/')) {
        // For scoped packages, include the organization and package name
        const parts = requireMatch[1].split('/');
        if (parts.length >= 2) {
          pkgName = `${parts[0]}/${parts[1]}`;
        }
      }
      
      console.log(`DEBUG: Require match: ${requireMatch[1]} -> ${pkgName}`);
      
      // Skip built-in Node.js modules
      const builtInModules = ['fs', 'path', 'http', 'https', 'util', 'os', 'crypto', 
                            'querystring', 'url', 'stream', 'zlib', 'events',
                            'buffer', 'child_process', 'cluster', 'dns', 'net',
                            'tls', 'dgram', 'readline', 'repl', 'string_decoder',
                            'tty', 'v8', 'vm', 'worker_threads', 'perf_hooks'];
      
      // Only add if not a built-in module and not a relative import
      if (!builtInModules.includes(pkgName) && !pkgName.startsWith('.') && !pkgName.startsWith('/')) {
        console.log(`DEBUG: Detected require for external package: ${pkgName}`);
        if (!dependencies[pkgName]) {
          dependencies[pkgName] = 'latest';
        }
      }
    }
  }
  
  // Destructuring require pattern
  const destructuringRequireRegex = /(?:const|let|var)\s+\{\s*([^}]+)\s*\}\s*=\s*require\(['"](.*?)['"](?:\)|(?:, {.*})?\))/g;
  let destructuringMatch;
  
  while ((destructuringMatch = destructuringRequireRegex.exec(code)) !== null) {
    if (destructuringMatch[2]) {
      let pkgName = destructuringMatch[2].split('/')[0]; // Get base package name
      
      // Handle scoped packages (@org/package)
      if (pkgName.startsWith('@') && destructuringMatch[2].includes('/')) {
        // For scoped packages, include the organization and package name
        const parts = destructuringMatch[2].split('/');
        if (parts.length >= 2) {
          pkgName = `${parts[0]}/${parts[1]}`;
        }
      }
      
      console.log(`DEBUG: Destructuring require match: ${destructuringMatch[2]} -> ${pkgName}`);
      
      // Skip built-in Node.js modules
      const builtInModules = ['fs', 'path', 'http', 'https', 'util', 'os', 'crypto', 
                            'querystring', 'url', 'stream', 'zlib', 'events',
                            'buffer', 'child_process', 'cluster', 'dns', 'net',
                            'tls', 'dgram', 'readline', 'repl', 'string_decoder',
                            'tty', 'v8', 'vm', 'worker_threads', 'perf_hooks'];
      
      // Only add if not a built-in module and not a relative import
      if (!builtInModules.includes(pkgName) && !pkgName.startsWith('.') && !pkgName.startsWith('/')) {
        console.log(`DEBUG: Detected destructuring require for external package: ${pkgName}`);
        if (!dependencies[pkgName]) {
          dependencies[pkgName] = 'latest';
        }
      }
    }
  }
  
  // Common import/dynamic import patterns
  const patterns = [
    // Import statements (ES modules)
    /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["']([^@./][^/"]*)["']/g,
    // Dynamic imports
    /import\s*\(\s*["']([^@./][^/"]*)["']\s*\)/g,
    // Scoped packages in import
    /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["'](@[^/]+\/[^/"]*)["']/g,
    // Scoped packages in dynamic import
    /import\s*\(\s*["'](@[^/]+\/[^/"]*)["']\s*\)/g
  ];

  // Extract dependencies from import statements
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const packageName = match[1].split('/')[0]; // Get base package name
      console.log("DEBUG: Detected import for:", packageName);
      
      // Skip built-in Node.js modules
      const builtInModules = ['fs', 'path', 'http', 'https', 'util', 'os', 'crypto', 
                              'querystring', 'url', 'stream', 'zlib', 'events',
                              'buffer', 'child_process', 'cluster', 'dns', 'net',
                              'tls', 'dgram', 'readline', 'repl', 'string_decoder',
                              'tty', 'v8', 'vm', 'worker_threads', 'perf_hooks'];
      
      if (builtInModules.includes(packageName)) {
        continue;
      }
      
      // Only add if not already defined (JSDoc dependencies take precedence)
      if (!dependencies[packageName]) {
        dependencies[packageName] = 'latest'; // Default to latest version
      }
    }
  });
  
  // Log the extracted dependencies
  console.log(`Extracted dependencies: ${JSON.stringify(dependencies)}`);
  
  return dependencies;
};

// Install dependencies for a function
export const installDependencies = async (
  functionName: string,
  dependencies: Record<string, string>
): Promise<string | null> => {
  try {
    // Return early if no dependencies
    if (Object.keys(dependencies).length === 0) {
      console.log(`No dependencies to install for function: ${functionName}`);
      return null;
    }

    // Clean function name (remove file extension if present)
    const cleanFunctionName = functionName.replace(/\.[^/.]+$/, "");
    
    // Set up paths
    const functionModulesDir = path.join(FUNCTIONS_DIR, cleanFunctionName);
    const nodeModulesDir = path.join(functionModulesDir, 'node_modules');
    
    // Ensure the function directory exists
    try {
      await fs.promises.mkdir(functionModulesDir, { recursive: true });
      console.log(`Created or confirmed function directory: ${functionModulesDir}`);
    } catch (err) {
      console.error(`Failed to create function directory: ${functionModulesDir}`, err);
      throw new Error(`Failed to create function directory: ${err.message}`);
    }

    // Create package.json
    const packageJson = {
      name: `function-${cleanFunctionName}`,
      version: '1.0.0',
      description: `Dependencies for function ${cleanFunctionName}`,
      dependencies
    };

    const packageJsonPath = path.join(functionModulesDir, 'package.json');
    try {
      await fs.promises.writeFile(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2)
      );
      console.log(`Created package.json at ${packageJsonPath}`);
    } catch (err) {
      console.error(`Failed to write package.json: ${err.message}`);
      throw new Error(`Failed to write package.json: ${err.message}`);
    }

    // Remove existing node_modules if it exists
    try {
      if (fs.existsSync(nodeModulesDir)) {
        console.log(`Removing existing node_modules directory: ${nodeModulesDir}`);
        await fs.promises.rm(nodeModulesDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`Warning: Could not remove existing node_modules: ${err.message}`);
      // Continue with installation anyway
    }

    // Check if package-lock.json exists to determine npm command
    const packageLockPath = path.join(functionModulesDir, 'package-lock.json');
    const npmCommand = fs.existsSync(packageLockPath) ? 'ci' : 'install';
    
    // Install dependencies
    console.log(`Installing dependencies for function: ${cleanFunctionName}`);
    console.log(`Dependencies: ${JSON.stringify(dependencies)}`);
    
    return new Promise((resolve, reject) => {
      const install = spawn('npm', [npmCommand], {
        cwd: functionModulesDir,
        shell: true,
        stdio: 'pipe'
      });
      
      let output = '';
      let errorOutput = '';
      
      install.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        console.log(`[npm ${npmCommand} stdout]: ${chunk.trim()}`);
      });
      
      install.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        console.error(`[npm ${npmCommand} stderr]: ${chunk.trim()}`);
      });
      
      install.on('close', (code) => {
        if (code !== 0) {
          console.error(`npm ${npmCommand} process exited with code ${code}`);
          
          // Check if node_modules directory was created despite errors
          if (fs.existsSync(nodeModulesDir)) {
            console.warn('Warning: npm exited with errors, but node_modules directory exists');
            resolve(nodeModulesDir);
          } else {
            reject(new Error(`npm ${npmCommand} failed with code ${code}. Error: ${errorOutput}`));
          }
        } else {
          console.log(`Successfully installed dependencies for function: ${cleanFunctionName}`);
          resolve(nodeModulesDir);
        }
      });
      
      install.on('error', (err) => {
        console.error(`Failed to spawn npm process: ${err.message}`);
        reject(new Error(`Failed to execute npm ${npmCommand}: ${err.message}`));
      });
    });
  } catch (error) {
    console.error(`Failed to install dependencies: ${error.message}`);
    throw error;
  }
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