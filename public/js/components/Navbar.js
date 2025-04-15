// Navbar component
const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <a className="navbar-brand" href="/">Serverless Functions</a>
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <a 
                className="nav-link" 
                href="/functions"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/functions');
                }}
              >
                Functions
              </a>
            </li>
            <li className="nav-item">
              <a 
                className="nav-link" 
                href="/upload"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/upload');
                }}
              >
                Upload
              </a>
            </li>
            <li className="nav-item">
              <a 
                className="nav-link" 
                href="/schedules"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/schedules');
                }}
              >
                Schedules
              </a>
            </li>
          </ul>
          
          {user && (
            <div className="d-flex">
              <span className="navbar-text me-3">
                Welcome, {user.username}
              </span>
              <button 
                className="btn btn-sm btn-light" 
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}; 