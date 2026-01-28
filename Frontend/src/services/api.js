import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - adds token to all requests
api.interceptors.request.use(
  (config) => {
    // Log request details for debugging
    console.log(`🔵 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      data: config.data,
      params: config.params
    });

    // Add authorization token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handles responses and errors globally
api.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    // Log error details
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });

    // Handle specific error codes
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - clear auth and redirect to login
          console.warn('⚠️ Unauthorized - clearing auth and redirecting to login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('tokenExpiry');
          
          // Only redirect if not already on login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;

        case 403:
          // Forbidden
          console.error('🚫 Forbidden - insufficient permissions');
          break;

        case 404:
          // Not found
          console.error('🔍 Not Found:', error.config?.url);
          break;

        case 422:
          // Validation error
          console.error('📝 Validation Error:', data?.errors || data?.message);
          break;

        case 500:
          // Server error
          console.error('💥 Server Error:', data?.message || 'Internal server error');
          break;

        case 503:
          // Service unavailable
          console.error('🔧 Service Unavailable - server might be down');
          break;

        default:
          console.error(`⚠️ HTTP Error ${status}:`, data?.message || error.message);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('📡 No Response from Server:', {
        baseURL: error.config?.baseURL,
        url: error.config?.url,
        message: 'Server might be down or network issue'
      });
    } else {
      // Something else happened
      console.error('⚠️ Request Setup Error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Helper function to check if API is reachable
export const checkAPIHealth = async () => {
  try {
    // Use environment variable (already includes /api)
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const response = await axios.get(`${baseURL}/khata-test`, {
      timeout: 5000
    });
    console.log('✅ API Health Check: Server is reachable', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ API Health Check: Server is not reachable', error.message);
    return { success: false, error: error.message };
  }
};

// Helper function to check authentication status
export const checkAuth = () => {
  const token = localStorage.getItem('token');
  const tokenExpiry = localStorage.getItem('tokenExpiry');
  
  if (!token) {
    console.warn('⚠️ No token found');
    return false;
  }

  if (tokenExpiry && new Date().getTime() > parseInt(tokenExpiry)) {
    console.warn('⚠️ Token expired');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiry');
    return false;
  }

  console.log('✅ Auth token is valid');
  return true;
};

// Helper function to get current user
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

// Helper function to set auth data
export const setAuthData = (token, user, expiryHours = 24) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  const expiry = new Date().getTime() + (expiryHours * 60 * 60 * 1000);
  localStorage.setItem('tokenExpiry', expiry.toString());
  console.log('✅ Auth data saved', { user: user.name || user.email, expiresIn: `${expiryHours}h` });
};

// Helper function to clear auth data
export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('tokenExpiry');
  console.log('🗑️ Auth data cleared');
};

// Export configured axios instance as default
export default api;