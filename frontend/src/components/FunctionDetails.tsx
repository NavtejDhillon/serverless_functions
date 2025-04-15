import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface EnvVariable {
  key: string;
  value: string;
}

const FunctionDetails = () => {
  const { functionName } = useParams<{ functionName: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [newEnvVar, setNewEnvVar] = useState<EnvVariable>({ key: '', value: '' });
  const [output, setOutput] = useState<string[]>([]);
  const [executing, setExecuting] = useState(false);
  const [functionInput, setFunctionInput] = useState('{}');
  
  useEffect(() => {
    if (!functionName) return;
    
    const fetchEnvVars = async () => {
      try {
        const response = await fetch(`/api/functions/name/${functionName}/env`);
        if (!response.ok) {
          throw new Error('Failed to fetch environment variables');
        }
        const data = await response.json();
        setEnvVars(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching environment variables');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEnvVars();
  }, [functionName]);
  
  const addEnvVar = () => {
    if (!newEnvVar.key.trim()) return;
    
    setEnvVars(prev => ({
      ...prev,
      [newEnvVar.key]: newEnvVar.value
    }));
    
    setNewEnvVar({ key: '', value: '' });
  };
  
  const removeEnvVar = (key: string) => {
    setEnvVars(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };
  
  const saveEnvVars = async () => {
    try {
      const response = await fetch(`/api/functions/name/${functionName}/env`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(envVars)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save environment variables');
      }
      
      // Add to output log
      setOutput(prev => [...prev, `✅ Environment variables saved successfully`]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving environment variables');
      setOutput(prev => [...prev, `❌ Error saving environment variables: ${err instanceof Error ? err.message : err}`]);
    }
  };
  
  const executeFunction = async () => {
    setExecuting(true);
    setOutput(prev => [...prev, `▶️ Executing ${functionName}...`]);
    
    try {
      let inputObj = {};
      try {
        inputObj = JSON.parse(functionInput);
      } catch (err) {
        setOutput(prev => [...prev, `⚠️ Warning: Invalid JSON input, using empty object`]);
      }
      
      const response = await fetch(`/api/functions/name/${functionName}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inputObj)
      });
      
      const result = await response.json();
      
      if (result.success) {
        setOutput(prev => [
          ...prev, 
          `✅ Execution successful (exit code: ${result.exitCode})`,
          `📤 Output: ${result.output}`
        ]);
      } else {
        setOutput(prev => [
          ...prev, 
          `❌ Execution failed (exit code: ${result.exitCode})`,
          `⚠️ Error: ${result.error}`,
          result.output ? `📤 Output: ${result.output}` : ''
        ].filter(Boolean));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error executing function');
      setOutput(prev => [...prev, `❌ Error: ${err instanceof Error ? err.message : err}`]);
    } finally {
      setExecuting(false);
    }
  };
  
  if (loading) {
    return <div className="text-center p-4">Loading function details...</div>;
  }
  
  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Function: {functionName}</h1>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/functions')}
        >
          Back to Functions
        </button>
      </div>
      
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}
      
      <div className="row">
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header">
              <h3 className="card-title">Environment Variables</h3>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="input-group">
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Key"
                    value={newEnvVar.key}
                    onChange={(e) => setNewEnvVar(prev => ({ ...prev, key: e.target.value }))}
                  />
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Value"
                    value={newEnvVar.value}
                    onChange={(e) => setNewEnvVar(prev => ({ ...prev, value: e.target.value }))}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={addEnvVar}
                  >
                    Add
                  </button>
                </div>
              </div>
              
              {Object.keys(envVars).length === 0 ? (
                <div className="alert alert-info">No environment variables defined</div>
              ) : (
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Value</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(envVars).map(([key, value]) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td>{value}</td>
                        <td>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => removeEnvVar(key)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              
              <div className="mt-3">
                <button 
                  className="btn btn-success"
                  onClick={saveEnvVars}
                >
                  Save Environment Variables
                </button>
              </div>
            </div>
          </div>
          
          <div className="card mb-4">
            <div className="card-header">
              <h3 className="card-title">Execute Function</h3>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label htmlFor="functionInput" className="form-label">Input (JSON)</label>
                <textarea
                  id="functionInput"
                  className="form-control"
                  rows={5}
                  value={functionInput}
                  onChange={(e) => setFunctionInput(e.target.value)}
                ></textarea>
              </div>
              
              <button 
                className="btn btn-primary"
                onClick={executeFunction}
                disabled={executing}
              >
                {executing ? 'Executing...' : 'Execute Function'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title">Output</h3>
              <button 
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setOutput([])}
              >
                Clear
              </button>
            </div>
            <div className="card-body">
              <div 
                className="bg-dark text-light p-3 rounded"
                style={{ 
                  height: '500px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {output.length === 0 ? (
                  <div className="text-muted">No output yet</div>
                ) : (
                  output.map((line, index) => (
                    <div key={index} className="mb-1">{line}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FunctionDetails; 