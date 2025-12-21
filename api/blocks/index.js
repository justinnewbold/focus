import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Get all time blocks for today
      const { date } = req.query;
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const { rows } = await sql`
        SELECT * FROM time_blocks 
        WHERE date = ${targetDate}
        ORDER BY hour ASC
      `;
      
      return res.status(200).json({ blocks: rows });
    }

    if (req.method === 'POST') {
      // Create a new time block
      const { hour, title, category, duration, date } = req.body;
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const { rows } = await sql`
        INSERT INTO time_blocks (hour, title, category, duration, date, pomodoro_count, completed)
        VALUES (${hour}, ${title}, ${category}, ${duration}, ${targetDate}, 0, false)
        RETURNING *
      `;
      
      return res.status(201).json({ block: rows[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
}
