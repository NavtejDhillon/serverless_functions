import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'

// Components
import Login from './components/Login'
import Navbar from './components/Navbar'
import FunctionsList from './components/FunctionsList'
import SchedulesList from './components/SchedulesList'
import FunctionUpload from './components/FunctionUpload'
import CreateSchedule from './components/CreateSchedule'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated on load
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/status')
        const data = await response.json()
        setIsAuthenticated(data.authenticated)
      } catch (error) {
        console.error('Error checking auth status:', error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setIsAuthenticated(false)
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  if (isLoading) {
    return <div className="container-fluid mt-5 text-center">Loading...</div>
  }

  return (
    <Router>
      <div className="app-container">
        <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
        
        <div className="container-fluid mt-4">
          <Routes>
            <Route path="/login" element={
              !isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/functions" />
            } />
            
            <Route path="/functions" element={
              isAuthenticated ? <FunctionsList /> : <Navigate to="/login" />
            } />
            
            <Route path="/functions/upload" element={
              isAuthenticated ? <FunctionUpload /> : <Navigate to="/login" />
            } />
            
            <Route path="/schedules" element={
              isAuthenticated ? <SchedulesList /> : <Navigate to="/login" />
            } />
            
            <Route path="/schedules/create" element={
              isAuthenticated ? <CreateSchedule /> : <Navigate to="/login" />
            } />
            
            <Route path="/" element={<Navigate to={isAuthenticated ? "/functions" : "/login"} />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
