/**
 * Natural Language Task Parser
 * Parses natural language input into structured time block data
 * Uses Gemini AI for complex parsing, with rule-based fallback
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Category keywords mapping
 */
const CATEGORY_KEYWORDS = {
  work: ['work', 'coding', 'code', 'develop', 'programming', 'debug', 'review', 'project', 'task', 'report', 'write', 'document', 'research', 'analysis', 'design', 'build', 'create', 'implement', 'fix', 'update'],
  meeting: ['meeting', 'meet', 'call', 'sync', 'standup', 'stand-up', 'interview', 'presentation', 'demo', 'discussion', 'chat', 'conference', 'webinar', '1:1', 'one-on-one'],
  break: ['break', 'rest', 'lunch', 'coffee', 'snack', 'relax', 'recharge', 'nap', 'stretch'],
  personal: ['personal', 'errand', 'appointment', 'doctor', 'dentist', 'bank', 'shopping', 'pickup', 'drop off', 'family', 'home'],
  learning: ['learn', 'study', 'course', 'tutorial', 'read', 'reading', 'book', 'article', 'watch', 'video', 'practice', 'training', 'class', 'lesson', 'education'],
  exercise: ['exercise', 'workout', 'gym', 'run', 'running', 'walk', 'walking', 'yoga', 'meditation', 'meditate', 'fitness', 'swim', 'bike', 'cycling', 'sports']
};

/**
 * Time pattern matchers
 */
const TIME_PATTERNS = {
  // Explicit times: "at 9am", "at 3:30pm", "9:00"
  explicit: /(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi,
  
  // Relative times: "in 2 hours", "in 30 minutes"
  relative: /in\s+(\d+)\s*(hour|hr|minute|min)s?/gi,
  
  // Named times: "morning", "afternoon", "evening"
  named: /(morning|afternoon|evening|noon|midnight|tonight)/gi,
  
  // Relative days: "tomorrow", "next monday"
  relativeDay: /(today|tomorrow|next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))/gi
};

/**
 * Duration pattern matchers
 */
const DURATION_PATTERNS = {
  // "for 2 hours", "2 hour", "30 minutes", "1.5 hours"
  explicit: /(?:for\s+)?(\d+(?:\.\d+)?)\s*(hour|hr|minute|min)s?/gi,
  
  // "2h", "30m", "1h30m"
  shorthand: /(\d+)h(?:(\d+)m)?|(\d+)m/gi,
  
  // Named durations: "quick", "long", "short"
  named: /(quick|short|long|brief|extended|full)/gi
};

/**
 * Parse natural language input into task data
 */
export async function parseNaturalLanguage(input, useAI = true) {
  const trimmedInput = input.trim();
  
  if (!trimmedInput) {
    return { success: false, error: 'Empty input' };
  }

  // Try AI parsing first for complex inputs
  if (useAI && GEMINI_API_KEY && trimmedInput.length > 10) {
    const aiResult = await parseWithAI(trimmedInput);
    if (aiResult.success) {
      return aiResult;
    }
  }

  // Fallback to rule-based parsing
  return parseWithRules(trimmedInput);
}

/**
 * Parse using Gemini AI
 */
async function parseWithAI(input) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentHour = today.getHours();

  const prompt = `Parse this task description into a structured format. Today is ${todayStr} and current time is ${currentHour}:00.

Input: "${input}"

Return ONLY a JSON object with these fields:
{
  "title": "task title without time/duration info",
  "category": "work|meeting|break|personal|learning|exercise",
  "date": "YYYY-MM-DD",
  "hour": 0-23,
  "minute": 0-55 (in 5-min increments),
  "duration": minutes (15-480),
  "confidence": 0-1
}

Rules:
- If no date specified, use today
- If no time specified, suggest a reasonable time based on task type
- If no duration specified, estimate based on task type (default 25 min for work, 30 min for meetings, 15 min for breaks)
- Round minutes to nearest 5
- Be conservative with duration estimates`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.3 }
      })
    });

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) throw new Error('No response');

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate and normalize
    return {
      success: true,
      data: normalizeTaskData(parsed, input),
      source: 'ai'
    };
  } catch (error) {
    console.log('AI parsing failed, using rules:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Parse using rule-based system
 */
function parseWithRules(input) {
  const lowerInput = input.toLowerCase();
  
  // Extract category
  const category = detectCategory(lowerInput);
  
  // Extract time
  const timeInfo = extractTime(lowerInput);
  
  // Extract duration
  const duration = extractDuration(lowerInput);
  
  // Extract date
  const date = extractDate(lowerInput);
  
  // Clean title (remove time/duration phrases)
  const title = cleanTitle(input);
  
  if (!title) {
    return { success: false, error: 'Could not extract task title' };
  }

  return {
    success: true,
    data: normalizeTaskData({
      title,
      category,
      date,
      hour: timeInfo.hour,
      minute: timeInfo.minute,
      duration,
      confidence: calculateConfidence(timeInfo, duration, category)
    }, input),
    source: 'rules'
  };
}

/**
 * Detect category from keywords
 */
function detectCategory(input) {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (input.includes(keyword)) {
        return category;
      }
    }
  }
  return 'work'; // Default
}

/**
 * Extract time from input
 */
function extractTime(input) {
  const now = new Date();
  let hour = null;
  let minute = 0;

  // Check explicit times first
  const explicitMatch = input.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (explicitMatch) {
    hour = parseInt(explicitMatch[1]);
    minute = explicitMatch[2] ? parseInt(explicitMatch[2]) : 0;
    const meridiem = explicitMatch[3]?.toLowerCase();
    
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    if (!meridiem && hour < 7) hour += 12; // Assume PM for small numbers
  }

  // Check named times
  if (hour === null) {
    if (input.includes('morning')) hour = 9;
    else if (input.includes('noon') || input.includes('midday')) hour = 12;
    else if (input.includes('afternoon')) hour = 14;
    else if (input.includes('evening')) hour = 18;
    else if (input.includes('night') || input.includes('tonight')) hour = 20;
  }

  // Check relative times
  if (hour === null) {
    const relativeMatch = input.match(/in\s+(\d+)\s*(hour|hr|minute|min)s?/i);
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1]);
      const unit = relativeMatch[2].toLowerCase();
      
      if (unit.startsWith('hour') || unit === 'hr') {
        hour = now.getHours() + amount;
        minute = now.getMinutes();
      } else {
        hour = now.getHours();
        minute = now.getMinutes() + amount;
        if (minute >= 60) {
          hour += Math.floor(minute / 60);
          minute = minute % 60;
        }
      }
    }
  }

  // Default to next available hour
  if (hour === null) {
    hour = now.getHours() + 1;
    if (hour > 20) hour = 9; // Next day morning
  }

  // Clamp to valid range
  hour = Math.max(6, Math.min(20, hour));
  minute = Math.round(minute / 5) * 5; // Round to 5 min

  return { hour, minute };
}

/**
 * Extract duration from input
 */
function extractDuration(input) {
  // Check explicit durations
  const explicitMatch = input.match(/(?:for\s+)?(\d+(?:\.\d+)?)\s*(hour|hr|minute|min)s?/i);
  if (explicitMatch) {
    const amount = parseFloat(explicitMatch[1]);
    const unit = explicitMatch[2].toLowerCase();
    
    if (unit.startsWith('hour') || unit === 'hr') {
      return Math.round(amount * 60);
    }
    return Math.round(amount);
  }

  // Check shorthand
  const shortMatch = input.match(/(\d+)h(?:(\d+)m)?|(\d+)m/i);
  if (shortMatch) {
    if (shortMatch[3]) return parseInt(shortMatch[3]); // Just minutes
    const hours = parseInt(shortMatch[1]) || 0;
    const mins = parseInt(shortMatch[2]) || 0;
    return hours * 60 + mins;
  }

  // Check named durations
  if (input.includes('quick') || input.includes('brief') || input.includes('short')) {
    return 15;
  }
  if (input.includes('long') || input.includes('extended')) {
    return 60;
  }
  if (input.includes('full') || input.includes('deep')) {
    return 90;
  }

  // Default based on detected category
  const category = detectCategory(input);
  const defaults = {
    work: 25,
    meeting: 30,
    break: 15,
    personal: 30,
    learning: 45,
    exercise: 30
  };
  
  return defaults[category] || 25;
}

/**
 * Extract date from input
 */
function extractDate(input) {
  const today = new Date();
  
  if (input.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  // Check for "next [day]"
  const dayMatch = input.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (dayMatch) {
    const targetDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      .indexOf(dayMatch[1].toLowerCase());
    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    return targetDate.toISOString().split('T')[0];
  }

  // Default to today
  return today.toISOString().split('T')[0];
}

/**
 * Clean title by removing time/duration phrases
 */
function cleanTitle(input) {
  let title = input
    // Remove time phrases
    .replace(/(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi, '')
    .replace(/in\s+\d+\s*(?:hour|hr|minute|min)s?/gi, '')
    .replace(/(morning|afternoon|evening|noon|tonight)/gi, '')
    .replace(/(today|tomorrow|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/gi, '')
    // Remove duration phrases
    .replace(/(?:for\s+)?\d+(?:\.\d+)?\s*(?:hour|hr|minute|min)s?/gi, '')
    .replace(/\d+h(?:\d+m)?|\d+m/gi, '')
    .replace(/(quick|short|long|brief|extended|full)\s+/gi, '')
    // Clean up
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize first letter
  return title.charAt(0).toUpperCase() + title.slice(1);
}

/**
 * Calculate confidence score
 */
function calculateConfidence(timeInfo, duration, category) {
  let confidence = 0.5; // Base confidence
  
  if (timeInfo.hour !== null) confidence += 0.2;
  if (duration !== 25) confidence += 0.15; // Non-default duration
  if (category !== 'work') confidence += 0.1; // Specific category detected
  
  return Math.min(1, confidence);
}

/**
 * Normalize and validate task data
 */
function normalizeTaskData(data, originalInput) {
  const today = new Date().toISOString().split('T')[0];
  
  return {
    title: data.title || cleanTitle(originalInput) || 'New Task',
    category: data.category || 'work',
    date: data.date || today,
    hour: Math.max(6, Math.min(20, data.hour || 9)),
    minute: Math.round((data.minute || 0) / 5) * 5,
    duration: Math.max(5, Math.min(480, data.duration || 25)),
    confidence: data.confidence || 0.5,
    originalInput
  };
}

/**
 * Generate suggestions based on partial input
 */
export function getSuggestions(input) {
  const suggestions = [];
  const lowerInput = input.toLowerCase();

  // Time suggestions
  if (lowerInput.includes('at') && !lowerInput.match(/at\s+\d/)) {
    suggestions.push('at 9am', 'at 2pm', 'at 10:30am');
  }

  // Duration suggestions
  if (lowerInput.includes('for') && !lowerInput.match(/for\s+\d/)) {
    suggestions.push('for 30 minutes', 'for 1 hour', 'for 2 hours');
  }

  // Category suggestions based on partial matches
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords.slice(0, 3)) {
      if (keyword.startsWith(lowerInput.split(' ').pop())) {
        suggestions.push(keyword);
      }
    }
  }

  return suggestions.slice(0, 5);
}

/**
 * Quick parse for preview (no AI, faster)
 */
export function quickParse(input) {
  return parseWithRules(input);
}

export default {
  parseNaturalLanguage,
  quickParse,
  getSuggestions
};
