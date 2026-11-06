import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  token: localStorage.getItem('token') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  user: null, 
  isLoading: false, // 1. Add loading state here
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
      if (action.payload.refreshToken) {
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      }
    },
    logoutSuccess: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken'); // Clear this too
    },
    setProfile: (state, action) => {
      state.user = action.payload;
    },
    setLoading: (state, action) => { state.isLoading = action.payload; },
    // 2. Add this new reducer to control the spinner
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    }
  }
});

export const { loginSuccess, logoutSuccess, setProfile, setLoading } = authSlice.actions;
export default authSlice.reducer;