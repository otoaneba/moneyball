// Only keep the API calls to backend
export async function getChatCompletion(messages) {
  // Use this for non-streaming response
  // try {
  //   const response = await fetch('/api/chat', {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({ messages }),
  //   });
    
  //   if (!response.ok) {
  //     throw new Error('Network response was not ok', response);
  //   }
    
  //   const data = await response.json();
  //   return data.content;
  // } catch (error) {
  //   console.error("Error calling chat API:", error);
  //   throw error;
  // }
  return new Promise((resolve, reject) => {
    let fullResponse = '';

    // Send POST request first
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    }).then(response => {
      // Create reader from response stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Read the stream
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
              
              // Handle [DONE] message
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
}

export async function getStreamingChatCompletion(messages, onMessage) {
  // TODO: Implement streaming through backend if needed
  console.warn('Streaming not yet implemented');
} 