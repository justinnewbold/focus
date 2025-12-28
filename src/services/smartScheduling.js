// AI Smart Scheduling Service for FOCUS
// Uses Gemini AI to suggest optimal times for tasks

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

class SmartSchedulingService {
  constructor() {
    this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent';
  }

  // Analyze productivity patterns from blocks
  analyzePatterns(blocks) {
    const patterns = {
      hourlyProductivity: {},
      dayOfWeekProductivity: {},
      avgSessionLength: 0,
      peakHours: [],
      bestDays: []
    };

    if (!blocks.length) return patterns;

    // Analyze by hour
    blocks.forEach(block => {
      if (!block.completed || !block.start_time) return;
      const hour = parseInt(block.start_time.split(':')[0]);
      // duration_minutes is the block duration, timer_duration is pomodoro timer (both in minutes)
      const duration = block.duration_minutes || block.timer_duration || 25;

      if (!patterns.hourlyProductivity[hour]) {
        patterns.hourlyProductivity[hour] = { total: 0, count: 0 };
      }
      patterns.hourlyProductivity[hour].total += duration;
      patterns.hourlyProductivity[hour].count++;

      // By day of week
      const day = new Date(block.date || block.created_at).getDay();
      if (!patterns.dayOfWeekProductivity[day]) {
        patterns.dayOfWeekProductivity[day] = { total: 0, count: 0 };
      }
      patterns.dayOfWeekProductivity[day].total += duration;
      patterns.dayOfWeekProductivity[day].count++;
    });

    // Find peak hours
    const hourlyAvg = Object.entries(patterns.hourlyProductivity)
      .map(([hour, data]) => ({ hour: parseInt(hour), avg: data.total / data.count }))
      .sort((a, b) => b.avg - a.avg);
    patterns.peakHours = hourlyAvg.slice(0, 3).map(h => h.hour);

    // Find best days
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daylyAvg = Object.entries(patterns.dayOfWeekProductivity)
      .map(([day, data]) => ({ day: dayNames[parseInt(day)], avg: data.total / data.count }))
      .sort((a, b) => b.avg - a.avg);
    patterns.bestDays = daylyAvg.slice(0, 2).map(d => d.day);

    // Average session (in minutes)
    const completedBlocks = blocks.filter(b => b.completed);
    patterns.avgSessionLength = completedBlocks.length > 0
      ? completedBlocks.reduce((sum, b) => sum + (b.duration_minutes || b.timer_duration || 25), 0) / completedBlocks.length
      : 25;

    return patterns;
  }

  // Find free time slots for today
  findFreeSlots(existingBlocks, date = new Date()) {
    const dateStr = date.toISOString().split('T')[0];
    const todayBlocks = existingBlocks.filter(b => 
      (b.date || '').startsWith(dateStr)
    ).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

    const freeSlots = [];
    const workStart = 8;
    const workEnd = 20;
    let lastEnd = workStart;

    todayBlocks.forEach(block => {
      if (!block.start_time) return;
      const [hours, mins] = block.start_time.split(':').map(Number);
      const blockStart = hours + mins / 60;
      // duration_minutes/timer_duration are in minutes, convert to hours for calculation
      const durationMinutes = block.duration_minutes || block.timer_duration || 25;
      const duration = durationMinutes / 60;
      const blockEnd = blockStart + duration;

      if (blockStart > lastEnd) {
        freeSlots.push({
          start: lastEnd,
          end: blockStart,
          duration: (blockStart - lastEnd) * 60
        });
      }
      lastEnd = Math.max(lastEnd, blockEnd);
    });

    if (lastEnd < workEnd) {
      freeSlots.push({
        start: lastEnd,
        end: workEnd,
        duration: (workEnd - lastEnd) * 60
      });
    }

    return freeSlots;
  }

  // AI-powered scheduling suggestion
  async suggestTimeSlot(taskInfo, existingBlocks, patterns) {
    if (!GEMINI_API_KEY) {
      return this.fallbackSuggestion(taskInfo, existingBlocks, patterns);
    }

    const freeSlots = this.findFreeSlots(existingBlocks);
    const prompt = `You are a productivity AI assistant. Suggest the best time slot for a task.

Task: "${taskInfo.title}"
Category: ${taskInfo.category || 'General'}
Duration needed: ${taskInfo.duration || 25} minutes

User's productivity patterns:
- Peak hours: ${patterns.peakHours.join(', ')} (24h format)
- Best days: ${patterns.bestDays.join(', ')}
- Average session: ${Math.round(patterns.avgSessionLength)} minutes

Available time slots today:
${freeSlots.map(s => `- ${Math.floor(s.start)}:${String(Math.round((s.start % 1) * 60)).padStart(2, '0')} to ${Math.floor(s.end)}:${String(Math.round((s.end % 1) * 60)).padStart(2, '0')} (${Math.round(s.duration)} mins available)`).join('\n')}

Respond with JSON only: {"suggestedTime": "HH:MM", "reason": "brief explanation"}`;

    try {
      const response = await fetch(`${this.apiEndpoint}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 200 }
        })
      });

      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('AI scheduling error:', error);
    }

    return this.fallbackSuggestion(taskInfo, existingBlocks, patterns);
  }

  // Fallback when AI unavailable
  fallbackSuggestion(taskInfo, existingBlocks, patterns) {
    const freeSlots = this.findFreeSlots(existingBlocks);
    const duration = taskInfo.duration || 25;

    // Find a slot that fits and aligns with peak hours
    let bestSlot = freeSlots.find(slot => {
      const slotMins = slot.duration;
      const slotHour = Math.floor(slot.start);
      return slotMins >= duration && patterns.peakHours.includes(slotHour);
    });

    if (!bestSlot) {
      bestSlot = freeSlots.find(slot => slot.duration >= duration);
    }

    if (!bestSlot) {
      return {
        suggestedTime: '09:00',
        reason: 'No available slots found. Default morning time suggested.'
      };
    }

    const hour = Math.floor(bestSlot.start);
    const mins = Math.round((bestSlot.start % 1) * 60);

    return {
      suggestedTime: `${String(hour).padStart(2, '0')}:${String(mins).padStart(2, '0')}`,
      reason: patterns.peakHours.includes(hour) 
        ? `This is one of your peak productivity hours based on past patterns.`
        : `First available slot that fits your ${duration} minute task.`
    };
  }

  // Get daily schedule optimization suggestions
  async optimizeSchedule(blocks, goals) {
    const patterns = this.analyzePatterns(blocks);
    const freeSlots = this.findFreeSlots(blocks);
    
    const suggestions = [];

    // Check if user has blocks during peak hours
    const todayBlocks = blocks.filter(b => {
      const d = new Date(b.date || b.created_at);
      return d.toDateString() === new Date().toDateString();
    });

    const peakHourBlocks = todayBlocks.filter(b => {
      if (!b.start_time) return false;
      const hour = parseInt(b.start_time.split(':')[0]);
      return patterns.peakHours.includes(hour);
    });

    if (peakHourBlocks.length === 0 && freeSlots.some(s => patterns.peakHours.includes(Math.floor(s.start)))) {
      suggestions.push({
        type: 'peak-hours',
        message: `Your peak productivity hours are ${patterns.peakHours.map(h => `${h}:00`).join(', ')}. Consider scheduling important tasks then.`,
        priority: 'high'
      });
    }

    // Check for long uninterrupted periods
    const longFreeSlot = freeSlots.find(s => s.duration > 120);
    if (longFreeSlot) {
      suggestions.push({
        type: 'deep-work',
        message: `You have ${Math.round(longFreeSlot.duration)} minutes free starting at ${Math.floor(longFreeSlot.start)}:00. Great for deep work!`,
        priority: 'medium'
      });
    }

    // Break reminder
    const consecutiveBlocks = todayBlocks.filter((b, i, arr) => {
      if (i === 0) return false;
      const prevEnd = arr[i-1].start_time;
      return b.start_time && prevEnd && 
        Math.abs(parseInt(b.start_time) - parseInt(prevEnd)) <= 1;
    });

    if (consecutiveBlocks.length >= 3) {
      suggestions.push({
        type: 'break-needed',
        message: 'You have several back-to-back sessions. Remember to take breaks for better focus!',
        priority: 'medium'
      });
    }

    return { patterns, suggestions, freeSlots };
  }
}

export const smartSchedulingService = new SmartSchedulingService();
export default smartSchedulingService;
