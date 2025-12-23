# FOCUS Mobile App (Expo/React Native)

## 🚀 Getting Started

This directory contains the configuration for building native iOS and Android apps using Expo.

### Prerequisites

1. **Node.js** (v18+)
2. **Expo CLI**: `npm install -g expo-cli`
3. **EAS CLI**: `npm install -g eas-cli`

### Quick Start

```bash
cd mobile
npm install
npx expo start
```

### Building for Production

#### iOS App Store
```bash
eas build:configure
eas build --platform ios --profile production
eas submit --platform ios
```

#### Google Play Store
```bash
eas build --platform android --profile production
eas submit --platform android
```

### Features

- ✅ Cross-platform (iOS + Android)
- ✅ Push notifications
- ✅ Background timer
- ✅ Supabase real-time sync
- ✅ Offline support
- ✅ Widgets (iOS 14+)
- ✅ Siri Shortcuts
- ✅ Deep linking

### Project Structure

```
mobile/
├── app.json           # Expo configuration
├── eas.json           # EAS Build configuration
├── App.tsx            # Main entry point
├── package.json       # Dependencies
└── assets/            # Icons & images
```

### Environment Variables

Create `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://wektbfkzbxvtxsremnnk.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---
Built with Expo and React Native
