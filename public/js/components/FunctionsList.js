// FunctionsList component
const FunctionsList = () => {
  const [functions, setFunctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [executing, setExecuting] = useState(false);
  const [executingFunction, setExecutingFunction] = useState(null);
  const [executionInput, setExecutionInput] = useState('{}');
  const [executionResult, setExecutionResult] = useState(null);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [deleteFunction, setDeleteFunction] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Fetch functions on component mount
  useEffect(() => {
    fetchFunctions();
  }, []);
  
  // Function to fetch all functions
  const fetchFunctions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await API.functions.getAll();
      setFunctions(data);
    } catch (error) {
      setError('Error loading functions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to handle function execution
  const handleExecute = (functionName) => {
    setExecutingFunction(functionName);
    setExecutionInput('{}');
    setExecutionResult(null);
    setShowExecuteModal(true);
  };
  
  // Function to run execution with input
  const runExecution = async () => {
    try {
      setExecuting(true);
      let input = {};
      
      // Parse JSON input if provided
      try {
        input = JSON.parse(executionInput);
      } catch (parseError) {
        throw new Error('Invalid JSON input: ' + parseError.message);
      }
      
      const result = await API.functions.execute(executingFunction, input);
      setExecutionResult(result);
    } catch (error) {
      setExecutionResult({
        success: false,
        error: error.message,
        output: '',
        exitCode: 1
      });
    } finally {
      setExecuting(false);
    }
  };
  
  // Function to handle function deletion
  const handleDeleteClick = (functionName) => {
    setDeleteFunction(functionName);
    setShowDeleteModal(true);
  };
  
  // Function to confirm deletion
  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await API.functions.delete(deleteFunction);
      setShowDeleteModal(false);
      // Refresh function list
      fetchFunctions();
    } catch (error) {
      setError('Error deleting function: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };
  
  // Render loading state
  if (loading && functions.length === 0) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading functions...</p>
      </div>
    );
  }
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Functions</h2>
        <button
          className="btn btn-primary"
          onClick={() => fetchFunctions()}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Refreshing...
            </>
          ) : (
            <>
              <i className="bi bi-arrow-clockwise me-1"></i>
              Refresh
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}
      
      {functions.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <h4>No functions found</h4>
            <p className="text-muted">Upload a function to get started.</p>
            <button 
              className="btn btn-primary"
              onClick={() => window.location.href = '/upload'}
            >
              Upload Function
            </button>
          </div>
        </div>
      ) : (
        <div className="row">
          {functions.map((func) => (
            <div className="col-md-6 col-lg-4 mb-4" key={func.name}>
              <div className={`card function-item ${func.type}`}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="card-title">{func.name}</h5>
                    <span className="badge bg-secondary">{func.type}</span>
                  </div>
                  <p className="card-text text-muted small">
                    {func.path}
                  </p>
                  <div className="d-flex justify-content-between mt-3">
                    <button
                      className="btn btn-sm btn-success me-2"
                      onClick={() => handleExecute(func.name)}
                    >
                      Execute
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteClick(func.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Execute Modal */}
      {showExecuteModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Execute Function: {executingFunction}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowExecuteModal(false)}
                  disabled={executing}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="functionInput" className="form-label">Input JSON</label>
                  <textarea
                    className="form-control font-monospace"
                    id="functionInput"
                    rows="4"
                    value={executionInput}
                    onChange={(e) => setExecutionInput(e.target.value)}
                    disabled={executing}
                  ></textarea>
                </div>
                
                {executionResult && (
                  <div className="mt-4">
                    <h6>Result</h6>
                    <div className="d-flex mb-2">
                      <span 
                        className={`badge ${executionResult.success ? 'bg-success' : 'bg-danger'} me-2`}
                      >
                        Exit Code: {executionResult.exitCode}
                      </span>
                    </div>
                    
                    {executionResult.output && (
                      <div className="mb-3">
                        <label className="form-label">Output:</label>
                        <div className="output-area">
                          {executionResult.output}
                        </div>
                      </div>
                    )}
                    
                    {executionResult.error && (
                      <div className="mb-3">
                        <label className="form-label text-danger">Error:</label>
                        <div className="output-area">
                          {executionResult.error}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowExecuteModal(false)}
                  disabled={executing}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={runExecution}
                  disabled={executing}
                >
                  {executing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Executing...
                    </>
                  ) : (
                    'Execute Function'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Deletion</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete the function <strong>{deleteFunction}</strong>?</p>
                <p className="text-danger">This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Deleting...
                    </>
                  ) : (
                    'Delete Function'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 