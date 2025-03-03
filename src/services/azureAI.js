const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://moneyball-oign.onrender.com'  // Replace with your actual Render URL
  : '';

// Only keep the API calls to backend
export async function getChatCompletion(messages) {
  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
      mode: 'cors'  // Explicitly set CORS mode
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error("Error calling chat API:", error);
    throw error;
  }
}

/* Streaming implementation (commented for future use)
  return new Promise((resolve, reject) => {
    let fullResponse = '';

    fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ messages }),
      mode: 'cors'
    }).then(response => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      function readStream() {
        reader.read().then(({done, value}) => {
          if (done) {
            resolve(fullResponse);
            return;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          lines.forEach(line => {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              
              if (dataStr.trim() === '[DONE]') {
                resolve(fullResponse);
                return;
              }

              try {
                const data = JSON.parse(dataStr);
                if (data.content) {
                  fullResponse += data.content;
                }
              } catch (error) {
                console.error('Error parsing chunk:', error);
              }
            }
          });

          readStream();
        }).catch(reject);
      }

      readStream();
    }).catch(reject);
  });
*/

export async function getStreamingChatCompletion(messages, onMessage) {
  // TODO: Implement streaming through backend if needed
  console.warn('Streaming not yet implemented');
} 