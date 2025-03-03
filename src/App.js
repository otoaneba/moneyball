import React, { useState, useEffect, useCallback } from 'react';
import { SeasonStatsViz } from './components/SeasonStatsViz';
import './App.css';
import logo from './assets/images/t144_header_primary.svg';
import ChatComponent from './components/ChatComponent';

function App() {
  const [bravesStats, setBravesStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedStatType, setSelectedStatType] = useState('pitching');
  const [selectedYAxis, setSelectedYAxis] = useState('groundOuts');
  const [selectedRadius, setSelectedRadius] = useState('walksPer9Inn');

  const handleFilterChange = useCallback(({ statType, yAxis, bubbleRadius }) => {
    setSelectedStatType(statType);
    setSelectedYAxis(yAxis);
    setSelectedRadius(bubbleRadius);
  }, []);

  useEffect(() => {
    // Determine the data source based on environment
    const dataUrl = process.env.NODE_ENV === 'production' 
      ? `${process.env.PUBLIC_URL}/data/all_stats.json`
      : '/api/stats/all';

    // Fetch all stats
    fetch(dataUrl)  // Remove credentials since we're handling CORS on the server
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setBravesStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading Braves stats...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className={`app ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="header-container">
        <img src={logo} alt="Braves Logo" className="header-logo" />
        <h1 className="header">Atlanta Braves 2006-2024 Stats Visualization</h1>
        <button 
          className="theme-toggle"
          onClick={() => setIsDarkMode(!isDarkMode)}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
      <div className="content-container">
        <SeasonStatsViz 
          data={bravesStats} 
          isDarkMode={isDarkMode} 
          onFilterChange={handleFilterChange}
        />
        <ChatComponent 
          statType={selectedStatType}
          yAxis={selectedYAxis}
          bubbleRadius={selectedRadius}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
}

export default App;
