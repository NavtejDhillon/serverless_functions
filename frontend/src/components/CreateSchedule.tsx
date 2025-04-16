import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface FunctionItem {
  name: string;
  path: string;
  type: string;
}

const CreateSchedule = () => {
  const [functionName, setFunctionName] = useState('');
  const [cronExpression, setCronExpression] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [functions, setFunctions] = useState<FunctionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFunctions = async () => {
      try {
        const response = await fetch('/api/functions');
        if (!response.ok) {
          throw new Error('Failed to fetch functions');
        }
        const data = await response.json();
        setFunctions(data);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load functions');
        setIsLoading(false);
      }
    };

    fetchFunctions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!functionName || !cronExpression) {
      setError('Function name and cron expression are required');
      return;
    }
    
    setIsSaving(true);
    setError('');
    
    try {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: description || functionName,
          functionName,
          cronExpression,
          input: {},
          active
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create schedule');
      }
      
      // Redirect to schedules list
      navigate('/schedules');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule');
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center">Loading functions...</div>;
  }

  return (
    <div>
      <h1 className="mb-4">Create Schedule</h1>
      
      {functions.length === 0 ? (
        <div className="alert alert-warning">
          No functions available. Please upload a function first.
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            {error && (
              <div className="alert alert-danger">{error}</div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="functionName" className="form-label">Function</label>
                <select
                  id="functionName"
                  className="form-select"
                  value={functionName}
                  onChange={(e) => setFunctionName(e.target.value)}
                  required
                >
                  <option value="">Select a function</option>
                  {functions.map((fn) => (
                    <option key={fn.name} value={fn.name}>
                      {fn.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-3">
                <label htmlFor="cronExpression" className="form-label">Cron Expression</label>
                <input
                  type="text"
                  className="form-control"
                  id="cronExpression"
                  placeholder="* * * * *"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  required
                />
                <div className="form-text">
                  Format: minute hour day-of-month month day-of-week
                </div>
              </div>
              
              <div className="mb-3">
                <label htmlFor="description" className="form-label">Description (optional)</label>
                <textarea
                  className="form-control"
                  id="description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>
              
              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="active">
                  Activate schedule immediately
                </label>
              </div>
              
              <div className="d-grid gap-2">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Creating...' : 'Create Schedule'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate('/schedules')}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateSchedule; 