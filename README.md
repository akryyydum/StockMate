# StockMate

StockMate is a React Native app built with Expo. It includes a login/register flow, a protected account screen, an Express API, and MongoDB-backed users and refresh sessions. The same client targets Android and installable desktop web (PWA).

The interface uses the brand-board palette (bone white `#ededef`, burnt yellow `#dcad0c`, pumpkin orange `#f86f0b`, and dirty orange `#ce7505`) and Poppins. The responsive web auth screen uses locally owned shadcn-style button/input primitives and the ReactBits `BlurText` animation. Android keeps native React Native controls and the same visual palette.

## Requirements

- Node.js and npm
- MongoDB locally or a MongoDB Atlas connection string
- For Android APK builds: an Expo account and EAS CLI access

## Run locally

1. Install the mobile/web dependencies from the project root:

   ```sh
   npm install
   ```

2. Configure and start MongoDB. Copy `server/.env.example` to `server/.env`, set `MONGODB_URI`, and replace `JWT_ACCESS_SECRET` with a random value of at least 32 bytes. For example:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
   ```

3. Install and start the API:

   ```sh
   npm install --prefix server
   npm run api:dev
   ```

4. In a separate terminal, copy `.env.example` to `.env`. Set `EXPO_PUBLIC_API_URL` to the reachable API base URL, then start the app:

   ```sh
   npm start
   ```

   Press `a` to open Android, or start the desktop web version with `npm run web`.

For a physical Android device, use your computer's LAN IP instead of `localhost`, for example `EXPO_PUBLIC_API_URL=http://192.168.1.25:4000/api`. The API and device must be able to reach each other through the local network and firewall.

## Android APK

The `preview` EAS profile creates an installable APK:

```sh
npx eas-cli@latest build:configure
npx eas-cli@latest build --profile preview --platform android
```

Follow the EAS prompts to authenticate and configure the project. Set the production API URL in `EXPO_PUBLIC_API_URL` before building. Do not ship an HTTP API URL; use HTTPS in deployed environments.

## Desktop app

The desktop target is a responsive web app configured as a standalone PWA. Set `EXPO_PUBLIC_API_URL` to the deployed HTTPS API URL, then export:

```sh
npm run web:export
```

Deploy the generated `dist/` directory to a static host over HTTPS. On supported browsers, users can install StockMate from the browser's install control. Configure the API's `CORS_ORIGINS` to include the exact HTTPS origin hosting the web app.

## Authentication and security

- Registration passwords are validated on both client and API; the API hashes passwords with bcrypt and never returns password hashes.
- Access JWTs expire after 15 minutes. Random 30-day refresh tokens are stored as SHA-256 hashes in MongoDB, rotated on refresh, and removed on logout. MongoDB expires old refresh-token records with a TTL index.
- On Android, the refresh token is stored using Expo SecureStore (Android Keystore-backed). On web, tokens stay in memory and are not persisted across a page reload.
- Authentication endpoints have an IP-based rate limit. Helmet security headers, explicit CORS origins, a 10 KB JSON body limit, and server-side Zod validation are enabled.
- Provide a strong `JWT_ACCESS_SECRET`, use HTTPS in production, and keep `.env` files out of source control.

This is an authentication starter, not a complete production identity platform. Add email verification, password reset, monitoring, backups, and deployment-specific proxy/rate-limit configuration before a public launch.
