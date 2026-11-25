# StockMate

StockMate is a React Native app built with Expo. It includes a secure sign-in flow, role-based user management, and café inventory tracking backed by an Express API and MongoDB. The same client targets Android and installable desktop web (PWA).

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

   If the database has no superadmin, startup creates one with a random email and password and prints them once in the API terminal. Sign in with those credentials and change both immediately. Restrict access to production server logs because they contain this one-time bootstrap password.

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

- Public registration is disabled. A first-use superadmin is bootstrapped only if the database has no superadmin; only superadmins can create admin or superadmin accounts. Admins can view the user list but cannot create accounts. Authorization is enforced by the API.
- The generated superadmin must change both its email address and password before using user management. Changing these credentials revokes all refresh sessions for that account.
- Passwords are validated by the API, hashed with bcrypt, and password hashes are never returned.
- Access JWTs expire after 15 minutes. Random 30-day refresh tokens are stored as SHA-256 hashes in MongoDB, rotated on refresh, and removed on logout. MongoDB expires old refresh-token records with a TTL index.
- On Android, the refresh token is stored using Expo SecureStore (Android Keystore-backed). On web, tokens stay in memory and are not persisted across a page reload.
- Authentication endpoints have an IP-based rate limit. Helmet security headers, explicit CORS origins, a 10 KB JSON body limit, and server-side Zod validation are enabled.
- Provide a strong `JWT_ACCESS_SECRET`, use HTTPS in production, and keep `.env` files out of source control.

## Inventory

- The authenticated dashboard tracks café products, categories, units, quantity on hand, minimum stock, unit cost, and stock value in PHP.
- Inventory status is calculated from on-hand quantity and the minimum stock level. Stock-in and stock-out actions update quantities and are recorded as dated movements.
- The overview cards and seven-day movement chart are calculated from stored inventory and movement records. User management is available separately from the responsive sidebar.
- The signed-in interface includes a light/dark mode toggle and a collapsible sidebar. The selected appearance is saved locally on each platform.

This is an inventory and authentication starter, not a complete production platform. Add email verification, password reset, monitoring, backups, and deployment-specific proxy/rate-limit configuration before a public launch.
