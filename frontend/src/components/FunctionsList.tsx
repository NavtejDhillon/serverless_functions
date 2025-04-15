import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface FunctionItem {
  name: string;
  path: string;
  type: string;
  size?: number;
  lastModified?: string;
}

const FunctionsList = () => {
  const [functions, setFunctions] = useState<FunctionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executing, setExecuting] = useState('');

  useEffect(() => {
    const fetchFunctions = async () => {
      try {
        const response = await fetch('/api/functions');
        if (!response.ok) {
          throw new Error('Failed to fetch functions');
        }
        const data = await response.json();
        setFunctions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load functions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFunctions();
  }, []);

  const executeFunction = async (functionName: string) => {
    setExecuting(functionName);
    setExecutionResult(null);
    
    try {
      const response = await fetch(`/api/functions/name/${functionName}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      const result = await response.json();
      setExecutionResult(result);
    } catch (err) {
      setExecutionResult({
        success: false,
        error: err instanceof Error ? err.message : 'Execution failed',
      });
    } finally {
      setExecuting('');
    }
  };

  const deleteFunction = async (functionName: string) => {
    if (!confirm(`Are you sure you want to delete ${functionName}?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/functions/name/${functionName}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete function');
      }
      
      // Remove from UI
      setFunctions(functions.filter(fn => fn.name !== functionName));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete function');
    }
  };

  if (isLoading) {
    return <div className="text-center">Loading functions...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Functions</h1>
        <Link to="/functions/upload" className="btn btn-primary">
          Upload Function
        </Link>
      </div>
      
      {functions.length === 0 ? (
        <div className="alert alert-info">
          No functions found. Upload a function to get started.
        </div>
      ) : (
        <>
          <div className="card mb-4">
            <div className="card-header">
              Available Functions
            </div>
            <div className="list-group list-group-flush">
              {functions.map((fn) => (
                <div key={fn.name} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-1">{fn.name}</h5>
                      <small className="text-muted">
                        Type: {fn.type} | 
                        {fn.size && ` Size: ${Math.round(fn.size / 1024)} KB | `}
                        {fn.lastModified && ` Modified: ${new Date(fn.lastModified).toLocaleString()}`}
                      </small>
                    </div>
                    <div>
                      <button
                        className="btn btn-sm btn-primary me-2"
                        onClick={() => executeFunction(fn.name)}
                        disabled={executing === fn.name}
                      >
                        {executing === fn.name ? 'Executing...' : 'Execute'}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteFunction(fn.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {executionResult && (
            <div className="card">
              <div className="card-header">
                Execution Result
              </div>
              <div className="card-body">
                <h5 className="card-title">
                  {executionResult.success ? (
                    <span className="text-success">Success</span>
                  ) : (
                    <span className="text-danger">Failed</span>
                  )}
                </h5>
                {executionResult.output && (
                  <div className="mb-3">
                    <h6>Output:</h6>
                    <pre className="bg-light p-3 rounded">{executionResult.output}</pre>
                  </div>
                )}
                {executionResult.error && (
                  <div className="mb-3">
                    <h6>Error:</h6>
                    <pre className="bg-light p-3 rounded text-danger">{executionResult.error}</pre>
                  </div>
                )}
                <div>
                  <small className="text-muted">Exit Code: {executionResult.exitCode}</small>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FunctionsList; 