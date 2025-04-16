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
): Promise<{ output: string; error: string; exitCode: number; result?: any }> => {
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
      // Set up direct output capture to bypass any buffering
      process.stdout.write('__FUNCTION_OUTPUT_START__\\n');

      // Set up module resolution to include function-specific node_modules
      ${hasCustomModules ? `
      const Module = require('module');
      const path = require('path');
      const fs = require('fs');
      const originalResolveFilename = Module._resolveFilename;
      
      // Debug tracking to avoid excessive logging
      const resolvedModules = new Set();
      let moduleResolutionCount = 0;
      const MAX_RESOLUTION_LOGS = 3; // Reduce number of module resolution logs
      
      console.log('Setting up custom module resolution for dependencies');
      
      // Override module resolution to check function-specific node_modules first
      Module._resolveFilename = function(request, parent, isMain, options) {
        // Prevent infinite recursion by tracking resolution depth per module
        const resolutionKey = request + (parent ? parent.filename : '');
        if (!global._moduleResolutionDepth) global._moduleResolutionDepth = {};
        if (!global._moduleResolutionDepth[resolutionKey]) global._moduleResolutionDepth[resolutionKey] = 0;
        global._moduleResolutionDepth[resolutionKey]++;
        
        // Safety check to prevent stack overflow
        if (global._moduleResolutionDepth[resolutionKey] > 10) {
          global._moduleResolutionDepth[resolutionKey] = 0;
          return originalResolveFilename(request, parent, isMain, options);
        }
        
        try {
          // Only log the first few module resolutions to avoid spam
          if (!resolvedModules.has(request) && moduleResolutionCount < MAX_RESOLUTION_LOGS) {
            console.log(\`Resolving module: \${request}\`);
            resolvedModules.add(request);
            moduleResolutionCount++;
          }
          
          // For relative imports or absolute paths, use normal resolution
          if (request.startsWith('.') || request.startsWith('/')) {
            const result = originalResolveFilename(request, parent, isMain, options);
            global._moduleResolutionDepth[resolutionKey]--;
            return result;
          }
          
          // First, check if module exists directly in our function-specific modules
          const functionModulePath = '${functionNodeModulesDir.replace(/\\/g, '\\\\')}/' + request;
          if (fs.existsSync(functionModulePath) || fs.existsSync(functionModulePath + '.js')) {
            const result = originalResolveFilename(functionModulePath, parent, isMain, options);
            global._moduleResolutionDepth[resolutionKey]--;
            return result;
          }
          
          // Then try normal require.resolve with custom paths
          try {
            const paths = [
              '${functionNodeModulesDir.replace(/\\/g, '\\\\')}',
              ...(parent && parent.paths ? parent.paths : [])
            ];
            
            const result = require.resolve(request, { paths });
            global._moduleResolutionDepth[resolutionKey]--;
            return result;
          } catch (moduleErr) {
            // Fall back to original resolution if not found
            const result = originalResolveFilename(request, parent, isMain, options);
            global._moduleResolutionDepth[resolutionKey]--;
            return result;
          }
        } catch (err) {
          console.error(\`Error resolving module \${request}: \${err.message}\`);
          global._moduleResolutionDepth[resolutionKey]--;
          throw err;
        }
      };` : ''}
      
      // Clear marker to separate module resolution from actual function output
      console.log('__MODULE_RESOLUTION_COMPLETE__');
      console.log('-------------------------- FUNCTION LOGS START --------------------------');
      
      // Capture original console methods
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      const originalConsoleInfo = console.info;
      
      // Create direct stream writing function to avoid any buffering issues
      function directWrite(prefix, args) {
        const formatted = args.map(arg => {
          if (arg instanceof Error) return arg.stack || arg.message;
          if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
          return String(arg);
        }).join(' ');
        
        process.stdout.write(\`[\${prefix}] \${formatted}\\n\`);
        return formatted;
      }
      
      // Replace console methods with direct writing versions
      console.log = function() { return directWrite('LOG', Array.from(arguments)); };
      console.error = function() { return directWrite('ERROR', Array.from(arguments)); };
      console.warn = function() { return directWrite('WARN', Array.from(arguments)); };
      console.info = function() { return directWrite('INFO', Array.from(arguments)); };
      
      // Get more detailed errors
      process.on('uncaughtException', (err) => {
        console.error('UNCAUGHT EXCEPTION:', err.stack || err);
        process.stdout.write('__FUNCTION_OUTPUT_END__\\n');
        process.exit(1);
      });
      
      process.on('unhandledRejection', (reason) => {
        console.error('UNHANDLED REJECTION:', reason);
        process.stdout.write('__FUNCTION_OUTPUT_END__\\n');
        process.exit(1);
      });
      
      // Load the function
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
      Promise.resolve()
        .then(async () => {
          try {
            // Execute with timeout
            const result = await fnToExecute(input);
            
            // Print result after execution
            console.log('-------------------------- FUNCTION LOGS END --------------------------');
            console.log('__FUNCTION_RESULT_START__');
            console.log(JSON.stringify(result, null, 2));
            console.log('__FUNCTION_RESULT_END__');
            
            // Signal successful completion
            process.stdout.write('__FUNCTION_OUTPUT_END__\\n');
            process.exit(0);
          } catch (error) {
            // Print error with clear markers
            console.error('-------------------------- FUNCTION ERROR --------------------------');
            console.error(error.stack || error.message || error);
            console.error('-------------------------- FUNCTION ERROR END --------------------------');
            
            // Signal error completion
            process.stdout.write('__FUNCTION_OUTPUT_END__\\n');
            process.exit(1);
          }
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
        const chunk = data.toString();
        output += chunk;
      });
      
      // Capture errors
      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        error += chunk;
        output += chunk; // Also add stderr to output for complete logs
      });
      
      // Handle completion
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        fs.unlinkSync(tmpScriptPath); // Clean up temporary file
        
        // Extract the relevant parts of the output using markers
        const extractBetweenMarkers = (text, startMarker, endMarker) => {
          const startIndex = text.indexOf(startMarker);
          if (startIndex === -1) return '';
          
          const contentStart = startIndex + startMarker.length;
          const endIndex = endMarker ? text.indexOf(endMarker, contentStart) : text.length;
          
          return endIndex === -1 ? text.substring(contentStart) : text.substring(contentStart, endIndex);
        };
        
        // Extract function output and result separately
        const moduleResolutionEndMarker = '__MODULE_RESOLUTION_COMPLETE__';
        const functionOutputStartMarker = 'FUNCTION LOGS START --------------------------';
        const functionOutputEndMarker = '-------------------------- FUNCTION LOGS END';
        const functionResultStartMarker = '__FUNCTION_RESULT_START__';
        const functionResultEndMarker = '__FUNCTION_RESULT_END__';
        
        // Extract only the function's actual logs, skipping module resolution
        let functionOutput = '';
        const moduleResolutionEnd = output.indexOf(moduleResolutionEndMarker);
        if (moduleResolutionEnd !== -1) {
          const logsStart = output.indexOf(functionOutputStartMarker, moduleResolutionEnd);
          const logsEnd = output.indexOf(functionOutputEndMarker, logsStart);
          
          if (logsStart !== -1 && logsEnd !== -1) {
            functionOutput = output.substring(logsStart + functionOutputStartMarker.length, logsEnd).trim();
          }
        }
        
        // Extract function result if available
        let functionResult = extractBetweenMarkers(
          output, 
          functionResultStartMarker + '\n', 
          functionResultEndMarker
        ).trim();
        
        // Return the processed output
        resolve({
          output: functionOutput || output.trim(),
          error: error.trim(),
          exitCode: code || 0,
          result: functionResult
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