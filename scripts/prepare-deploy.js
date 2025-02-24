const fs = require('fs');
const http = require('http');

// Fetch data from local server
http.get('http://localhost:8080/api/stats/all', (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    // Create data directory if it doesn't exist
    if (!fs.existsSync('./public/data')) {
      fs.mkdirSync('./public/data');
    }

    // Write the data to a file
    fs.writeFileSync('./public/data/all_stats.json', data);
    console.log('Stats data saved to public/data/all_stats.json');
  });
}).on('error', (err) => {
  console.error('Error fetching stats:', err.message);
}); 