const BASE_URL = 'https://statsapi.mlb.com/api/v1';
const BRAVES_TEAM_ID = 144;
const API_BASE = 'http://localhost:8080';

// Function to save complete stats to JSON
async function saveStatsToJson(yearStats) {
  try {
    const response = await fetch(`${API_BASE}/api/saveStats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        year: yearStats.year,
        stats: yearStats
      })
    });
    if (!response.ok) throw new Error('Failed to save stats');
    console.log(`Saved complete stats for ${yearStats.year}`);
  } catch (error) {
    console.error(`Error saving ${yearStats.year} stats:`, error);
  }
}

export async function getBravesStats(startYear = 2006, endYear = 2024) {
  const stats = [];
  
  for (let year = startYear; year <= endYear; year++) {
    try {
      // Get batting stats
      const battingResponse = await fetch(
        `${BASE_URL}/teams/${BRAVES_TEAM_ID}/stats?stats=season&group=hitting&season=${year}`
      );
      const battingData = await battingResponse.json();

      // Get pitching stats
      const pitchingResponse = await fetch(
        `${BASE_URL}/teams/${BRAVES_TEAM_ID}/stats?stats=season&group=pitching&season=${year}`
      );
      const pitchingData = await pitchingResponse.json();

      // Combine complete batting and pitching stats
      const yearStats = {
        year,
        batting: battingData.stats[0].splits[0].stat,
        pitching: pitchingData.stats[0].splits[0].stat
      };

      // Save complete stats to JSON
      await saveStatsToJson(yearStats);
      
      stats.push(yearStats);
    } catch (error) {
      console.error(`Error fetching ${year} stats:`, error);
    }
  }

  return stats;
} 