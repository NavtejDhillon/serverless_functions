import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Schedule {
  id: string;
  functionName: string;
  cronExpression: string;
  active: boolean;
  description?: string;
}

const SchedulesList = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const response = await fetch('/api/schedules');
        if (!response.ok) {
          throw new Error('Failed to fetch schedules');
        }
        const data = await response.json();
        setSchedules(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schedules');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  const toggleScheduleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const action = currentStatus ? 'deactivate' : 'activate';
      const response = await fetch(`/api/schedules/${id}/${action}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} schedule`);
      }
      
      const result = await response.json();
      const updatedSchedule = result.data;
      
      // Update state
      setSchedules(schedules.map(schedule => 
        schedule.id === id ? updatedSchedule : schedule
      ));
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to update schedule`);
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/schedules/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }
      
      // Remove from UI
      setSchedules(schedules.filter(schedule => schedule.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete schedule');
    }
  };

  if (isLoading) {
    return <div className="text-center">Loading schedules...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Schedules</h1>
        <Link to="/schedules/create" className="btn btn-primary">
          Create Schedule
        </Link>
      </div>
      
      {schedules.length === 0 ? (
        <div className="alert alert-info">
          No schedules found. Create a schedule to get started.
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            Scheduled Tasks
          </div>
          <div className="list-group list-group-flush">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="list-group-item">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-1">{schedule.functionName}</h5>
                    <p className="mb-1">
                      <span className="badge bg-secondary me-2">{schedule.cronExpression}</span>
                      <span className={`badge ${schedule.active ? 'bg-success' : 'bg-danger'}`}>
                        {schedule.active ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                    {schedule.description && (
                      <small className="text-muted">{schedule.description}</small>
                    )}
                  </div>
                  <div>
                    <button
                      className={`btn btn-sm ${schedule.active ? 'btn-warning' : 'btn-success'} me-2`}
                      onClick={() => toggleScheduleStatus(schedule.id, schedule.active)}
                    >
                      {schedule.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => deleteSchedule(schedule.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulesList; 