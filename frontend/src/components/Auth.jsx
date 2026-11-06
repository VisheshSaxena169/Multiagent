import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../store/authSlice';
import { auth } from '../config/firebase'; // Ensure this points to your firebase init file
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import api from '../api/axios';
import toast from 'react-hot-toast';

const Auth = () => {
  const dispatch = useDispatch();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
//   const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLocalAuth = async (e) => {
    e.preventDefault();
    // setError('');
    try {
      const endpoint = isLogin ? '/auth/api/user/login' : '/auth/api/user/signup';
      const { data } = await api.post(endpoint, formData);
      
      if (data.success) {
        if (isLogin) {
  toast.success(`Welcome back!`);
  
  // Pass an object containing both tokens to Redux
  dispatch(loginSuccess({
    token: data.data.accessToken || data.token || data.data.token,
    refreshToken: data.data.refreshtoken || data.refreshtoken // Capture refresh token
  }));
}else {
          setIsLogin(true);
          toast.success('Signup successful! Please log in.'); // Updated to use toast
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Authentication failed'); // Updated to use toast
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      const { data } = await api.post('/auth/google-verify', { idToken });
      
      if (data.success) {
        toast.success("Google sign-in successful!");
        
        // CHANGED: Pass as an object to match your updated Redux store
        dispatch(loginSuccess({
          token: data.data?.accessToken || data.token || data.data?.token,
          refreshToken: data.data?.refreshtoken || data.refreshtoken 
        }));
      }
    } catch (err) {
      toast.error('Google Authentication failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0f172a] to-black p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 relative overflow-hidden"
      >
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
        
        <h2 className="text-3xl font-bold text-white mb-6 text-center tracking-tight">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {/* {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
            {error}
          </div>
        )} */}

        <form onSubmit={handleLocalAuth} className="space-y-4 relative z-10">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative"
              >
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  onChange={handleInputChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              onChange={handleInputChange}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="password"
              name="password"
              placeholder="Password"
              onChange={handleInputChange}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl py-3 font-semibold shadow-lg hover:shadow-purple-500/30 transition-all"
          >
            {isLogin ? 'Sign In' : 'Sign Up'}
          </motion.button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="h-px bg-white/10 w-full" />
          <span className="text-gray-400 text-sm">OR</span>
          <div className="h-px bg-white/10 w-full" />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleSignIn}
          className="mt-6 w-full flex items-center justify-center space-x-3 bg-white/5 border border-white/10 text-white rounded-xl py-3 hover:bg-white/10 transition-all"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          <span>Continue with Google</span>
        </motion.button>

        <p className="mt-6 text-center text-gray-400 text-sm">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;