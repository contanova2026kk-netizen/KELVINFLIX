import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function IntroAnimation({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 800); // Wait for fade out animation
    }, 3000); // Show for 3 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: 1.5, 
              ease: [0.19, 1, 0.22, 1], // Custom ease out
              opacity: { duration: 0.8 }
            }}
            className="relative"
          >
            <motion.h1 
              className="text-5xl md:text-7xl lg:text-9xl font-black text-red-600 tracking-tighter"
              style={{ textShadow: '0 0 40px rgba(220, 38, 38, 0.4)' }}
              animate={{ 
                scale: [1, 1.05, 1],
                filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)']
              }}
              transition={{ 
                duration: 2, 
                ease: "easeInOut",
                times: [0, 0.5, 1]
              }}
            >
              KEVINFLIX
            </motion.h1>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
