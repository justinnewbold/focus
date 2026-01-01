/**
 * Smart Auto-Scheduler
 * AI-powered automatic schedule filling based on priorities and patterns
 */

import { supabase } from '../supabase';
import { aiCoach } from './aiCoach';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Default time preferences by category
 */
const CATEGORY_TIME_PREFERENCES = {
  work: { preferredHours: [9, 10, 11, 14, 15, 16], defaultDuration: 50 },
  meeting: { preferredHours: [10, 11, 14, 15, 16], defaultDuration: 30 },
  break: { preferredHours: [12, 15, 17], defaultDuration: 15 },
  personal: { preferredHours: [8, 12, 17, 18], defaultDuration: 30 },
  learning: { preferredHours: [9, 14, 19, 20], defaultDuration: 45 },
  exercise: { preferredHours: [7, 8, 17, 18, 19], defaultDuration: 45 }
};

/**
 * Energy level mapping by hour
 */
const ENERGY_LEVELS = {
  6: 'low', 7: 'rising', 8: 'medium', 9: 'high', 10: 'peak', 11: 'peak',
  12: 'medium', 13: 'low', 14: 'rising', 15: 'high', 16: 'high',
  17: 'medium', 18: 'medium', 19: 'low', 20: 'low'
};

/**
 * Get user's productivity patterns
 */
async function getUserPatterns(userId) {
  const stats = await aiCoach.getUserStats(userId, 30);
  
  if (!stats || stats.totalBlocks < 10) {
    return null; // Not enough data
  }

  return {
    peakHours: stats.peakHours,
    avgBlocksPerDay: stats.avgBlocksPerDay,
    categoryPreferences: stats.categories,
    completionRate: stats.completionRate
  };
}

/**
 * Get existing blocks for a date
 */
async function getExistingBlocks(userId, date) {
  const { data: blocks } = await supabase
    .from('time_blocks')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date);
  
  return blocks || [];
}

/**
 * Find available time slots
 */
function findAvailableSlots(existingBlocks, startHour = 6, endHour = 21) {
  const occupied = new Map();
  
  // Mark occupied slots
  existingBlocks.forEach(block => {
    const start = block.hour * 60 + (block.start_minute || 0);
    const end = start + (block.duration || 25);
    
    for (let min = start; min < end; min += 5) {
      occupied.set(min, true);
    }
  });

  // Find available slots
  const slots = [];
  let slotStart = null;
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let min = 0; min < 60; min += 5) {
      const timeKey = hour * 60 + min;
      
      if (!occupied.has(timeKey)) {
        if (slotStart === null) {
          slotStart = { hour, minute: min };
        }
      } else if (slotStart !== null) {
        const duration = (hour * 60 + min) - (slotStart.hour * 60 + slotStart.minute);
        if (duration >= 15) {
          slots.push({
            hour: slotStart.hour,
            minute: slotStart.minute,
            duration,
            energyLevel: ENERGY_LEVELS[slotStart.hour] || 'medium'
          });
        }
        slotStart = null;
      }
    }
  }

  // Handle last slot
  if (slotStart !== null) {
    const duration = (endHour * 60) - (slotStart.hour * 60 + slotStart.minute);
    if (duration >= 15) {
      slots.push({
        hour: slotStart.hour,
        minute: slotStart.minute,
        duration,
        energyLevel: ENERGY_LEVELS[slotStart.hour] || 'medium'
      });
    }
  }

  return slots;
}

/**
 * Score a slot for a specific task
 */
function scoreSlot(slot, task, userPatterns) {
  let score = 50; // Base score

  // Time preference match
  const prefs = CATEGORY_TIME_PREFERENCES[task.category];
  if (prefs?.preferredHours.includes(slot.hour)) {
    score += 20;
  }

  // User's historical peak hours
  if (userPatterns?.peakHours?.includes(slot.hour)) {
    score += 25;
  }

  // Energy level match
  const taskEnergyNeeds = {
    work: ['high', 'peak'],
    meeting: ['medium', 'high'],
    break: ['low', 'medium'],
    personal: ['medium'],
    learning: ['high', 'peak'],
    exercise: ['medium', 'rising']
  };

  if (taskEnergyNeeds[task.category]?.includes(slot.energyLevel)) {
    score += 15;
  }

  // Duration fit
  const idealDuration = task.duration || prefs?.defaultDuration || 25;
  if (slot.duration >= idealDuration && slot.duration <= idealDuration + 30) {
    score += 10;
  } else if (slot.duration < idealDuration) {
    score -= 20; // Penalty for too short
  }

  // Prefer morning for important work
  if (task.priority === 'high' && slot.hour >= 9 && slot.hour <= 11) {
    score += 15;
  }

  // Avoid lunch time for focus work
  if (task.category === 'work' && slot.hour >= 12 && slot.hour <= 13) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Auto-schedule a single task
 */
export async function autoScheduleTask(userId, task, date = null) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  // Get context
  const [existingBlocks, userPatterns] = await Promise.all([
    getExistingBlocks(userId, targetDate),
    getUserPatterns(userId)
  ]);

  // Find available slots
  const availableSlots = findAvailableSlots(existingBlocks);
  
  if (availableSlots.length === 0) {
    return { success: false, error: 'No available time slots' };
  }

  // Score each slot
  const scoredSlots = availableSlots
    .map(slot => ({
      ...slot,
      score: scoreSlot(slot, task, userPatterns)
    }))
    .sort((a, b) => b.score - a.score);

  const bestSlot = scoredSlots[0];
  const duration = Math.min(task.duration || 25, bestSlot.duration);

  return {
    success: true,
    suggestion: {
      ...task,
      date: targetDate,
      hour: bestSlot.hour,
      start_minute: bestSlot.minute,
      duration,
      score: bestSlot.score,
      reason: generateReason(bestSlot, task, userPatterns)
    },
    alternatives: scoredSlots.slice(1, 4).map(slot => ({
      hour: slot.hour,
      minute: slot.minute,
      duration: Math.min(task.duration || 25, slot.duration),
      score: slot.score
    }))
  };
}

/**
 * Generate reason for scheduling suggestion
 */
function generateReason(slot, task, userPatterns) {
  const reasons = [];

  if (userPatterns?.peakHours?.includes(slot.hour)) {
    reasons.push('your peak productivity hour');
  }
  
  if (CATEGORY_TIME_PREFERENCES[task.category]?.preferredHours.includes(slot.hour)) {
    reasons.push(`optimal time for ${task.category}`);
  }

  if (slot.energyLevel === 'peak' || slot.energyLevel === 'high') {
    reasons.push('high energy period');
  }

  if (reasons.length === 0) {
    reasons.push('best available slot');
  }

  return `Scheduled based on ${reasons.join(' and ')}`;
}

/**
 * Auto-schedule multiple tasks with AI optimization
 */
export async function autoScheduleDay(userId, tasks, date = null) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  if (!tasks || tasks.length === 0) {
    return { success: false, error: 'No tasks to schedule' };
  }

  // Get context
  const [existingBlocks, userPatterns] = await Promise.all([
    getExistingBlocks(userId, targetDate),
    getUserPatterns(userId)
  ]);

  // Try AI-powered scheduling first
  if (GEMINI_API_KEY && tasks.length > 1) {
    const aiResult = await scheduleWithAI(tasks, existingBlocks, userPatterns, targetDate);
    if (aiResult.success) {
      return aiResult;
    }
  }

  // Fallback to greedy algorithm
  return scheduleGreedy(tasks, existingBlocks, userPatterns, targetDate);
}

/**
 * Schedule using AI
 */
async function scheduleWithAI(tasks, existingBlocks, userPatterns, date) {
  const availableSlots = findAvailableSlots(existingBlocks);
  
  const prompt = `You are a productivity scheduling assistant. Schedule these tasks optimally.

Tasks to schedule:
${tasks.map((t, i) => `${i + 1}. "${t.title}" - ${t.category} - ${t.duration || 25}min${t.priority ? ` - Priority: ${t.priority}` : ''}`).join('\n')}

Available time slots on ${date}:
${availableSlots.map(s => `- ${s.hour}:${String(s.minute).padStart(2, '0')} (${s.duration}min available, ${s.energyLevel} energy)`).join('\n')}

${userPatterns ? `User's peak productivity hours: ${userPatterns.peakHours?.join(', ')}` : ''}

Return ONLY a JSON array mapping tasks to time slots:
[{"taskIndex": 0, "hour": 9, "minute": 0, "reason": "why this time"}]

Rules:
- High priority tasks should go in peak hours
- Don't overlap tasks
- Leave buffer time between tasks when possible
- Match task type to energy levels (deep work = high energy, meetings = medium, breaks = low)`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.3 }
      })
    });

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    const jsonMatch = text?.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON found');

    const schedule = JSON.parse(jsonMatch[0]);
    
    // Validate and build result
    const scheduledTasks = schedule
      .filter(s => s.taskIndex >= 0 && s.taskIndex < tasks.length)
      .map(s => ({
        ...tasks[s.taskIndex],
        date,
        hour: s.hour,
        start_minute: s.minute || 0,
        reason: s.reason || 'AI optimized'
      }));

    return {
      success: true,
      scheduledTasks,
      source: 'ai',
      unscheduled: tasks.filter((_, i) => !schedule.find(s => s.taskIndex === i))
    };
  } catch (error) {
    console.log('AI scheduling failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Schedule using greedy algorithm
 */
function scheduleGreedy(tasks, existingBlocks, userPatterns, date) {
  const availableSlots = findAvailableSlots(existingBlocks);
  const scheduledTasks = [];
  const unscheduled = [];
  const usedSlots = new Set();

  // Sort tasks by priority
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
  });

  for (const task of sortedTasks) {
    // Find best slot for this task
    let bestSlot = null;
    let bestScore = -1;

    for (const slot of availableSlots) {
      const slotKey = `${slot.hour}:${slot.minute}`;
      if (usedSlots.has(slotKey)) continue;

      const taskDuration = task.duration || 25;
      if (slot.duration < taskDuration) continue;

      const score = scoreSlot(slot, task, userPatterns);
      if (score > bestScore) {
        bestScore = score;
        bestSlot = slot;
      }
    }

    if (bestSlot) {
      const taskDuration = task.duration || 25;
      scheduledTasks.push({
        ...task,
        date,
        hour: bestSlot.hour,
        start_minute: bestSlot.minute,
        reason: generateReason(bestSlot, task, userPatterns)
      });

      // Mark slot as used (simplified - marks start time)
      usedSlots.add(`${bestSlot.hour}:${bestSlot.minute}`);
      
      // Update slot's remaining duration
      bestSlot.duration -= taskDuration;
      bestSlot.minute += taskDuration;
      if (bestSlot.minute >= 60) {
        bestSlot.hour += Math.floor(bestSlot.minute / 60);
        bestSlot.minute = bestSlot.minute % 60;
      }
    } else {
      unscheduled.push(task);
    }
  }

  return {
    success: scheduledTasks.length > 0,
    scheduledTasks,
    unscheduled,
    source: 'greedy'
  };
}

/**
 * Suggest optimal time for a category
 */
export function suggestTimeForCategory(category, existingBlocks = [], userPatterns = null) {
  const prefs = CATEGORY_TIME_PREFERENCES[category] || CATEGORY_TIME_PREFERENCES.work;
  const availableSlots = findAvailableSlots(existingBlocks);
  
  // Find best hour
  for (const hour of prefs.preferredHours) {
    // Check if user's pattern suggests this is good
    if (userPatterns?.peakHours?.includes(hour)) {
      const slot = availableSlots.find(s => s.hour === hour && s.duration >= prefs.defaultDuration);
      if (slot) {
        return { hour, minute: slot.minute, duration: prefs.defaultDuration, confidence: 0.9 };
      }
    }
  }

  // Fallback to first preferred hour that's available
  for (const hour of prefs.preferredHours) {
    const slot = availableSlots.find(s => s.hour === hour && s.duration >= 15);
    if (slot) {
      return { hour, minute: slot.minute, duration: prefs.defaultDuration, confidence: 0.7 };
    }
  }

  // Last resort - first available slot
  if (availableSlots.length > 0) {
    return {
      hour: availableSlots[0].hour,
      minute: availableSlots[0].minute,
      duration: prefs.defaultDuration,
      confidence: 0.5
    };
  }

  return null;
}

/**
 * Generate daily schedule suggestion
 */
export async function generateDayTemplate(userId, date = null) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const userPatterns = await getUserPatterns(userId);

  // Build template based on patterns
  const template = [];
  
  // Morning focus block
  if (userPatterns?.peakHours?.includes(9) || userPatterns?.peakHours?.includes(10)) {
    template.push({
      title: 'Deep Work Block',
      category: 'work',
      hour: 9,
      start_minute: 0,
      duration: 90,
      reason: 'Your peak productivity time'
    });
  }

  // Mid-morning break
  template.push({
    title: 'Morning Break',
    category: 'break',
    hour: 10,
    start_minute: 30,
    duration: 15,
    reason: 'Recharge before next block'
  });

  // Late morning work
  template.push({
    title: 'Focus Session',
    category: 'work',
    hour: 11,
    start_minute: 0,
    duration: 50,
    reason: 'Continue momentum'
  });

  // Lunch
  template.push({
    title: 'Lunch Break',
    category: 'break',
    hour: 12,
    start_minute: 0,
    duration: 60,
    reason: 'Rest and refuel'
  });

  // Afternoon meetings/collaboration
  template.push({
    title: 'Collaboration Time',
    category: 'meeting',
    hour: 14,
    start_minute: 0,
    duration: 60,
    reason: 'Good time for meetings'
  });

  // Afternoon focus
  if (userPatterns?.peakHours?.includes(15) || userPatterns?.peakHours?.includes(16)) {
    template.push({
      title: 'Afternoon Focus',
      category: 'work',
      hour: 15,
      start_minute: 0,
      duration: 90,
      reason: 'Second productivity peak'
    });
  }

  // End of day
  template.push({
    title: 'Wrap Up & Planning',
    category: 'personal',
    hour: 17,
    start_minute: 0,
    duration: 30,
    reason: 'Review progress and plan tomorrow'
  });

  return {
    date: targetDate,
    template: template.map(t => ({ ...t, date: targetDate })),
    basedOnPatterns: !!userPatterns
  };
}

export const smartScheduler = {
  autoScheduleTask,
  autoScheduleDay,
  suggestTimeForCategory,
  generateDayTemplate,
  findAvailableSlots,
  getUserPatterns
};

export default smartScheduler;
