import React, { createContext, useContext, useState, useEffect } from 'react';
import { getPeaks } from '../services/peaks';

const PeaksContext = createContext();

export const usePeaks = () => {
  const context = useContext(PeaksContext);
  if (!context) {
    throw new Error('usePeaks must be used within a PeaksProvider');
  }
  return context;
};

export const PeaksProvider = ({ children }) => {
  const [peaks, setPeaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPeaks = async () => {
      try {
        console.log('[PeaksContext] ▶️ Loading peaks...');
        const peaksData = await getPeaks();
        setPeaks(peaksData);
        console.log('[PeaksContext] ✅ Peaks loaded. Count =', Array.isArray(peaksData) ? peaksData.length : 0);
      } catch (err) {
        setError(err.message);
        console.log('[PeaksContext] ❌ Error:', err.message);
      } finally {
        setLoading(false);
        console.log('[PeaksContext] ⏹️ Loading finished.');
      }
    };
    loadPeaks();
  }, []);

  return (
    <PeaksContext.Provider value={{ peaks, loading, error }}>
      {children}
    </PeaksContext.Provider>
  );
};