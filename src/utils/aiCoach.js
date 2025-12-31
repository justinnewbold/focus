/**
 * AI Productivity Coach
 * Personalized insights and recommendations using Gemini AI
 */

import { supabase } from '../supabase';

// Gemini API configuration
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Call Gemini API
 */
async function callGemini(prompt, maxTokens = 500) {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured');
    return null;
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.7,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error('Gemini API error:', error);
    return null;
  }
}

/**
 * Get user's productivity stats for AI analysis
 */
async function getUserStats(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  // Get time blocks
  const { data: blocks } = await supabase
    .from('time_blocks')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDateStr)
    .order('date', { ascending: false });

  if (!blocks || blocks.length === 0) {
    return null;
  }

  // Calculate stats
  const totalBlocks = blocks.length;
  const completedBlocks = blocks.filter(b => b.completed).length;
  const completionRate = Math.round((completedBlocks / totalBlocks) * 100);

  // Category breakdown
  const categories = {};
  blocks.forEach(b => {
    categories[b.category] = (categories[b.category] || 0) + 1;
  });

  // Time of day analysis
  const hourlyCompletions = {};
  blocks.filter(b => b.completed).forEach(b => {
    const hour = b.hour || 9;
    hourlyCompletions[hour] = (hourlyCompletions[hour] || 0) + 1;
  });

  // Find peak hours
  const peakHours = Object.entries(hourlyCompletions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));

  // Daily patterns
  const dailyBlocks = {};
  blocks.forEach(b => {
    dailyBlocks[b.date] = (dailyBlocks[b.date] || 0) + 1;
  });

  const avgBlocksPerDay = Math.round(totalBlocks / days);

  // Duration stats
  const durations = blocks.map(b => b.duration || 25);
  const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  const totalMinutes = durations.reduce((a, b) => a + b, 0);

  // Streak info
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  const sortedDates = [...new Set(blocks.map(b => b.date))].sort().reverse();
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  if (sortedDates[0] === today || sortedDates[0] === yesterday) {
    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expected = expectedDate.toISOString().split('T')[0];
      
      if (sortedDates[i] === expected) {
        tempStreak++;
      } else {
        break;
      }
    }
    currentStreak = tempStreak;
  }

  // Calculate longest streak
  tempStreak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = (prev - curr) / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  return {
    totalBlocks,
    completedBlocks,
    completionRate,
    categories,
    peakHours,
    avgBlocksPerDay,
    avgDuration,
    totalMinutes,
    currentStreak,
    longestStreak,
    daysAnalyzed: days
  };
}

/**
 * Generate daily tip based on user stats
 */
async function generateDailyTip(userId) {
  const stats = await getUserStats(userId, 14);
  
  if (!stats) {
    return {
      tip: "Start your first focus session to get personalized insights! 🚀",
      category: 'getting_started',
      icon: '🌟'
    };
  }

  const prompt = `You are a friendly productivity coach. Based on these stats from the last 14 days, give ONE short, specific, actionable tip (2-3 sentences max).

Stats:
- Completion rate: ${stats.completionRate}%
- Most productive hours: ${stats.peakHours.map(h => `${h}:00`).join(', ')}
- Average blocks per day: ${stats.avgBlocksPerDay}
- Current streak: ${stats.currentStreak} days
- Top categories: ${Object.entries(stats.categories).sort((a,b) => b[1] - a[1]).slice(0, 3).map(([cat, count]) => `${cat} (${count})`).join(', ')}
- Total focus time: ${Math.round(stats.totalMinutes / 60)} hours

Be encouraging and specific. Reference their actual data. Don't use bullet points. End with an emoji.`;

  const aiTip = await callGemini(prompt, 150);
  
  // Fallback tips based on stats
  const fallbackTips = [
    stats.completionRate < 50 && {
      tip: `Your completion rate is ${stats.completionRate}%. Try shorter 15-minute blocks to build momentum! 💪`,
      category: 'completion',
      icon: '🎯'
    },
    stats.currentStreak > 0 && {
      tip: `Amazing! You're on a ${stats.currentStreak}-day streak! Keep the momentum going today! 🔥`,
      category: 'streak',
      icon: '🔥'
    },
    stats.peakHours.length > 0 && {
      tip: `Your peak productivity is around ${stats.peakHours[0]}:00. Schedule your most important work then! ⏰`,
      category: 'timing',
      icon: '⏰'
    },
    {
      tip: `You've logged ${Math.round(stats.totalMinutes / 60)} hours of focused work. Every minute counts! 🌟`,
      category: 'encouragement',
      icon: '🌟'
    }
  ].filter(Boolean);

  if (aiTip) {
    return {
      tip: aiTip,
      category: 'ai_generated',
      icon: '🤖'
    };
  }

  return fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
}

/**
 * Generate weekly insights report
 */
async function generateWeeklyInsights(userId) {
  const stats = await getUserStats(userId, 7);
  const prevStats = await getUserStats(userId, 14);

  if (!stats) {
    return null;
  }

  // Calculate week-over-week changes
  const completionChange = prevStats 
    ? stats.completionRate - (prevStats.completionRate || 0)
    : 0;

  const prompt = `You are a productivity coach giving a brief weekly review. Based on these stats, write 3-4 sentences of insights and one recommendation.

This Week's Stats:
- ${stats.completedBlocks} of ${stats.totalBlocks} blocks completed (${stats.completionRate}%)
- Total focus time: ${Math.round(stats.totalMinutes / 60)} hours
- Peak hours: ${stats.peakHours.map(h => `${h}:00`).join(', ')}
- Current streak: ${stats.currentStreak} days
- Categories: ${Object.entries(stats.categories).map(([cat, count]) => `${cat}: ${count}`).join(', ')}
- Completion rate ${completionChange >= 0 ? 'improved' : 'decreased'} by ${Math.abs(completionChange)}% from last week

Be conversational, encouraging, and specific. End with a clear action item for next week.`;

  const aiInsights = await callGemini(prompt, 300);

  return {
    stats,
    completionChange,
    insights: aiInsights || generateFallbackInsights(stats, completionChange),
    generatedAt: new Date().toISOString()
  };
}

/**
 * Fallback insights if AI fails
 */
function generateFallbackInsights(stats, completionChange) {
  const insights = [];
  
  if (stats.completionRate >= 80) {
    insights.push(`Excellent work! You completed ${stats.completionRate}% of your planned blocks.`);
  } else if (stats.completionRate >= 50) {
    insights.push(`Good progress with ${stats.completionRate}% completion. Try breaking larger tasks into smaller blocks.`);
  } else {
    insights.push(`You completed ${stats.completionRate}% this week. Consider setting fewer, more achievable goals.`);
  }

  if (stats.peakHours.length > 0) {
    insights.push(`Your most productive time is around ${stats.peakHours[0]}:00.`);
  }

  if (completionChange > 0) {
    insights.push(`Great improvement! Your completion rate increased by ${completionChange}%.`);
  }

  return insights.join(' ');
}

/**
 * Get personalized schedule suggestions
 */
async function getScheduleSuggestions(userId, date = null) {
  const stats = await getUserStats(userId, 30);
  
  if (!stats || stats.totalBlocks < 10) {
    return {
      suggestions: [
        { hour: 9, category: 'work', reason: 'Great time to start deep work' },
        { hour: 12, category: 'break', reason: 'Lunch break' },
        { hour: 14, category: 'meeting', reason: 'Post-lunch meetings' },
        { hour: 16, category: 'work', reason: 'Afternoon focus block' }
      ],
      message: 'Default suggestions - complete more blocks to get personalized recommendations!'
    };
  }

  const prompt = `Based on this user's productivity patterns, suggest an optimal daily schedule.

User Patterns:
- Peak productivity hours: ${stats.peakHours.map(h => `${h}:00`).join(', ')}
- Average ${stats.avgBlocksPerDay} blocks per day
- Category preferences: ${Object.entries(stats.categories).sort((a,b) => b[1] - a[1]).map(([cat, count]) => cat).join(', ')}
- Average block duration: ${stats.avgDuration} minutes

Return ONLY a JSON array with 4-6 time slots:
[{"hour": 9, "category": "work", "duration": 50, "reason": "Peak focus time"}]

Categories: work, meeting, break, personal, learning, exercise`;

  const aiResponse = await callGemini(prompt, 400);
  
  try {
    // Try to parse JSON from AI response
    const jsonMatch = aiResponse?.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]);
      return {
        suggestions,
        message: 'Personalized based on your productivity patterns',
        basedOn: stats
      };
    }
  } catch (e) {
    console.log('Could not parse AI suggestions');
  }

  // Fallback to pattern-based suggestions
  return {
    suggestions: stats.peakHours.slice(0, 3).map((hour, i) => ({
      hour,
      category: i === 0 ? 'work' : i === 1 ? 'work' : 'learning',
      duration: stats.avgDuration,
      reason: i === 0 ? 'Your most productive hour' : `High productivity time`
    })),
    message: 'Based on your most productive hours'
  };
}

/**
 * Analyze task and suggest improvements
 */
async function analyzeTask(title, category, duration) {
  const prompt = `A user is planning a task:
Title: "${title}"
Category: ${category}
Duration: ${duration} minutes

In 1-2 sentences, give a helpful tip for this specific task. Be encouraging and practical.`;

  const tip = await callGemini(prompt, 100);
  return tip || `Good planning! ${duration} minutes for "${title}" sounds reasonable. Stay focused! 💪`;
}

/**
 * Generate encouragement message
 */
async function getEncouragement(context = 'general') {
  const prompts = {
    general: 'Give a short (1 sentence) motivational message for someone about to start a focus session.',
    streak: 'Give a short (1 sentence) celebration message for maintaining a productivity streak.',
    completion: 'Give a short (1 sentence) congratulations for completing a focus block.',
    break: 'Give a short (1 sentence) reminder about the importance of taking breaks.',
    morning: 'Give a short (1 sentence) motivational morning message to start a productive day.'
  };

  const message = await callGemini(prompts[context] || prompts.general, 50);
  
  const fallbacks = {
    general: "You've got this! One focused block at a time. 💪",
    streak: "Amazing streak! Consistency is the key to success! 🔥",
    completion: "Well done! Every completed task is a step forward! ✅",
    break: "Great work! Take a moment to recharge. You deserve it! ☕",
    morning: "Good morning! Today is full of possibilities! 🌅"
  };

  return message || fallbacks[context] || fallbacks.general;
}

/**
 * Get real-time coaching during focus session
 */
async function getSessionCoaching(minutesRemaining, taskTitle) {
  if (minutesRemaining > 20) {
    return null; // Don't interrupt early in session
  }

  if (minutesRemaining === 5) {
    return {
      message: "5 minutes left! Great focus. Start wrapping up your current thought. 🏁",
      type: 'reminder'
    };
  }

  if (minutesRemaining === 1) {
    return {
      message: "Almost there! Finish strong! 💪",
      type: 'encouragement'
    };
  }

  return null;
}

/**
 * Cache insights to avoid repeated API calls
 */
const insightsCache = new Map();

async function getCachedDailyTip(userId) {
  const cacheKey = `tip_${userId}_${new Date().toISOString().split('T')[0]}`;
  
  if (insightsCache.has(cacheKey)) {
    return insightsCache.get(cacheKey);
  }

  const tip = await generateDailyTip(userId);
  insightsCache.set(cacheKey, tip);
  
  // Clear cache after 4 hours
  setTimeout(() => insightsCache.delete(cacheKey), 4 * 60 * 60 * 1000);
  
  return tip;
}

export const aiCoach = {
  generateDailyTip,
  generateWeeklyInsights,
  getScheduleSuggestions,
  analyzeTask,
  getEncouragement,
  getSessionCoaching,
  getCachedDailyTip,
  getUserStats
};

export default aiCoach;
