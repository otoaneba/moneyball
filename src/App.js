import React, { useState, useEffect } from 'react';
import { SeasonStatsViz } from './components/SeasonStatsViz';
import './App.css';
import logo from './assets/images/t144_header_primary.svg';

function App() {
  const [bravesStats, setBravesStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch all stats from our saved JSON files
    fetch('http://localhost:8080/api/stats/all')
      .then(response => response.json())
      .then(data => {
        setBravesStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading Braves stats...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <div className="header-container">
        <img src={logo} alt="Braves Logo" className="header-logo" />
        <h1 className="header">Atlanta Braves 2006-2024 Stats Visualization</h1>
      </div>
      <SeasonStatsViz data={bravesStats} />
    </div>
  );
}

export default App;
