# FOCUS ⏱️

A powerful productivity app combining time blocking with Pomodoro timers, AI-powered insights, and Google Calendar sync.

**Live App:** [focus.newbold.cloud](https://focus.newbold.cloud)

## ✨ Features

### Core Features
- 📅 **Weekly Time Blocking** - Plan your week with drag-and-drop blocks
- 🍅 **Pomodoro Timer** - Customizable focus sessions (5min - 2hr)
- 📊 **Analytics Dashboard** - Track your productivity patterns
- 🎯 **Goals & Streaks** - Set daily/weekly goals and maintain streaks
- 🌙 **Dark Mode** - Multiple themes (Light, Dark, Midnight Blue, Sunset)
- 📱 **PWA Support** - Install on mobile, works offline

### AI Features (Gemini-powered)
- 🤖 **AI Assistant** - Daily personalized productivity insights
- 📈 **Focus Score** - AI-calculated productivity rating
- 💡 **Smart Suggestions** - AI recommendations based on your patterns
- 📝 **Weekly AI Reports** - Auto-generated productivity summaries

### Google Calendar Integration
- 🔄 **Two-way Sync** - Push blocks to Google Calendar
- 📥 **Import Events** - Pull calendar events as FOCUS blocks
- 📆 **Multi-calendar** - Choose which calendar to sync

### Productivity Tools
- ⚡ **Quick Add (⌘K)** - Rapidly add blocks with natural language
- 🧘 **Focus Mode** - Distraction-free full-screen timer
- ⌨️ **Keyboard Shortcuts** - Navigate entirely with keyboard
- 🔔 **Push Notifications** - Get alerted when timers complete

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | New block |
| `Q` | Quick add |
| `A` | Open analytics |
| `F` | Focus mode |
| `Space` | Toggle timer |
| `R` | Reset timer |
| `Escape` | Close modals |

## 🛠️ Tech Stack

- **Frontend:** React 18 + Vite
- **Backend:** Supabase (Auth, Database, Realtime)
- **AI:** Google Gemini API
- **Calendar:** Google Calendar API
- **Hosting:** Vercel
- **PWA:** vite-plugin-pwa

## 📦 Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GOOGLE_API_KEY=your_google_api_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## 🚀 Development

```bash
npm install
npm run dev
```

## 📄 License

MIT License - feel free to use this project for your own productivity needs!

---

Built with ❤️ using React, Supabase, and AI
