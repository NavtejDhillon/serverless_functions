// Main application component
const { useState, useEffect, createContext, useContext } = React;
const { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } = ReactRouterDOM;

// Create Auth Context for state management
const AuthContext = createContext();

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { authenticated } = await API.auth.checkStatus();
        
        if (authenticated) {
          setUser({ username: 'admin' }); // Basic user object
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  const login = async (username, password) => {
    try {
      setLoading(true);
      const data = await API.auth.login(username, password);
      setUser({ username });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };
  
  const logout = async () => {
    try {
      setLoading(true);
      await API.auth.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use authentication context
const useAuth = () => useContext(AuthContext);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
};

// Main Layout Component
const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  return (
    <div>
      <Navbar onLogout={handleLogout} user={user} />
      <div className="container app-container">
        <Routes>
          <Route path="/" element={<Navigate to="/functions" replace />} />
          <Route path="/functions" element={<FunctionsList />} />
          <Route path="/upload" element={<FunctionUpload />} />
          <Route path="/schedules" element={<SchedulesList />} />
          <Route path="/schedules/new" element={<CreateSchedule />} />
        </Routes>
      </div>
    </div>
  );
};

// App Component
const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />); 