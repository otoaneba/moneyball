import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity';
import ModelClient from '@azure-rest/ai-inference';  // Use default import
import { isUnexpected } from "@azure-rest/ai-inference";
import { createSseStream } from '@azure/core-sse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Update paths to look one directory up
const publicPath = path.join(__dirname, '..', 'public');
const buildPath = path.join(__dirname, '..', 'build');
const statsPath = path.join(publicPath, 'stats');

const app = express();

// Add environment variables support
const PORT = process.env.PORT || 8080;

// Update CORS setup
app.use(cors({
  origin: true,  // Allow all origins for now
  methods: ['GET', 'POST'],
  credentials: false,  // Set to false since we're not using cookies/auth
  allowedHeaders: ['Content-Type']
}));

// Add OPTIONS handling for preflight requests
app.options('*', cors());  // Enable pre-flight for all routes

app.use(express.json());

// Add logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

// Azure AI configuration
const endpoint = "https://ai-supportdeepseekai250024594703.services.ai.azure.com/models";
const deploymentId = "gpt-4o-mini"; //"DeepSeek-R1-statstream"; 
const clientOptions = { 
  credentials: {
    scopes: ["https://cognitiveservices.azure.com/.default"]
  }
};

// Add environment variable checks
if (!process.env.AZURE_CLIENT_ID || !process.env.AZURE_TENANT_ID || !process.env.AZURE_CLIENT_SECRET) {
  console.error('Missing required Azure credentials in environment variables');
  process.exit(1);
}

// Initialize Azure AI client
let client;
try {
  console.log('Initializing Azure credentials and client...');
  let credential;
  
  if (process.env.NODE_ENV === 'production') {
    console.log('Using ClientSecretCredential for production', process.env.AZURE_TENANT_ID, process.env.AZURE_CLIENT_ID, process.env.AZURE_CLIENT_SECRET);
    credential = new ClientSecretCredential(
      process.env.AZURE_TENANT_ID,
      process.env.AZURE_CLIENT_ID,
      process.env.AZURE_CLIENT_SECRET
    );
  } else {
    console.log('Using DefaultAzureCredential for development');
    credential = new DefaultAzureCredential();
  }
  
  client = new ModelClient(
    endpoint, 
    credential,
    clientOptions
  );
  
  console.log('Client created successfully');
} catch (error) {
  console.error('Client initialization error:', {
    message: error.message,
    name: error.name,
    stack: error.stack
  });
  process.exit(1);
}

// Update the /api/stats/all endpoint with better error handling
app.get('/api/stats/all', async (req, res) => {
  try {
    console.log('Looking for stats in:', statsPath);
    
    // Check if directory exists
    const dirExists = await fs.access(statsPath).then(() => true).catch(() => false);
    if (!dirExists) {
      console.error('Stats directory not found:', statsPath);
      // Create the directory instead of returning error
      await fs.mkdir(statsPath, { recursive: true });
      // Return empty array instead of error
      return res.json([]);
    }

    const files = await fs.readdir(statsPath);
    console.log('Found files:', files);
    
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    console.log('JSON files:', jsonFiles);
    
    if (jsonFiles.length === 0) {
      // Return empty array instead of error
      return res.json([]);
    }
    
    const allStats = [];
    for (const file of jsonFiles) {
      const data = await fs.readFile(path.join(statsPath, file), 'utf8');
      try {
        allStats.push(JSON.parse(data));
      } catch (e) {
        console.error(`Error parsing ${file}:`, e);
      }
    }
    
    // Return whatever we have, even if empty
    res.json(allStats);
  } catch (error) {
    console.error('Detailed error reading stats:', {
      error: error.message,
      stack: error.stack,
      statsPath,
      cwd: process.cwd()
    });
    res.status(500).json({ 
      error: 'Failed to read stats', 
      details: error.message,
      path: statsPath 
    });
  }
});

// Endpoint to save stats
app.post('/api/saveStats', async (req, res) => {
  try {
    const { year, stats } = req.body;
    
    // Create stats directory if it doesn't exist
    await fs.mkdir(statsPath, { recursive: true });
    
    // Save stats to JSON file
    await fs.writeFile(
      path.join(statsPath, `${year}.json`),
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
    const filePath = path.join(statsPath, `${year}.json`);
    
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

// Remove the separate endpoints and combine into one
app.post('/api/chat', async (req, res) => {
  try {
    console.log('Sending chat request...');
    // Set SSE headers
    // res.setHeader('Content-Type', 'text/event-stream');
    // res.setHeader('Cache-Control', 'no-cache');
    // res.setHeader('Connection', 'keep-alive');

    const response = await client.path("chat/completions").post({
      body: {
        messages: req.body.messages,
        max_tokens: 800,
        temperature: 0.7,
        model: deploymentId,
        stream: false
      }
    })
    // add this for streaming response
    //.asNodeStream();

    // Use this for non-streaming response
    console.log('Raw response:', {
      status: response.status,
      body: response.body
    });

    if (isUnexpected(response)) {
      throw new Error(`Unexpected response from Azure AI: ${JSON.stringify(response.body)}`);
    }
    // Use this for streaming response
    // const stream = response.body;
    // if (!stream) {
    //   throw new Error('No stream received');
    // }
    console.log('Stream received:', response.body);
  // Use this for non-streaming response
    if (!response.body?.choices?.[0]?.message?.content) {
      throw new Error('No content in response');
    }

    // const content = response.body.choices[0].message.content;
    // const startIndex = content.indexOf('</think>');
    
    // Check if client is still connected
    if (!res.writableEnded) {
      res.json({ 
        content: response.body.choices[0].message.content // startIndex > -1 ? content.substring(startIndex + 8) : content 
      });
    }

  } catch (error) {
    console.error('Chat error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      response: error.response ? error.response.body : 'No response'
    });
    if (!res.writableEnded) {
      res.status(500).json({ error: error.message });
    }
  }
  // use this for streaming response
  //   const sseStream = createSseStream(stream);
    
  //   for await (const event of sseStream) {
  //     if (event.data === "[DONE]") {
  //       res.write('data: [DONE]\n\n');
  //       return res.end();
  //     }
      
  //     try {
  //       const content = JSON.parse(event.data).choices[0]?.delta?.content || '';
  //       if (content) {
  //         res.write(`data: ${JSON.stringify({ content })}\n\n`);
  //       }
  //     } catch (error) {
  //       console.error('Error parsing chunk:', error);
  //     }
  //   }
  // } catch (error) {
  //   console.error('Chat error:', error);
  //   res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
  //   res.end();
  // }
});

// Static file serving comes last
app.use('/api/stats', express.static(statsPath));
app.use(express.static(buildPath));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 

/// Find and provide correlation of pitching stats for the Atlanta Braves' bubble chart from 2006 to 2024, where the y-axis is the groundOuts and the bubble size is the walksPer9Inn.

// Tell the user the possible reason for the result.

// Only give key insights and summary of what you find. 
  