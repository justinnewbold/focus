# TimeFlow ⏱️

A beautiful time blocking app with Pomodoro timer, built with React and Supabase.

![TimeFlow](https://img.shields.io/badge/TimeFlow-v1.1.0-FF6B6B)
![React](https://img.shields.io/badge/React-18.2-61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000)

## 🚀 Live Demo

**[focus.newbold.cloud](https://focus.newbold.cloud)**

## ✨ Features

- **🍅 Pomodoro Timer**: 25-minute focus sessions with 5/15-minute breaks
- **📅 Time Blocking**: Plan your day from 6 AM to 9 PM
- **📊 Statistics Dashboard**: Track hours planned, focus time, and completed pomodoros
- **🔔 Browser Notifications**: Get notified when timers complete
- **🎨 Beautiful UI**: Modern dark theme with gradient accents
- **☁️ Cloud Sync**: Data persists with Supabase PostgreSQL
- **📱 Offline Support**: LocalStorage fallback when offline

## 🏗️ Tech Stack

- **Frontend**: React 18, Vite
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Styling**: Inline styles with CSS-in-JS

## 📦 Setup

### 1. Clone and Install

```bash
git clone https://github.com/justinnewbold/focus.git
cd focus
npm install
```

### 2. Supabase Setup

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/schema.sql`
4. Click **Run** to create the tables

### 3. Environment Variables

The environment variables are automatically configured when you connect Supabase to Vercel.

For local development, create a `.env.local` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Locally

```bash
npm run dev
```

## 📊 Database Schema

### time_blocks
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| hour | INTEGER | Hour of the day (0-23) |
| title | TEXT | Task name |
| category | TEXT | work, meeting, break, personal, learning, exercise |
| duration | INTEGER | Duration in hours (1-8) |
| pomodoro_count | INTEGER | Completed pomodoros |
| completed | BOOLEAN | Task completion status |
| date | DATE | Date of the time block |

### pomodoro_stats
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| date | DATE | Unique date |
| pomodoros_completed | INTEGER | Total pomodoros for the day |
| focus_minutes | INTEGER | Total focus minutes |

## 🎯 Task Categories

- 🔴 **Work** - Deep work and focus tasks
- 🟣 **Meeting** - Calls and meetings
- 🟢 **Break** - Rest and relaxation
- 🟡 **Personal** - Personal tasks
- 🔵 **Learning** - Study and learning
- 🟠 **Exercise** - Physical activity

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Start/Pause Timer |
| R | Reset Timer |
| N | New Block |

## 📄 License

MIT License - feel free to use this for your own projects!

---

Built with ❤️ using React and Supabase
