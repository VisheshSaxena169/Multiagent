import React from 'react';
import { useSelector } from 'react-redux';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

function App() {
  // Global auth check - instantly controls which UI renders
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  return isAuthenticated ? <Dashboard /> : <Auth />;
}

export default App;