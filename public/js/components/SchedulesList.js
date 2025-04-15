// SchedulesList component
const SchedulesList = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteSchedule, setDeleteSchedule] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const navigate = useNavigate();
  
  // Fetch schedules on component mount
  useEffect(() => {
    fetchSchedules();
  }, []);
  
  // Function to fetch all schedules
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await API.schedules.getAll();
      setSchedules(data);
    } catch (error) {
      setError('Error loading schedules: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle schedule activation/deactivation
  const handleToggleActive = async (schedule) => {
    try {
      setActionLoading(true);
      
      if (schedule.active) {
        await API.schedules.deactivate(schedule.id);
      } else {
        await API.schedules.activate(schedule.id);
      }
      
      // Refresh schedules
      await fetchSchedules();
    } catch (error) {
      setError(`Error ${schedule.active ? 'deactivating' : 'activating'} schedule: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Function to handle schedule deletion
  const handleDeleteClick = (schedule) => {
    setDeleteSchedule(schedule);
    setShowDeleteModal(true);
  };
  
  // Function to confirm deletion
  const confirmDelete = async () => {
    try {
      setActionLoading(true);
      await API.schedules.delete(deleteSchedule.id);
      setShowDeleteModal(false);
      
      // Refresh schedules
      await fetchSchedules();
    } catch (error) {
      setError('Error deleting schedule: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Format cron expression to be more readable
  const formatCronExpression = (cron) => {
    return cron;
  };
  
  // Render loading state
  if (loading && schedules.length === 0) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading schedules...</p>
      </div>
    );
  }
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Schedules</h2>
        <div>
          <button
            className="btn btn-primary me-2"
            onClick={() => fetchSchedules()}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Refreshing...
              </>
            ) : (
              <>Refresh</>
            )}
          </button>
          <button
            className="btn btn-success"
            onClick={() => navigate('/schedules/new')}
          >
            New Schedule
          </button>
        </div>
      </div>
      
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}
      
      {schedules.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <h4>No schedules found</h4>
            <p className="text-muted">Create a new schedule to get started.</p>
            <button 
              className="btn btn-success"
              onClick={() => navigate('/schedules/new')}
            >
              Create Schedule
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Function</th>
                    <th>Schedule</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr key={schedule.id}>
                      <td>{schedule.functionName}</td>
                      <td>
                        <code>{formatCronExpression(schedule.cronExpression)}</code>
                      </td>
                      <td>{schedule.description || <em className="text-muted">No description</em>}</td>
                      <td>
                        <span className={`badge ${schedule.active ? 'bg-success' : 'bg-danger'}`}>
                          {schedule.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`btn btn-sm ${schedule.active ? 'btn-warning' : 'btn-success'} me-2`}
                          onClick={() => handleToggleActive(schedule)}
                          disabled={actionLoading}
                        >
                          {schedule.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteClick(schedule)}
                          disabled={actionLoading}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  disabled={actionLoading}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete the schedule for <strong>{deleteSchedule.functionName}</strong>?</p>
                <p className="text-danger">This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={confirmDelete}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Deleting...
                    </>
                  ) : (
                    'Delete Schedule'
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