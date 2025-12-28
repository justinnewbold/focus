/**
 * AI Service - Gemini-powered productivity assistant
 * Provides daily insights, schedule optimization, and productivity analysis
 * FIXED: Added proper Accept headers to prevent 406 errors
 */

// Use gemini-1.5-flash which is more reliable and available
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Track if API is working to prevent spam
let apiAvailable = true;
let lastApiCheck = 0;
const API_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes between retries after failure

/**
 * Make request to Gemini API with proper headers
 */
async function geminiRequest(prompt, config = {}) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxOutputTokens || 1024,
      }
    })
  });

  // Handle specific error codes
  if (response.status === 406) {
    throw new Error('API request not acceptable - check content format');
  }
  
  if (response.status === 429) {
    throw new Error('Rate limited - please wait before trying again');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

/**
 * Generate AI productivity insights based on user's schedule and stats
 */
export async function generateProductivityInsights(blocks, stats, preferences = {}) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn('Gemini API key not configured');
    return getFallbackInsights(blocks, stats);
  }

  // If API failed recently, use fallback without retrying
  if (!apiAvailable && Date.now() - lastApiCheck < API_CHECK_INTERVAL) {
    return getFallbackInsights(blocks, stats);
  }

  const today = new Date().toISOString().split('T')[0];
  const todayBlocks = blocks.filter(b => b.date === today);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  weekAgo.setHours(0, 0, 0, 0);
  const weekBlocks = blocks.filter(b => {
    const blockDate = new Date(b.date);
    return blockDate >= weekAgo;
  });

  const prompt = buildInsightsPrompt(todayBlocks, weekBlocks, stats, preferences);

  try {
    const text = await geminiRequest(prompt, { temperature: 0.7, maxOutputTokens: 1024 });
    apiAvailable = true;
    
    if (!text) {
      return getFallbackInsights(blocks, stats);
    }

    return parseInsightsResponse(text, blocks, stats);
  } catch (error) {
    apiAvailable = false;
    lastApiCheck = Date.now();
    console.warn('AI insights error:', error.message, '- using fallback');
    return getFallbackInsights(blocks, stats);
  }
}

/**
 * Generate weekly productivity report
 */
export async function generateWeeklyReport(blocks, stats) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey || (!apiAvailable && Date.now() - lastApiCheck < API_CHECK_INTERVAL)) {
    return getFallbackWeeklyReport(blocks, stats);
  }

  const prompt = buildWeeklyReportPrompt(blocks, stats);

  try {
    const text = await geminiRequest(prompt, { temperature: 0.7, maxOutputTokens: 2048 });
    apiAvailable = true;
    return text || getFallbackWeeklyReport(blocks, stats);
  } catch (error) {
    apiAvailable = false;
    lastApiCheck = Date.now();
    console.warn('Weekly report error:', error.message);
    return getFallbackWeeklyReport(blocks, stats);
  }
}

/**
 * Get AI-powered scheduling suggestions
 */
export async function getSchedulingSuggestions(blocks, newBlockCategory, preferredTimes = []) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey || (!apiAvailable && Date.now() - lastApiCheck < API_CHECK_INTERVAL)) {
    return getFallbackSchedulingSuggestions(blocks, newBlockCategory);
  }

  const prompt = buildSchedulingPrompt(blocks, newBlockCategory, preferredTimes);

  try {
    const text = await geminiRequest(prompt, { temperature: 0.5, maxOutputTokens: 512 });
    apiAvailable = true;
    return parseSchedulingSuggestions(text) || getFallbackSchedulingSuggestions(blocks, newBlockCategory);
  } catch (error) {
    apiAvailable = false;
    lastApiCheck = Date.now();
    return getFallbackSchedulingSuggestions(blocks, newBlockCategory);
  }
}

// ============ PROMPT BUILDERS ============

function buildInsightsPrompt(todayBlocks, weekBlocks, stats, preferences) {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  
  return `You are a friendly productivity coach. Analyze this schedule data and provide brief, actionable insights.

Today's Schedule (${todayBlocks.length} blocks):
${todayBlocks.map(b => `- ${b.title} (${b.category}) at ${b.hour}:00`).join('\n') || 'No blocks scheduled yet'}

This Week's Stats:
- Total blocks: ${weekBlocks.length}
- Completed pomodoros: ${stats?.completedPomodoros || 0}
- Current streak: ${stats?.currentStreak || 0} days

Time: ${timeOfDay}

Respond in JSON format only, no markdown:
{
  "greeting": "Brief personalized greeting for ${timeOfDay}",
  "focusScore": <number 0-100 based on schedule quality>,
  "todayInsight": "One sentence about today's schedule",
  "suggestion": "One actionable suggestion",
  "encouragement": "Brief motivational message"
}`;
}

function buildWeeklyReportPrompt(blocks, stats) {
  const categories = {};
  blocks.forEach(b => {
    categories[b.category] = (categories[b.category] || 0) + 1;
  });

  return `Create a brief weekly productivity report based on this data:

Blocks by category: ${JSON.stringify(categories)}
Total blocks: ${blocks.length}
Completed pomodoros: ${stats?.completedPomodoros || 0}
Current streak: ${stats?.currentStreak || 0} days
Goals met: ${stats?.goalsMetThisWeek || 0}

Write a 3-4 paragraph report covering:
1. Overview of productivity this week
2. Time distribution analysis
3. Recommendations for next week

Keep it friendly and encouraging.`;
}

function buildSchedulingPrompt(blocks, category, preferredTimes) {
  const today = new Date().toISOString().split('T')[0];
  const todayBlocks = blocks.filter(b => b.date === today);
  const occupiedSlots = todayBlocks.map(b => `${b.hour}:00`);

  return `Suggest optimal time slots for a "${category}" block today.

Already scheduled: ${occupiedSlots.join(', ') || 'Nothing yet'}
Preferred times: ${preferredTimes.join(', ') || 'No preference'}
Category: ${category}

Respond with JSON array of 3 suggested times only, no markdown:
["HH:00", "HH:00", "HH:00"]

Consider: work blocks best 9-12am, meetings mid-day, personal/exercise evening.`;
}

// ============ RESPONSE PARSERS ============

function parseInsightsResponse(text, blocks, stats) {
  try {
    // Clean the text - remove markdown code blocks if present
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7);
    }
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }
    cleanText = cleanText.trim();
    
    // Try to extract JSON from the response
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        greeting: parsed.greeting || getTimeBasedGreeting(),
        focusScore: Math.min(100, Math.max(0, parsed.focusScore || calculateFocusScore(blocks, stats))),
        todayInsight: parsed.todayInsight || 'Ready to have a productive day!',
        suggestion: parsed.suggestion || 'Start with your most important task.',
        encouragement: parsed.encouragement || 'You\'ve got this! 💪'
      };
    }
  } catch (e) {
    console.warn('Failed to parse AI response:', e.message);
  }
  return getFallbackInsights(blocks, stats);
}

function parseSchedulingSuggestions(text) {
  try {
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7);
    }
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }
    cleanText = cleanText.trim();
    
    const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn('Failed to parse scheduling suggestions:', e.message);
  }
  return null;
}

// ============ FALLBACK FUNCTIONS ============

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning! ☀️';
  if (hour < 17) return 'Good afternoon! 🌤️';
  return 'Good evening! 🌙';
}

function calculateFocusScore(blocks, stats) {
  const today = new Date().toISOString().split('T')[0];
  const todayBlocks = blocks.filter(b => b.date === today);
  
  let score = 50; // Base score
  
  // +20 for having blocks scheduled
  if (todayBlocks.length > 0) score += 20;
  
  // +15 for variety (multiple categories)
  const categories = new Set(todayBlocks.map(b => b.category));
  if (categories.size >= 3) score += 15;
  else if (categories.size >= 2) score += 10;
  
  // +15 for completed pomodoros
  if (stats?.completedPomodoros > 0) score += Math.min(15, stats.completedPomodoros * 3);
  
  return Math.min(100, score);
}

export function getFallbackInsights(blocks, stats) {
  const today = new Date().toISOString().split('T')[0];
  const todayBlocks = blocks.filter(b => b.date === today);
  const focusScore = calculateFocusScore(blocks, stats);
  
  const insights = [
    'Focus on one task at a time for better results.',
    'Taking breaks improves overall productivity.',
    'Morning hours are often best for deep work.',
    'Batch similar tasks together to reduce context switching.',
    'End your day by planning tomorrow.'
  ];
  
  const encouragements = [
    'You\'re making great progress! 🌟',
    'Every block completed is a win! 💪',
    'Stay focused, you\'ve got this! 🎯',
    'Keep up the momentum! 🚀',
    'Your dedication is inspiring! ✨'
  ];
  
  return {
    greeting: getTimeBasedGreeting(),
    focusScore,
    todayInsight: todayBlocks.length > 0 
      ? `You have ${todayBlocks.length} block${todayBlocks.length > 1 ? 's' : ''} scheduled today.`
      : 'No blocks scheduled yet. Time to plan your day!',
    suggestion: insights[Math.floor(Math.random() * insights.length)],
    encouragement: encouragements[Math.floor(Math.random() * encouragements.length)]
  };
}

function getFallbackWeeklyReport(blocks, stats) {
  const categories = {};
  blocks.forEach(b => {
    categories[b.category] = (categories[b.category] || 0) + 1;
  });
  
  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
  
  return `## Weekly Productivity Summary

This week you scheduled **${blocks.length} blocks** across your calendar. ${topCategory ? `Your most active category was **${topCategory[0]}** with ${topCategory[1]} blocks.` : ''}

${stats?.completedPomodoros > 0 ? `You completed **${stats.completedPomodoros} pomodoro sessions**, showing great dedication to focused work. ` : ''}${stats?.currentStreak > 0 ? `Your current streak is **${stats.currentStreak} days** - keep it going!` : ''}

### Recommendations for Next Week
- Consider scheduling your most important tasks during your peak energy hours
- Try to maintain a balance between different activity categories
- Remember to include breaks to maintain sustainable productivity

Keep up the great work! 🎯`;
}

function getFallbackSchedulingSuggestions(blocks, category) {
  const suggestions = {
    work: ['09:00', '10:00', '14:00'],
    meeting: ['11:00', '14:00', '15:00'],
    personal: ['17:00', '18:00', '19:00'],
    learning: ['08:00', '16:00', '20:00'],
    exercise: ['06:00', '17:00', '18:00'],
    break: ['12:00', '15:00', '17:00']
  };
  
  return suggestions[category] || ['09:00', '14:00', '16:00'];
}
