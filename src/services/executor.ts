import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { FUNCTIONS_DIR, DIST_FUNCTIONS_DIR, compileTypeScriptFile, getFunctionEnv } from './fileSystem';

interface ExecuteOptions {
  input?: any;
  timeout?: number;
  env?: Record<string, string>;
}

/**
 * Execute a function in a sandboxed environment
 */
export const executeFunction = async (
  functionName: string,
  options: ExecuteOptions = {}
): Promise<{ output: string; error: string; exitCode: number }> => {
  const { input = {}, timeout = 30000, env = {} } = options;
  
  try {
    // Check if function exists
    const jsPath = path.join(FUNCTIONS_DIR, `${functionName}.js`);
    const tsPath = path.join(FUNCTIONS_DIR, `${functionName}.ts`);
    let executablePath;
    
    if (fs.existsSync(jsPath)) {
      executablePath = jsPath;
    } else if (fs.existsSync(tsPath)) {
      // Compile TypeScript file and get the path to the compiled JS
      executablePath = await compileTypeScriptFile(tsPath);
    } else {
      throw new Error(`Function ${functionName} not found`);
    }
    
    // Get function-specific environment variables
    const functionEnv = getFunctionEnv(functionName);
    
    // Create a wrapped script to execute the function in a sandboxed context
    const tmpScriptPath = path.join(process.cwd(), 'tmp', `${functionName}_exec.js`);
    
    const wrapperCode = `
      const userFunction = require('${executablePath.replace(/\\/g, '\\\\')}');
      
      // Handle different function export patterns
      const fnToExecute = typeof userFunction === 'function' 
        ? userFunction 
        : userFunction.default || userFunction.handler || userFunction.main;
      
      if (typeof fnToExecute !== 'function') {
        throw new Error('No executable function found in the provided file');
      }
      
      // Parse input from command line
      const input = JSON.parse(process.argv[2] || '{}');
      
      // Execute the function
      Promise.resolve(fnToExecute(input))
        .then(result => {
          console.log(JSON.stringify(result));
          process.exit(0);
        })
        .catch(error => {
          console.error(error.message || error);
          process.exit(1);
        });
    `;
    
    fs.writeFileSync(tmpScriptPath, wrapperCode);
    
    return new Promise((resolve) => {
      let output = '';
      let error = '';
      let timeoutId: NodeJS.Timeout;
      
      // Merge system env, custom env and function-specific env
      const processEnv = {
        ...process.env,
        ...env,
        ...functionEnv
      };
      
      // Create child process with environment variables
      const child = spawn('node', [tmpScriptPath, JSON.stringify(input)], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: processEnv
      });
      
      // Capture output
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      // Capture errors
      child.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      // Handle completion
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        fs.unlinkSync(tmpScriptPath); // Clean up temporary file
        
        resolve({
          output: output.trim(),
          error: error.trim(),
          exitCode: code || 0
        });
      });
      
      // Set timeout
      timeoutId = setTimeout(() => {
        child.kill();
        error = 'Function execution timed out';
        resolve({
          output,
          error,
          exitCode: 124 // Standard timeout exit code
        });
      }, timeout);
    });
  } catch (error: any) {
    return {
      output: '',
      error: error.message || String(error),
      exitCode: 1
    };
  }
}; 