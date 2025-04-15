// API utility for serverless functions platform

const API = {
  // Base URL for API calls
  baseUrl: '/api',
  
  // Get the authentication token from localStorage
  getToken: () => {
    return localStorage.getItem('token');
  },
  
  // Set the authentication token in localStorage
  setToken: (token) => {
    localStorage.setItem('token', token);
  },
  
  // Remove the authentication token from localStorage
  removeToken: () => {
    localStorage.removeItem('token');
  },
  
  // Get default headers for API requests
  getHeaders: () => {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    const token = API.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  },
  
  // Authentication endpoints
  auth: {
    // Login with username and password
    login: async (username, password) => {
      try {
        const response = await fetch(`${API.baseUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Login failed');
        }
        
        API.setToken(data.token);
        return data;
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    
    // Logout the current user
    logout: async () => {
      try {
        await fetch(`${API.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: API.getHeaders()
        });
        
        API.removeToken();
        return true;
      } catch (error) {
        console.error('Logout error:', error);
        throw error;
      }
    },
    
    // Check if the user is authenticated
    checkStatus: async () => {
      try {
        const response = await fetch(`${API.baseUrl}/auth/status`, {
          headers: API.getHeaders()
        });
        
        return await response.json();
      } catch (error) {
        console.error('Auth status check error:', error);
        return { authenticated: false };
      }
    }
  },
  
  // Functions endpoints
  functions: {
    // Get all functions
    getAll: async () => {
      try {
        const response = await fetch(`${API.baseUrl}/functions`, {
          headers: API.getHeaders()
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch functions');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching functions:', error);
        throw error;
      }
    },
    
    // Upload a function
    upload: async (file) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API.baseUrl}/functions/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API.getToken()}`
            // Don't set Content-Type here, the browser will set it with the boundary
          },
          body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload function');
        }
        
        return data;
      } catch (error) {
        console.error('Error uploading function:', error);
        throw error;
      }
    },
    
    // Delete a function
    delete: async (functionName) => {
      try {
        const response = await fetch(`${API.baseUrl}/functions/${functionName}`, {
          method: 'DELETE',
          headers: API.getHeaders()
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete function');
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Error deleting function ${functionName}:`, error);
        throw error;
      }
    },
    
    // Execute a function
    execute: async (functionName, input = {}) => {
      try {
        const response = await fetch(`${API.baseUrl}/functions/${functionName}/execute`, {
          method: 'POST',
          headers: API.getHeaders(),
          body: JSON.stringify(input)
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to execute function');
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Error executing function ${functionName}:`, error);
        throw error;
      }
    }
  },
  
  // Schedules endpoints
  schedules: {
    // Get all schedules
    getAll: async () => {
      try {
        const response = await fetch(`${API.baseUrl}/schedules`, {
          headers: API.getHeaders()
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch schedules');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching schedules:', error);
        throw error;
      }
    },
    
    // Create a new schedule
    create: async (scheduleData) => {
      try {
        const response = await fetch(`${API.baseUrl}/schedules`, {
          method: 'POST',
          headers: API.getHeaders(),
          body: JSON.stringify(scheduleData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create schedule');
        }
        
        return data;
      } catch (error) {
        console.error('Error creating schedule:', error);
        throw error;
      }
    },
    
    // Update a schedule
    update: async (scheduleId, updates) => {
      try {
        const response = await fetch(`${API.baseUrl}/schedules/${scheduleId}`, {
          method: 'PATCH',
          headers: API.getHeaders(),
          body: JSON.stringify(updates)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to update schedule');
        }
        
        return data;
      } catch (error) {
        console.error(`Error updating schedule ${scheduleId}:`, error);
        throw error;
      }
    },
    
    // Delete a schedule
    delete: async (scheduleId) => {
      try {
        const response = await fetch(`${API.baseUrl}/schedules/${scheduleId}`, {
          method: 'DELETE',
          headers: API.getHeaders()
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete schedule');
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Error deleting schedule ${scheduleId}:`, error);
        throw error;
      }
    },
    
    // Activate a schedule
    activate: async (scheduleId) => {
      try {
        const response = await fetch(`${API.baseUrl}/schedules/${scheduleId}/activate`, {
          method: 'POST',
          headers: API.getHeaders()
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to activate schedule');
        }
        
        return data;
      } catch (error) {
        console.error(`Error activating schedule ${scheduleId}:`, error);
        throw error;
      }
    },
    
    // Deactivate a schedule
    deactivate: async (scheduleId) => {
      try {
        const response = await fetch(`${API.baseUrl}/schedules/${scheduleId}/deactivate`, {
          method: 'POST',
          headers: API.getHeaders()
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to deactivate schedule');
        }
        
        return data;
      } catch (error) {
        console.error(`Error deactivating schedule ${scheduleId}:`, error);
        throw error;
      }
    }
  }
}; 