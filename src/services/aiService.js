/**
 * AI Service - Gemini-powered productivity assistant
 * Provides daily insights, schedule optimization, and productivity analysis
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Generate AI productivity insights based on user's schedule and stats
 */
export async function generateProductivityInsights(blocks, stats, preferences = {}) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn('Gemini API key not configured');
    return getFallbackInsights(blocks, stats);
  }

  const today = new Date().toISOString().split('T')[0];
  const todayBlocks = blocks.filter(b => b.date === today);
  const weekBlocks = blocks.filter(b => {
    const blockDate = new Date(b.date);
    const now = new Date();
    const weekAgo = new Date(now.setDate(now.getDate() - 7));
    return blockDate >= weekAgo;
  });

  const prompt = buildInsightsPrompt(todayBlocks, weekBlocks, stats, preferences);

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      return getFallbackInsights(blocks, stats);
    }

    return parseAIResponse(text);
  } catch (error) {
    console.error('AI insights error:', error);
    return getFallbackInsights(blocks, stats);
  }
}

/**
 * Generate AI-powered weekly report
 */
export async function generateWeeklyReport(blocks, stats) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    return getFallbackWeeklyReport(blocks, stats);
  }

  const prompt = buildWeeklyReportPrompt(blocks, stats);

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return text || getFallbackWeeklyReport(blocks, stats);
  } catch (error) {
    console.error('Weekly report error:', error);
    return getFallbackWeeklyReport(blocks, stats);
  }
}

/**
 * Get AI suggestions for optimal scheduling
 */
export async function getSchedulingSuggestions(blocks, taskType, duration) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    return getDefaultSchedulingSuggestions(blocks, taskType);
  }

  const prompt = `Based on this user's schedule pattern, suggest the best time slots for a ${duration}-minute ${taskType} session.

Current schedule for today:
${JSON.stringify(blocks.filter(b => b.date === new Date().toISOString().split('T')[0]), null, 2)}

Respond with a JSON object containing:
{
  "suggestions": [
    {"hour": 9, "reason": "Your energy is typically highest in the morning"},
    {"hour": 14, "reason": "Good slot after lunch break"}
  ],
  "tip": "A brief productivity tip"
}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 512,
        }
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Try to parse JSON from response
    const jsonMatch = text?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return getDefaultSchedulingSuggestions(blocks, taskType);
  } catch (error) {
    console.error('Scheduling suggestions error:', error);
    return getDefaultSchedulingSuggestions(blocks, taskType);
  }
}

// Helper functions
function buildInsightsPrompt(todayBlocks, weekBlocks, stats, preferences) {
  const categories = {};
  weekBlocks.forEach(b => {
    categories[b.category] = (categories[b.category] || 0) + (b.duration || 25);
  });

  const completedPomodoros = stats.filter(s => s.completed).length;
  const totalFocusTime = stats.reduce((acc, s) => acc + (s.duration || 0), 0);

  return `You are a productivity coach analyzing a user's time blocking schedule. Provide brief, actionable insights.

TODAY'S SCHEDULE (${todayBlocks.length} blocks):
${todayBlocks.map(b => `- ${b.title} (${b.category}, ${b.duration || 25}min at ${b.hour}:00)`).join('\n') || 'No blocks scheduled yet'}

THIS WEEK'S CATEGORY BREAKDOWN (minutes):
${Object.entries(categories).map(([cat, mins]) => `- ${cat}: ${mins} minutes`).join('\n') || 'No data yet'}

POMODORO STATS:
- Completed sessions: ${completedPomodoros}
- Total focus time: ${Math.round(totalFocusTime / 60)} hours

Respond with a JSON object:
{
  "greeting": "A brief personalized greeting based on time of day",
  "todayInsight": "One key observation about today's schedule",
  "suggestion": "One actionable productivity suggestion",
  "encouragement": "A brief motivational message",
  "focusScore": 75,
  "topCategory": "work",
  "streakMessage": "Current streak status"
}`;
}

function buildWeeklyReportPrompt(blocks, stats) {
  const categories = {};
  blocks.forEach(b => {
    categories[b.category] = (categories[b.category] || 0) + (b.duration || 25);
  });

  return `Generate a friendly, insightful weekly productivity report.

WEEKLY DATA:
- Total blocks: ${blocks.length}
- Category breakdown: ${JSON.stringify(categories)}
- Pomodoro sessions: ${stats.length}
- Completed: ${stats.filter(s => s.completed).length}

Write a 3-paragraph report covering:
1. Overall productivity summary with specific numbers
2. Patterns noticed (best days, peak hours, category balance)
3. Recommendations for next week

Keep it encouraging and actionable. Use emojis sparingly.`;
}

function parseAIResponse(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn('Could not parse AI response as JSON');
  }
  
  return {
    greeting: "Welcome back! 👋",
    todayInsight: text.substring(0, 150),
    suggestion: "Focus on your most important task first.",
    encouragement: "You're making great progress!",
    focusScore: 75,
    topCategory: "work",
    streakMessage: "Keep the momentum going!"
  };
}

function getFallbackInsights(blocks, stats) {
  const today = new Date().toISOString().split('T')[0];
  const todayBlocks = blocks.filter(b => b.date === today);
  const hour = new Date().getHours();
  
  let greeting = "Good morning! ☀️";
  if (hour >= 12 && hour < 17) greeting = "Good afternoon! 🌤️";
  if (hour >= 17) greeting = "Good evening! 🌙";

  return {
    greeting,
    todayInsight: todayBlocks.length > 0 
      ? `You have ${todayBlocks.length} blocks scheduled today.`
      : "No blocks scheduled yet. Ready to plan your day?",
    suggestion: "Try batching similar tasks together for better focus.",
    encouragement: "Every focused minute counts! 💪",
    focusScore: Math.min(100, 50 + (stats.length * 2)),
    topCategory: "work",
    streakMessage: "Start a streak by completing daily goals!"
  };
}

function getFallbackWeeklyReport(blocks, stats) {
  const totalMinutes = blocks.reduce((acc, b) => acc + (b.duration || 25), 0);
  const hours = Math.round(totalMinutes / 60);
  
  return `## 📊 Weekly Productivity Report

**Overview:** You scheduled ${blocks.length} time blocks this week, totaling approximately ${hours} hours of planned focus time. You completed ${stats.filter(s => s.completed).length} Pomodoro sessions.

**Highlights:** Your dedication to structured time management is paying off. The most effective productivity comes from consistent daily practice, not occasional intense sessions.

**Next Week:** Consider setting specific goals for each category and reviewing your schedule at the start of each day. Small improvements compound over time! 🚀`;
}

function getDefaultSchedulingSuggestions(blocks, taskType) {
  return {
    suggestions: [
      { hour: 9, reason: "Morning hours typically offer peak mental clarity" },
      { hour: 14, reason: "Post-lunch slot good for focused work" }
    ],
    tip: "Match your most demanding tasks with your highest energy periods."
  };
}

export default {
  generateProductivityInsights,
  generateWeeklyReport,
  getSchedulingSuggestions
};
