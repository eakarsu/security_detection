# NodeGuard Mobile - AI Security Platform

A React Native mobile application for the NodeGuard AI-powered cybersecurity detection system. This app provides security professionals with real-time access to security metrics, incident management, and threat intelligence on the go.

## Features

### 🔐 Authentication
- Secure login with JWT token management
- Persistent authentication state
- Automatic token refresh

### 📊 Security Dashboard
- Real-time security metrics and KPIs
- System health monitoring
- Risk level assessment with visual indicators
- Quick action buttons for common tasks

### 🚨 Incident Management
- Browse and filter security incidents
- Real-time incident status updates
- Severity-based prioritization
- Detailed incident view with status management

### 📱 Push Notifications
- Critical security alerts
- Incident status updates
- System notifications
- Configurable notification channels

### 🎨 Modern UI/UX
- Dark theme optimized for security operations
- Material Design components
- Responsive design for various screen sizes
- Intuitive navigation with bottom tabs

## Architecture

### Technology Stack
- **Framework**: Expo / React Native
- **Language**: TypeScript
- **Navigation**: React Navigation v6
- **State Management**: React Hooks + Context
- **Storage**: AsyncStorage + Expo SecureStore
- **Notifications**: Expo Notifications
- **HTTP Client**: Axios

### Project Structure
```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components
│   ├── LoginScreen.tsx
│   ├── DashboardScreen.tsx
│   └── IncidentsScreen.tsx
├── navigation/         # Navigation configuration
├── services/           # API and external service integrations
│   ├── api.ts         # API service with axios
│   ├── storage.ts     # Storage utilities
│   └── notifications.ts # Push notification service
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── constants/          # App configuration and constants
└── utils/              # Utility functions
```

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (for development)

### Setup
1. Navigate to the mobile app directory:
   ```bash
   cd mobile/mobile/NodeGuardMobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure API endpoint:
   - Update `API_CONFIG.BASE_URL` in `src/constants/config.ts`
   - For development, ensure your backend is running on `http://localhost:3001`

### Running the App

#### Development
```bash
# Start Expo development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Run on web (for testing)
npx expo start --web
```

#### Production Build
```bash
# Build for iOS
npx expo build:ios

# Build for Android
npx expo build:android
```

## Configuration

### Environment Variables
The app uses configuration constants in `src/constants/config.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: __DEV__ ? 'http://localhost:3001' : 'https://your-api-domain.com',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};
```

### Notification Setup
Push notifications are configured automatically. For production:
1. Configure push notification credentials in Expo
2. Update notification channels in `src/services/notifications.ts`

## API Integration

The mobile app connects to the NodeGuard backend API with the following endpoints:

### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile
- `POST /auth/refresh` - Refresh token

### Security Data
- `GET /security/incidents` - Fetch security incidents
- `PUT /security/incidents/:id` - Update incident status
- `GET /security/metrics` - Get threat metrics
- `GET /dashboard/stats` - Dashboard statistics

## Key Components

### Authentication Flow
- Automatic token storage using Expo SecureStore
- Token refresh on API 401 responses
- Persistent login state across app restarts

### Real-time Updates
- Pull-to-refresh on all data screens
- Background refresh when app becomes active
- Push notifications for critical alerts

### Security Features
- Secure token storage
- API request/response logging for debugging
- Input validation and sanitization
- Network error handling

## Customization

### Theming
Colors and styling are centralized in `src/constants/config.ts`:

```typescript
export const COLORS = {
  primary: '#2196F3',
  background: '#0A0E27',
  surface: '#1A1D3A',
  // ... more colors
};
```

### Notification Types
Customize notification behavior in `src/services/notifications.ts`:
- Critical security alerts (high priority)
- Incident updates (normal priority)
- System notifications (low priority)

## Testing

```bash
# Run TypeScript type checking
npx tsc --noEmit

# Lint code
npx eslint src --ext .ts,.tsx

# Run tests (if configured)
npm test
```

## Deployment

### Development
The app is configured to connect to `localhost:3001` for development. Ensure your NodeGuard backend is running locally.

### Production
1. Update API endpoint in configuration
2. Build the app using Expo build service
3. Submit to App Store / Google Play Store

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Verify backend is running
   - Check API endpoint configuration
   - Ensure network connectivity

2. **Push Notifications Not Working**
   - Verify notification permissions
   - Check Expo push notification setup
   - Test on physical device (notifications don't work in simulators)

3. **Build Failures**
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall
   - Check Expo SDK compatibility

## Contributing

1. Follow the existing code structure
2. Use TypeScript for all new code
3. Test on both iOS and Android
4. Update documentation for new features

## License

This project is part of the NodeGuard AI Security Platform.