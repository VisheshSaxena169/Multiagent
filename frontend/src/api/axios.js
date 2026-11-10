import axios from 'axios';
import { store } from '../store/store';
import { loginSuccess, logoutSuccess } from '../store/authSlice';


const api = axios.create({
    baseURL: import.meta.env.VITE_SERVER_URL,
    
    withCredentials: true,
});


// Automatically attach the JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});



// 2. RESPONSE INTERCEPTOR (The Auto-Refresh Magic)
api.interceptors.response.use(
  (response) => response, // If request succeeds, pass it through
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't retried this specific request yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark as retrying to prevent infinite loops

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        // If no refresh token exists, force logout
        if (!refreshToken) {
          store.dispatch(logoutSuccess());
          return Promise.reject(error);
        }

        // Call the refresh endpoint using base axios (NOT 'api') to avoid triggering interceptors again
        const { data } = await axios.post('http://zyqon.duckdns.org:3000/auth/api/user/refresh-token', {
          refreshToken: refreshToken
        });

        if (data.success&& data.data?.token) {
          // Extract the new tokens (adjust property names based on your backend response)
          const newToken = data.data.token 
          const newRefreshToken = refreshToken; // Keep old one if backend doesn't issue a new one

          // Update Redux and LocalStorage
          store.dispatch(loginSuccess({
            token: newToken,
            refreshToken: newRefreshToken
          }));

          // Update the failed request's header with the brand new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          // Retry the original request silently!
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If the refresh token is expired or invalid, the user MUST log in again
        store.dispatch(logoutSuccess());
        return Promise.reject(refreshError);
      }
    }

    // Return any other errors (like 400, 404, 500) normally
    return Promise.reject(error);
  }
);

export default api;