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
    
    // Get function-specific node_modules path
    const functionNodeModulesDir = path.join(FUNCTIONS_DIR, functionName, 'node_modules');
    const hasCustomModules = fs.existsSync(functionNodeModulesDir);
    
    console.log(`Looking for custom modules at: ${functionNodeModulesDir}, exists: ${hasCustomModules}`);
    
    // Create wrapper code with proper module resolution
    const wrapperCode = `
      // Set up module resolution to include function-specific node_modules
      ${hasCustomModules ? `
      const Module = require('module');
      const path = require('path');
      const originalResolveFilename = Module._resolveFilename;
      
      // Debug tracking to avoid excessive logging
      const resolvedModules = new Set();
      let moduleResolutionCount = 0;
      const MAX_RESOLUTION_LOGS = 5;
      
      console.log('Setting up custom module resolution for function-specific dependencies');
      console.log('Function modules directory: ${functionNodeModulesDir.replace(/\\/g, '\\\\')}');
      
      // Override module resolution to check function-specific node_modules first
      Module._resolveFilename = function(request, parent, isMain, options) {
        // Only log the first few module resolutions to avoid spam
        if (!resolvedModules.has(request) && moduleResolutionCount < MAX_RESOLUTION_LOGS) {
          console.log(\`Resolving module: \${request}\`);
          resolvedModules.add(request);
          moduleResolutionCount++;
        }
        
        try {
          // For relative imports or absolute paths, use normal resolution
          if (request.startsWith('.') || request.startsWith('/')) {
            return originalResolveFilename(request, parent, isMain, options);
          }
          
          // Try to resolve from function-specific node_modules first
          try {
            const functionModulePath = require.resolve(request, { 
              paths: ['${functionNodeModulesDir.replace(/\\/g, '\\\\')}'] 
            });
            
            // Only log successful resolutions for important modules to avoid spam
            if (moduleResolutionCount < MAX_RESOLUTION_LOGS) {
              console.log(\`Resolved \${request} from function modules\`);
            }
            
            return functionModulePath;
          } catch (moduleErr) {
            // If not found in function modules, try the standard resolution
            if (moduleResolutionCount < MAX_RESOLUTION_LOGS) {
              console.log(\`Module \${request} not found in function modules, trying standard resolution\`);
            }
            return originalResolveFilename(request, parent, isMain, options);
          }
        } catch (err) {
          console.error(\`Error resolving module \${request}: \${err.message}\`);
          throw err;
        }
      };` : ''}
      
      // Buffer console.log output to avoid interleaving with module resolution logs
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      let userFunctionOutput = [];

      // Capture user function output
      console.log = function() {
        const args = Array.from(arguments);
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        
        userFunctionOutput.push(message);
        // Still log to console for debugging
        originalConsoleLog.apply(console, arguments);
      };
      
      console.error = function() {
        const args = Array.from(arguments);
        const message = 'ERROR: ' + args.map(arg => 
          typeof arg === 'object' && arg instanceof Error ? arg.stack || arg.message : 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        
        userFunctionOutput.push(message);
        // Still log to console for debugging
        originalConsoleError.apply(console, arguments);
      };
      
      // Execute the function and store its result
      let functionResult;
      
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
          functionResult = result;
          
          // Print a separator before the actual result to help differentiate from module resolution logs
          originalConsoleLog('\\n----- FUNCTION OUTPUT -----');
          if (userFunctionOutput.length > 0) {
            userFunctionOutput.forEach(line => originalConsoleLog(line));
          } else {
            originalConsoleLog('(No console output from function)');
          }
          
          originalConsoleLog('----- FUNCTION RESULT -----');
          originalConsoleLog(JSON.stringify(result, null, 2));
          originalConsoleLog('----- END FUNCTION OUTPUT -----\\n');
          
          // Send the result back as JSON for proper parsing
          console.log = originalConsoleLog;  // Restore original console
          console.log(JSON.stringify(result));
          process.exit(0);
        })
        .catch(error => {
          // Print a separator before the actual error to help differentiate from module resolution logs
          originalConsoleError('\\n----- FUNCTION ERROR -----');
          originalConsoleError(error.stack || error.message || error);
          if (userFunctionOutput.length > 0) {
            originalConsoleLog('\\n----- CONSOLE OUTPUT BEFORE ERROR -----');
            userFunctionOutput.forEach(line => originalConsoleLog(line));
          }
          originalConsoleError('----- END FUNCTION ERROR -----\\n');
          
          // Send the error back in a structured format
          console.error = originalConsoleError;  // Restore original console
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
        ...functionEnv,
        // Add NODE_PATH environment variable to include function-specific modules
        NODE_PATH: hasCustomModules 
          ? `${functionNodeModulesDir}${path.delimiter}${process.env.NODE_PATH || ''}`
          : process.env.NODE_PATH || ''
      };
      
      // Log the NODE_PATH for debugging
      console.log(`Setting NODE_PATH: ${processEnv.NODE_PATH}`);
      
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