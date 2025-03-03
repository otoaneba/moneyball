import React, { useState, useEffect } from 'react';
import { getChatCompletion } from '../services/azureAI';
import './ChatComponent.css';

function ChatComponent({ statType, yAxis, bubbleRadius, isDarkMode }) {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Clear response when filters change
  useEffect(() => {
    setResponse('');
  }, [statType, yAxis, bubbleRadius]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log('Sending chat request...', statType, yAxis, bubbleRadius);
    try {
      const messages = [
        { 
          role: "system", 
          content: `You are an AI assistant that helps people. Find and provide correlation of ${statType} stats for the Atlanta Braves' bubble chart from 2006 to 2024, where the y-axis is the ${yAxis} and the bubble size is the ${bubbleRadius}. Tell the user the possible reason for the result. Only give key insights and summary of what you find.`
        },
        { 
          role: "user", 
          content: `Tell me about the correlation of ${statType} stats for the Atlanta Braves' bubble chart from 2006 to 2024, where the y-axis is the ${yAxis} and the bubble size is the ${bubbleRadius}.`
        }
      ];

      const result = await getChatCompletion(messages);
      setResponse(result);
    } catch (error) {
      console.error('Error:', error);
      setResponse('Sorry, there was an error processing your request.');
    } finally {
      setLoading(false);
    }
  };

  function formatResponse(content) {
    // Split into sections based on numbered points
    const sections = content.split(/\d+\.\s+\*\*/).filter(Boolean);
    
    // Format the introduction (everything before point 1)
    const intro = sections[0].split('several key insights emerge:')[0];
    
    // Format the insights
    const insights = sections.slice(1).map(section => {
      const [title, ...details] = section.split('**:');
      return {
        title: title.trim(),
        details: details.join('').trim()
      };
    });

    return (
      <div className="ai-response">
        <p className="intro">{intro}</p>
        <p><strong>Key Insights:</strong></p>
        <ol className="insights-list">
          {insights.map((insight, index) => (
            <li key={index} className="insight-item">
              <strong>{insight.title}:</strong>
              <p>{insight.details}</p>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className={`chat-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <form onSubmit={handleSubmit}>
        <button type="submit" disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze Stats'}
        </button>
      </form>
      {loading && (
        <div className="loading-container">
          <div className="loading-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
          <span className="loading-text">Analyzing stats...</span>
        </div>
      )}
      {response && (
        <div className="response-container">
          {formatResponse(response)}
        </div>
      )}
    </div>
  );
}

export default ChatComponent; 