const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Analyze complaint using AI service
 * @param {string} title - Complaint title
 * @param {string} description - Complaint description
 * @returns {Promise<Object>} AI analysis result
 */
const analyzeComplaint = async (title, description) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/analyze`, {
      title,
      description,
    });

    return {
      category: response.data.category,
      sentiment: response.data.sentiment,
      priority: response.data.priority,
      confidence: response.data.confidence || 0.8,
    };
  } catch (error) {
    console.error('AI Service Error:', error.message);
    // Fallback values if AI service is unavailable
    return {
      category: 'Other',
      sentiment: 'Neutral',
      priority: 'Medium',
      confidence: 0.5,
    };
  }
};

module.exports = { analyzeComplaint };
