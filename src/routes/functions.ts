import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { UploadedFile } from 'express-fileupload';
import { 
  listFunctionFiles, 
  FUNCTIONS_DIR, 
  deleteFunction, 
  compileTypeScriptFile,
  extractDependencies,
  installDependencies,
  getFunctionEnv,
  saveFunctionEnv
} from '../services/fileSystem';
import { executeFunction } from '../services/executor';

const router = express.Router();

/**
 * Get all functions
 * GET /api/functions
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const functions = listFunctionFiles();
    res.json(functions);
  } catch (error) {
    console.error('Error listing functions:', error);
    res.status(500).json({ error: 'Failed to list functions' });
  }
});

/**
 * Upload a function
 * POST /api/functions/upload
 */
router.post('/upload', async (req: Request, res: Response) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      res.status(400).json({ error: 'No files were uploaded' });
      return;
    }

    const functionFile = req.files.file as UploadedFile;
    const fileName = functionFile.name;
    const extension = path.extname(fileName).toLowerCase();
    
    // Validate file type
    if (extension !== '.js' && extension !== '.ts') {
      res.status(400).json({ error: 'Only .js and .ts files are allowed' });
      return;
    }
    
    const functionName = path.basename(fileName, extension);
    const functionPath = path.join(FUNCTIONS_DIR, fileName);

    // Extract dependencies from file content
    const fileContent = functionFile.data.toString('utf-8');
    const dependencies = extractDependencies(fileContent);

    // Move the file to the functions directory
    await functionFile.mv(functionPath);
    
    // Initialize response object
    const responseObject: any = {
      success: true,
      function: {
        name: functionName,
        path: functionPath,
        type: extension.substring(1), // Remove the leading dot
        dependencies: dependencies
      },
      process: {
        compilation: null,
        dependencyInstallation: null
      }
    };
    
    // If it's a TypeScript file, try to compile it
    if (extension === '.ts') {
      try {
        const compiledPath = await compileTypeScriptFile(functionPath);
        responseObject.process.compilation = {
          success: true,
          output: `Compiled successfully to ${compiledPath}`
        };
      } catch (compileError) {
        // Delete the uploaded file if compilation fails
        fs.unlinkSync(functionPath);
        res.status(400).json({ 
          error: 'TypeScript compilation failed',
          details: compileError instanceof Error ? compileError.message : String(compileError)
        });
        return;
      }
    }
    
    // Install dependencies if any were found
    if (Object.keys(dependencies).length > 0) {
      try {
        const installResult = await installDependencies(functionName, dependencies);
        responseObject.process.dependencyInstallation = {
          success: true,
          dependencies: dependencies,
          output: installResult ? installResult.stdout : 'No dependencies to install'
        };
      } catch (error) {
        responseObject.process.dependencyInstallation = {
          success: false,
          dependencies: dependencies,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }

    res.json(responseObject);
  } catch (error) {
    console.error('Error uploading function:', error);
    res.status(500).json({ 
      error: 'Failed to upload function',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Delete a function
 * DELETE /api/functions/:name
 */
router.delete('/name/:functionName', (req: Request, res: Response) => {
  try {
    const functionName = req.params.functionName;
    
    if (!functionName) {
      res.status(400).json({ error: 'Function name is required' });
      return;
    }
    
    const success = deleteFunction(functionName);
    
    if (!success) {
      res.status(404).json({ error: 'Function not found or could not be deleted' });
      return;
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting function:', error);
    res.status(500).json({ error: 'Failed to delete function' });
  }
});

/**
 * Execute a function
 * POST /api/functions/:name/execute
 */
router.post('/name/:functionName/execute', async (req: Request, res: Response) => {
  try {
    const functionName = req.params.functionName;
    const input = req.body;
    
    if (!functionName) {
      res.status(400).json({ error: 'Function name is required' });
      return;
    }
    
    const result = await executeFunction(functionName, { input });
    
    res.json({
      success: result.exitCode === 0,
      output: result.output,
      error: result.error,
      exitCode: result.exitCode
    });
  } catch (error) {
    console.error('Error executing function:', error);
    res.status(500).json({ error: 'Failed to execute function' });
  }
});

/**
 * Get environment variables for a function
 * GET /api/functions/:name/env
 */
router.get('/name/:functionName/env', (req: Request, res: Response) => {
  try {
    const functionName = req.params.functionName;
    
    if (!functionName) {
      res.status(400).json({ error: 'Function name is required' });
      return;
    }
    
    const env = getFunctionEnv(functionName);
    res.json(env);
  } catch (error) {
    console.error('Error getting environment variables:', error);
    res.status(500).json({ error: 'Failed to get environment variables' });
  }
});

/**
 * Set environment variables for a function
 * POST /api/functions/:name/env
 */
router.post('/name/:functionName/env', (req: Request, res: Response) => {
  try {
    const functionName = req.params.functionName;
    const envVars = req.body;
    
    if (!functionName) {
      res.status(400).json({ error: 'Function name is required' });
      return;
    }
    
    if (!envVars || typeof envVars !== 'object') {
      res.status(400).json({ error: 'Environment variables must be provided as an object' });
      return;
    }
    
    const success = saveFunctionEnv(functionName, envVars);
    
    if (!success) {
      res.status(500).json({ error: 'Failed to save environment variables' });
      return;
    }
    
    res.json({ 
      success: true,
      message: 'Environment variables saved successfully',
      variables: envVars
    });
  } catch (error) {
    console.error('Error setting environment variables:', error);
    res.status(500).json({ error: 'Failed to set environment variables' });
  }
});

export default router; 