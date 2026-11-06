// src/components/Loader.jsx
import React from 'react';
import { motion } from 'framer-motion';

const Loader = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0f172a] to-black">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="absolute w-24 h-24 rounded-full border-t-2 border-r-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
        />
        {/* Inner pulsing ring */}
        <motion.div
          animate={{ rotate: -360, scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-16 h-16 rounded-full border-b-2 border-l-2 border-blue-400 opacity-80"
        />
        {/* Center dot */}
        <div className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white]" />
      </div>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", repeatType: "reverse" }}
        className="mt-6 text-purple-300 font-medium tracking-widest text-sm uppercase"
      >
        Authenticating...
      </motion.p>
    </div>
  );
};

export default Loader;