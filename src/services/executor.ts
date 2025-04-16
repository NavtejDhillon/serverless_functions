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
 * Execute a function in a standardized ESM environment
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
    
    // Create a wrapped script to execute the function in a sandboxed ESM context
    const tmpScriptPath = path.join(process.cwd(), 'tmp', `${functionName}_exec.mjs`);
    
    // Get function-specific node_modules path
    const functionNodeModulesDir = path.join(FUNCTIONS_DIR, functionName, 'node_modules');
    const hasCustomModules = fs.existsSync(functionNodeModulesDir);
    
    console.log(`Looking for custom modules at: ${functionNodeModulesDir}, exists: ${hasCustomModules}`);
    
    // Create wrapper code with ESM modules support
    const wrapperCode = `
      // Set up direct output capture to bypass any buffering
      process.stdout.write('__FUNCTION_OUTPUT_START__\\n');

      // Clear marker to separate module setup from actual function output
      console.log('__MODULE_SETUP_COMPLETE__');
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
      
      // Set up NODE_PATH to include function-specific node_modules
      if ('${hasCustomModules}' === 'true') {
        process.env.NODE_PATH = [
          '${functionNodeModulesDir.replace(/\\/g, '\\\\')}',
          process.env.NODE_PATH
        ].filter(Boolean).join('${path.delimiter}');
      }
      
      // Import the function (using dynamic import for ESM compatibility)
      try {
        // In ESM context, we need to use dynamic import with URL
        const functionPath = 'file://' + '${executablePath.replace(/\\/g, '/')}';
        
        // Import the function module
        const importedModule = await import(functionPath);
        
        // Get the function to execute (default export or named export)
        const fnToExecute = importedModule.default || importedModule.handler || importedModule.main;
        
        if (typeof fnToExecute !== 'function') {
          throw new Error('No executable function found in the provided file. Export your function as default, or as "handler" or "main".');
        }
        
        // Parse input from command line
        const input = JSON.parse('${JSON.stringify(input).replace(/'/g, "\\'")}');
        
        // Execute the function
        try {
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
      } catch (importError) {
        console.error('Error importing function:', importError);
        process.stdout.write('__FUNCTION_OUTPUT_END__\\n');
        process.exit(1);
      }
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
        // Add Node.js flags to support ESM modules
        NODE_OPTIONS: '--experimental-modules --es-module-specifier-resolution=node'
      } as Record<string, string>;
      
      // Add NODE_PATH for modules (with type assertions)
      if (hasCustomModules) {
        processEnv.NODE_PATH = `${functionNodeModulesDir}${path.delimiter}${process.env.NODE_PATH || ''}`;
      }
      
      // Log the NODE_PATH for debugging
      console.log(`Setting NODE_PATH: ${processEnv.NODE_PATH || 'not set'}`);
      
      // Create child process with environment variables - using Node with ESM support
      const child = spawn('node', [tmpScriptPath], {
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
        const moduleSetupEndMarker = '__MODULE_SETUP_COMPLETE__';
        const functionOutputStartMarker = 'FUNCTION LOGS START --------------------------';
        const functionOutputEndMarker = '-------------------------- FUNCTION LOGS END';
        const functionResultStartMarker = '__FUNCTION_RESULT_START__';
        const functionResultEndMarker = '__FUNCTION_RESULT_END__';
        
        // Extract only the function's actual logs, skipping module resolution
        let functionOutput = '';
        const moduleSetupEnd = output.indexOf(moduleSetupEndMarker);
        if (moduleSetupEnd !== -1) {
          const logsStart = output.indexOf(functionOutputStartMarker, moduleSetupEnd);
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
          exitCode: 124, // Standard timeout exit code
          result: null
        });
      }, timeout);
    });
  } catch (error: any) {
    return {
      output: '',
      error: error.message || String(error),
      exitCode: 1,
      result: null
    };
  }
}; 