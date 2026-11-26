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

2. Configure and start MongoDB. Copy `server/.env.example` to `server/.env`, set `MONGODB_URI`, SMTP connection values, `EMAIL_USER` and `EMAIL_PASS`, and replace `JWT_ACCESS_SECRET` with a random value of at least 32 bytes. Use `SMTP_SECURE=true` with a TLS-enabled SMTP port such as 465; for STARTTLS, use the provider's port (commonly 587) with `SMTP_SECURE=false`. For example:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
   ```

3. Install and start the API:

   ```sh
   npm install --prefix server
   npm run api:dev
   ```

   The first user creates an account from the app's Register screen. Each registration becomes that account's Super Admin and starts with an empty private inventory.

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

- Registration is public and rate-limited. Each registration creates a Super Admin and uses its user ID as the owner of an isolated account. Team members created from user management are always Admins in that same account; only the separate registration flow can create another independent Super Admin account.
- Users, inventory items, stock movements, and activity records carry an account owner ID. API reads, updates, deletes, dashboard aggregates, and related record creation are scoped to the authenticated user's account, so changing a request ID cannot cross account boundaries.
- On startup, records from older installations that do not yet have an account owner are assigned to the oldest existing Super Admin's account. Existing Super Admin users are assigned their own account; their legacy shared records remain with the oldest Super Admin.
- Passwords are validated by the API, hashed with bcrypt, and password hashes are never returned.
- Forgot password sends a cryptographically random six-digit OTP through the configured SMTP server. Codes are stored as keyed hashes, expire after 10 minutes, allow at most five verification attempts, and are protected by request/verification rate limits. The API returns the same confirmation for registered and unregistered email addresses. Set the SMTP and `EMAIL_USER`/`EMAIL_PASS` variables in `server/.env` to enable password reset.
- Access JWTs expire after 15 minutes. Refresh tokens are stored as SHA-256 hashes in MongoDB and rotated on refresh while retaining the original absolute expiry. Super Admins can set a fixed session lifetime of 30 minutes, 1 hour, 2 hours (the default), a custom duration up to 30 days, or no automatic expiry. The setting applies to new sessions; existing sessions retain their original expiry. Tokens are removed on logout, and MongoDB expires dated refresh-token records with a TTL index.
- Super Admins can choose an account-wide display currency in Settings. The preference is stored with the account and applied consistently to dashboard and inventory values; it changes formatting only and does not convert saved amounts.
- On Android, the refresh token is stored using Expo SecureStore (Android Keystore-backed). On web, tokens stay in memory and are not persisted across a page reload.
- Authentication endpoints have an IP-based rate limit. Helmet security headers, explicit CORS origins, a 10 KB JSON body limit, and server-side Zod validation are enabled.
- Provide a strong `JWT_ACCESS_SECRET`, use HTTPS in production, and keep `.env` files out of source control.

## Inventory

- The authenticated dashboard tracks café products, categories, units, quantity on hand, minimum stock, unit cost, and stock value in PHP.
- Inventory status is calculated from on-hand quantity and the minimum stock level. Stock-in and stock-out actions update quantities and are recorded as dated movements.
- Dashboard cards and the seven-day stock-movement chart are calculated from stored inventory and movement records. User management is available separately from the responsive sidebar.
- The dashboard summarizes inventory health, stock value, team size, and today's movements. Recent activity shows the two latest account events; View all opens day-grouped history with ten records per page.
- The signed-in interface includes a light/dark mode toggle and a collapsible sidebar. The selected appearance is saved locally on each platform.

This is an inventory and authentication starter, not a complete production platform. Add email verification, password reset, monitoring, backups, and deployment-specific proxy/rate-limit configuration before a public launch.
