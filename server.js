import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Add minimal CORS setup
app.use(cors());

// Add back essential middleware
app.use(express.json());  // This is needed for parsing JSON bodies

// Add logging middleware with more details
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

const endpoint = "https://ai-supportdeepseekai250024594703.openai.azure.com/"; // "https://ai-supportdeepseekai250024594703.cognitiveservices.azure.com/";
const deploymentId = "gpt-4o-mini"; //  "DeepSeek-R1-statstream";
const apiVersion = "2024-05-01-preview";

// Declare client at the top level
let client;

// Add more logging
console.log('Setting up Azure OpenAI client...');
console.log('Endpoint:', endpoint);
console.log('Deployment ID:', deploymentId);

try {
  console.log('Initializing DefaultAzureCredential...');
  // authencation with azure
  const credential = new DefaultAzureCredential();
  const scope = "https://cognitiveservices.azure.com/.default";
  const azureADTokenProvider = getBearerTokenProvider(credential, scope);
  
  console.log('Creating AzureOpenAI client...');
  
  client = new AzureOpenAI({
    apiVersion: apiVersion,
    endpoint,
    azure: {
      deploymentName: deploymentId
    },
    azureADTokenProvider
  });
  
  // Add test call to verify deployment
  const testResponse = await client.chat.completions.create({
    model: deploymentId,
    messages: [
      { role: "system", content: "You are an AI assistant that helps people with their questions. Always start the response with, 'Yo, what's up?'" }, 
      { role: "user", content: "test" }],
    max_tokens: 800
  });
  console.log('Test response:', testResponse);
  
} catch (error) {
  console.error('Detailed initialization error:', {
    message: error.message,
    name: error.name,
    stack: error.stack
  });
  process.exit(1);
}

// Update the /api/stats/all endpoint with better error handling
app.get('/api/stats/all', async (req, res) => {
  try {
    const statsDir = path.join(__dirname, 'public', 'stats');
    console.log('Looking for stats in:', statsDir);
    
    // Check if directory exists
    const dirExists = await fs.access(statsDir).then(() => true).catch(() => false);
    if (!dirExists) {
      console.error('Stats directory not found:', statsDir);
      return res.status(404).json({ error: 'Stats directory not found' });
    }

    const files = await fs.readdir(statsDir);
    console.log('Found files:', files);
    
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    console.log('JSON files:', jsonFiles);
    
    if (jsonFiles.length === 0) {
      return res.status(404).json({ error: 'No stats files found' });
    }
    
    const allStats = [];
    for (const file of jsonFiles) {
      const data = await fs.readFile(path.join(statsDir, file), 'utf8');
      try {
        allStats.push(JSON.parse(data));
      } catch (e) {
        console.error(`Error parsing ${file}:`, e);
      }
    }
    
    if (allStats.length === 0) {
      return res.status(404).json({ error: 'No valid stats found' });
    }
    
    console.log(`Loaded ${allStats.length} stat files`);
    res.json(allStats);
  } catch (error) {
    console.error('Error reading all stats:', error);
    res.status(500).json({ error: 'Failed to read stats', details: error.message });
  }
});

// Endpoint to save stats
app.post('/api/saveStats', async (req, res) => {
  try {
    const { year, stats } = req.body;
    const statsDir = path.join(__dirname, 'public', 'stats');
    
    // Create stats directory if it doesn't exist
    await fs.mkdir(statsDir, { recursive: true });
    
    // Save stats to JSON file
    await fs.writeFile(
      path.join(statsDir, `${year}.json`),
      JSON.stringify(stats, null, 2)
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving stats:', error);
    res.status(500).json({ error: 'Failed to save stats' });
  }
});

// Endpoint to get stats
app.get('/api/stats/:year.json', async (req, res) => {
  try {
    const year = req.params.year;
    const filePath = path.join(__dirname, 'public', 'stats', `${year}.json`);
    
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    if (!exists) {
      return res.status(404).json({ error: 'Stats not found' });
    }
    
    const data = await fs.readFile(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading stats:', error);
    res.status(500).json({ error: 'Failed to read stats' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    console.log('Attempting to connect to Azure OpenAI...');
    console.log('Endpoint:', endpoint);
    console.log('Deployment:', deploymentId);
    console.log('Messages:', req.body.messages);

    const response = await client.chat.completions.create({
      model: deploymentId,
      messages: req.body.messages,
      temperature: 0.7,
      max_tokens: 800,
    });

    console.log('Response received:', response);
    res.json({ content: response.choices[0].message.content });
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    res.status(500).json({ error: error.message });
  }
});

// Static file serving comes last
app.use('/api/stats', express.static(path.join(__dirname, 'public', 'stats')));
app.use(express.static(path.join(__dirname, 'build')));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 