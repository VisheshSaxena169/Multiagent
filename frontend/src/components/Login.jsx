import React from 'react';
import { auth } from '../config/firebase'; // Import the initialization you just created
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import api from '../config/axios';
// If you are using Redux Toolkit, you would import useDispatch here

const Login = () => {
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();

    try {
      // 1. Trigger the Google popup
      const result = await signInWithPopup(auth, provider);
      
      // 2. Extract the JWT token from the successful login
      const idToken = await result.user.getIdToken();
      
      // 3. Send this token to your API Gateway (which forwards to the Auth service)
     

const response = await api.post('/auth/google-verify', { 
  idToken 
});

      const data = await response.json();
      
      if (data.success) {
        console.log("Successfully verified by backend!", data.user);
        // Dispatch to Redux store or redirect user to dashboard here
      } else {
        console.error("Backend verification failed:", data.message);
      }

    } catch (error) {
      console.error("Firebase login error:", error.message);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <button 
        onClick={handleGoogleSignIn}
        className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 transition"
      >
        Sign in with Google
      </button>
    </div>
  );
};

export default Login;