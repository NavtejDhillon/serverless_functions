// CreateSchedule component
const CreateSchedule = () => {
  const [functions, setFunctions] = useState([]);
  const [loadingFunctions, setLoadingFunctions] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [selectedFunction, setSelectedFunction] = useState('');
  const [cronExpression, setCronExpression] = useState('');
  const [description, setDescription] = useState('');
  const [inputJson, setInputJson] = useState('{}');
  const [active, setActive] = useState(true);
  
  const navigate = useNavigate();
  
  // Common cron presets
  const cronPresets = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every day at midnight', value: '0 0 * * *' },
    { label: 'Every Sunday at midnight', value: '0 0 * * 0' },
    { label: 'Every Monday at 9am', value: '0 9 * * 1' },
    { label: 'First day of month at midnight', value: '0 0 1 * *' }
  ];
  
  // Fetch available functions on component mount
  useEffect(() => {
    fetchFunctions();
  }, []);
  
  // Function to fetch available functions
  const fetchFunctions = async () => {
    try {
      setLoadingFunctions(true);
      const data = await API.functions.getAll();
      setFunctions(data);
      
      // Select the first function by default if available
      if (data.length > 0) {
        setSelectedFunction(data[0].name);
      }
    } catch (error) {
      setError('Error loading functions: ' + error.message);
    } finally {
      setLoadingFunctions(false);
    }
  };
  
  // Apply cron preset
  const applyCronPreset = (preset) => {
    setCronExpression(preset);
  };
  
  // Validate form
  const validateForm = () => {
    if (!selectedFunction) {
      setError('Please select a function');
      return false;
    }
    
    if (!cronExpression) {
      setError('Please enter a cron expression');
      return false;
    }
    
    // Basic cron expression validation
    const cronRegex = /^(\*|\d+|\d+-\d+|\d+\/\d+|\d+,\d+) (\*|\d+|\d+-\d+|\d+\/\d+|\d+,\d+) (\*|\d+|\d+-\d+|\d+\/\d+|\d+,\d+) (\*|\d+|\d+-\d+|\d+\/\d+|\d+,\d+) (\*|\d+|\d+-\d+|\d+\/\d+|\d+,\d+)$/;
    
    if (!cronRegex.test(cronExpression)) {
      setError('Invalid cron expression format');
      return false;
    }
    
    // Validate input JSON
    try {
      JSON.parse(inputJson);
    } catch (e) {
      setError('Invalid JSON input: ' + e.message);
      return false;
    }
    
    return true;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError('');
    setSuccess('');
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setCreating(true);
      
      // Parse input JSON
      const input = JSON.parse(inputJson);
      
      // Create schedule
      const newSchedule = await API.schedules.create({
        functionName: selectedFunction,
        cronExpression,
        description,
        input,
        active
      });
      
      setSuccess('Schedule created successfully!');
      
      // Reset form
      setCronExpression('');
      setDescription('');
      setInputJson('{}');
      
      // Redirect to schedules list after 2 seconds
      setTimeout(() => {
        navigate('/schedules');
      }, 2000);
    } catch (error) {
      setError('Error creating schedule: ' + error.message);
    } finally {
      setCreating(false);
    }
  };
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Create Schedule</h2>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/schedules')}
        >
          Back to Schedules
        </button>
      </div>
      
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}
      
      {success && (
        <div className="alert alert-success">{success}</div>
      )}
      
      {functions.length === 0 && !loadingFunctions ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <h4>No functions available</h4>
            <p className="text-muted">You need to upload at least one function before creating a schedule.</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/upload')}
            >
              Upload Function
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="functionSelect" className="form-label">Function</label>
                {loadingFunctions ? (
                  <div className="d-flex align-items-center">
                    <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                    <span>Loading functions...</span>
                  </div>
                ) : (
                  <select
                    id="functionSelect"
                    className="form-select"
                    value={selectedFunction}
                    onChange={(e) => setSelectedFunction(e.target.value)}
                    disabled={creating}
                    required
                  >
                    <option value="">Select a function</option>
                    {functions.map((func) => (
                      <option key={func.name} value={func.name}>
                        {func.name} ({func.type})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              <div className="mb-3">
                <label htmlFor="cronExpression" className="form-label">Cron Expression</label>
                <div className="input-group mb-2">
                  <input
                    type="text"
                    className="form-control"
                    id="cronExpression"
                    placeholder="* * * * *"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    disabled={creating}
                    required
                  />
                  <button
                    className="btn btn-outline-secondary dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown"
                    disabled={creating}
                  >
                    Presets
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    {cronPresets.map((preset, index) => (
                      <li key={index}>
                        <a
                          className="dropdown-item"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            applyCronPreset(preset.value);
                          }}
                        >
                          {preset.label} ({preset.value})
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="form-text">
                  Format: minute hour day-of-month month day-of-week (e.g., "0 9 * * 1" for every Monday at 9am)
                </div>
              </div>
              
              <div className="mb-3">
                <label htmlFor="description" className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  id="description"
                  placeholder="Daily backup task"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={creating}
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor="inputJson" className="form-label">Input JSON (Optional)</label>
                <textarea
                  className="form-control font-monospace"
                  id="inputJson"
                  rows="5"
                  placeholder="{}"
                  value={inputJson}
                  onChange={(e) => setInputJson(e.target.value)}
                  disabled={creating}
                ></textarea>
                <div className="form-text">
                  JSON object that will be passed to the function when executed
                </div>
              </div>
              
              <div className="mb-4 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="activeCheckbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  disabled={creating}
                />
                <label className="form-check-label" htmlFor="activeCheckbox">
                  Active (schedule will run immediately)
                </label>
              </div>
              
              <div className="d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate('/schedules')}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={creating || loadingFunctions}
                >
                  {creating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Creating...
                    </>
                  ) : (
                    'Create Schedule'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}; 