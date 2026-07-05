# Project NEXUS Community - UK Frontend

A community service frontend using GOV.UK Frontend and GOV.UK Design System
patterns.

**This is NOT a UK Government service. We are not affiliated with or endorsed by GOV.UK.**

## Shared Accessible Frontend Status

`apps/web-uk` is the future shared accessible frontend candidate for Project
NEXUS. It is not production-ready and does not replace the Laravel Blade
accessible frontend yet.

The Laravel accessible frontend remains the visual and workflow source of truth:

```text
C:\platforms\htdocs\staging\accessible-frontend
C:\platforms\htdocs\staging\routes\govuk-alpha.php
C:\platforms\htdocs\staging\routes\govuk-alpha-parity
```

See [docs/ACCESSIBLE_SHARED_FRONTEND.md](docs/ACCESSIBLE_SHARED_FRONTEND.md) and
the root [docs/ACCESSIBLE_SHARED_FRONTEND.md](../../docs/ACCESSIBLE_SHARED_FRONTEND.md).

Preparation docs:

- [docs/LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md](docs/LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md)
- [docs/BLADE_COMPONENT_PORT_AUDIT.md](docs/BLADE_COMPONENT_PORT_AUDIT.md)
- [docs/BACKEND_SWITCHING_CONTRACT.md](docs/BACKEND_SWITCHING_CONTRACT.md)

## Credits and Origins

### Creator

This software was created by **Jasper Ford**.

### Founders

The originating time bank initiative was co-founded by:

- **Jasper Ford**
- **Mary Casey**

### Contributors

- **Steven J. Kelly** - Community insight, product thinking

### Research Foundation

This software is informed by and builds upon a social impact study commissioned by the **West Cork Development Partnership**.

### Acknowledgements

- **West Cork Development Partnership**
- **Fergal Conlon**, SICAP Manager

## License

This software is licensed under the **GNU Affero General Public License version 3** (AGPL-3.0-or-later).

See the [LICENSE](LICENSE) file for the full license text.
See the [NOTICE](NOTICE) file for attribution requirements.

## Prerequisites

- **Docker and Docker Compose** (required)
- ASP.NET Core API running (see the root [API parity map](../../docs/API_PARITY.md))

**Note:** Docker is the only supported development environment. Do not use native Node.js, XAMPP, or other local setups.

## Quick Start

```bash
# Start the frontend
docker compose up -d

# View logs
docker compose logs -f nexus-uk-frontend

# Restart after code changes
docker compose restart nexus-uk-frontend

# Full rebuild (after package.json or Dockerfile changes)
docker compose down && docker compose up --build -d

# Stop
docker compose down
```

The application will be available at **http://localhost:5180**

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `ACCESSIBLE_BACKEND_TARGET` | `laravel` | Backend contract target. `aspnet` is allowed only as future/not-certified work. |
| `LARAVEL_BASE_URL` | `http://127.0.0.1:8088` | Laravel backend base URL used by default. Mirrors the local Laravel staging `.env`. |
| `ASPNET_BASE_URL` | `http://localhost:5080` | Future ASP.NET backend base URL when explicitly selected. Not certified. |
| `API_BASE_URL` | - | Explicit backend URL override. Prefer `LARAVEL_BASE_URL` for Laravel-first work. |
| `COOKIE_SECRET` | - | **Required.** Secret for signed cookies |
| `SESSION_SECRET` | - | Secret for sessions (defaults to COOKIE_SECRET) |
| `NODE_ENV` | `development` | Environment (development/production) |

## Available Routes

### Public Routes

| Route | Description |
|-------|-------------|
| `GET /` | Home page |
| `GET /health` | Health check (plain text "OK") |
| `GET /components` | Components demo page |
| `GET /login` | Login page |
| `POST /login` | Process login |
| `GET /register` | Registration page |
| `POST /register` | Process registration |
| `GET /forgot-password` | Forgot password page |
| `POST /forgot-password` | Request password reset |
| `GET /reset-password` | Reset password page (with token) |
| `POST /reset-password` | Process password reset |
| `GET /privacy` | Privacy policy |
| `GET /terms` | Terms and conditions |
| `GET /contact` | Contact page |
| `GET /explore` | Shared accessible frontend Explore skeleton |
| `GET /organisations` | Blade-style accessible organisations candidate; visual/form prep only, backend workflow not certified |
| `GET /help` | Shared accessible frontend preparation skeleton |
| `GET /kb` | Shared accessible frontend preparation skeleton |
| `GET /trust-and-safety` | Shared accessible frontend preparation skeleton |
| `GET /cookies` | Shared accessible frontend preparation skeleton |
| `GET /report-a-problem` | Shared accessible frontend preparation skeleton |
| `GET /accessibility` | Shared accessible frontend preparation skeleton |
| `GET /legal` | Shared accessible frontend preparation skeleton |
| `GET /legal/*` | Shared accessible frontend preparation skeleton |
| `GET /service-unavailable` | 503 error page |

### Protected Routes (require authentication)

| Route | Description |
|-------|-------------|
| `GET /dashboard` | User dashboard with overview |
| `GET /listings` | List all listings (with search/filter/pagination) |
| `GET /listings/new` | Create new listing form |
| `POST /listings/new` | Create listing |
| `GET /listings/:id` | View listing details |
| `GET /listings/:id/edit` | Edit listing form |
| `POST /listings/:id/edit` | Update listing |
| `GET /listings/:id/delete` | Delete confirmation |
| `POST /listings/:id/delete` | Delete listing |
| `GET /wallet` | Wallet overview and balance |
| `GET /wallet/transactions` | Transaction history |
| `GET /wallet/transactions/:id` | Transaction details |
| `GET /wallet/transfer` | Transfer credits form |
| `POST /wallet/transfer` | Process transfer |
| `GET /messages` | List conversations |
| `GET /messages/:id` | View conversation |
| `GET /connections` | List connections |
| `GET /connections/pending` | Pending connection requests |
| `POST /connections/request` | Send connection request |
| `POST /connections/:id/accept` | Accept connection request |
| `POST /connections/:id/decline` | Decline connection request |
| `POST /connections/:id/remove` | Remove connection or cancel request |
| `GET /members` | Community members directory |
| `GET /members/:id` | View member profile |
| `POST /members/:id/connect` | Send connection request to member |
| `GET /messages/new` | Start new conversation form |
| `POST /messages/new` | Send new conversation |
| `GET /profile` | View user profile |
| `GET /profile/edit` | Edit profile form |
| `POST /profile/edit` | Update profile |
| `GET /settings` | Settings overview |
| `GET /settings/notifications` | Notification preferences |
| `GET /settings/privacy` | Privacy settings |
| `GET /notifications` | List notifications |
| `POST /notifications/:id/read` | Mark notification as read |
| `POST /notifications/read-all` | Mark all notifications as read |
| `POST /notifications/:id/delete` | Delete notification |
| `POST /logout` | Sign out (revokes tokens) |
| `GET /logout` | Sign out (revokes tokens) |

## Project Structure

```text
nexus-uk-frontend/
├── public/
│   └── css/
│       └── main.css              # Compiled CSS (generated)
├── scripts/
│   └── brand-check.js            # Branding guard script
├── src/
│   ├── assets/
│   │   └── scss/
│   │       └── main.scss         # Sass entry point
│   ├── lib/
│   │   └── api.js                # API client for backend
│   ├── middleware/
│   │   └── auth.js               # Authentication middleware
│   ├── routes/
│   │   ├── auth.js               # Login/logout routes
│   │   ├── connections.js        # Connections routes
│   │   ├── dashboard.js          # Dashboard route
│   │   ├── listings.js           # Listings CRUD routes
│   │   ├── members.js            # Members directory routes
│   │   ├── messages.js           # Messages routes
│   │   ├── notifications.js      # Notifications routes
│   │   ├── profile.js            # Profile routes
│   │   ├── settings.js           # Settings routes
│   │   └── wallet.js             # Wallet/transactions routes
│   ├── views/
│   │   ├── errors/
│   │   │   ├── 403.njk           # Forbidden error
│   │   │   ├── 404.njk           # Not found error
│   │   │   ├── 500.njk           # Server error
│   │   │   └── 503.njk           # Service unavailable
│   │   ├── layouts/
│   │   │   └── base.njk          # Base template (custom header/footer)
│   │   ├── listings/
│   │   │   ├── delete.njk        # Delete confirmation
│   │   │   ├── detail.njk        # Listing details
│   │   │   ├── form.njk          # Create/edit form
│   │   │   └── index.njk         # Listings table
│   │   ├── partials/
│   │   │   └── footer.njk        # Custom footer (no crown)
│   │   ├── profile/
│   │   │   ├── edit.njk          # Edit profile form
│   │   │   └── index.njk         # Profile view
│   │   ├── wallet/
│   │   │   ├── index.njk         # Wallet overview
│   │   │   ├── transactions.njk  # Transaction history
│   │   │   ├── transaction-detail.njk
│   │   │   └── transfer.njk      # Transfer form
│   │   ├── messages/
│   │   │   ├── index.njk         # Conversations list
│   │   │   └── conversation.njk  # Single conversation
│   │   ├── connections/
│   │   │   ├── index.njk         # Connections list
│   │   │   └── pending.njk       # Pending requests
│   │   ├── members/
│   │   │   ├── index.njk         # Members directory
│   │   │   └── profile.njk       # Member profile view
│   │   ├── dashboard/
│   │   │   └── index.njk         # Dashboard
│   │   ├── settings/
│   │   │   ├── index.njk         # Settings overview
│   │   │   ├── notifications.njk # Notification settings
│   │   │   └── privacy.njk       # Privacy settings
│   │   ├── notifications/
│   │   │   └── index.njk         # Notifications list
│   │   ├── components.njk        # Components demo
│   │   ├── contact.njk           # Contact page
│   │   ├── forgot-password.njk   # Forgot password page
│   │   ├── home.njk              # Home page
│   │   ├── login.njk             # Login page
│   │   ├── privacy.njk           # Privacy policy
│   │   ├── register.njk          # Registration page
│   │   ├── reset-password.njk    # Reset password page
│   │   └── terms.njk             # Terms and conditions
│   └── server.js                 # Express application
├── .env                          # Environment variables (not in git)
├── .env.example                  # Example environment file
├── CLAUDE.md                     # AI assistant instructions
├── package.json
└── README.md
```

## Stack

- **Runtime:** Node.js 18+
- **Framework:** Express 4.x
- **Templating:** Nunjucks 3.x
- **Design System:** govuk-frontend 5.x (styles only, no crown branding)
- **CSS:** Dart Sass
- **Security:** Helmet.js, CSRF protection, rate limiting
- **Sessions:** express-session, express-flash

## Features

### Core Features
- User registration and authentication (JWT + refresh tokens in HTTP-only cookies)
- Automatic token refresh when access token expires
- Password reset via email
- User dashboard with overview
- Listings CRUD (create, read, update, delete)
- Wallet with balance and credit transfers
- Transaction history
- Messages/conversations with send functionality
- Connections (send requests, accept, decline)
- Members directory with profile views
- In-app notifications with unread badge
- User profile management
- Settings (notifications, privacy)
- Search and filtering
- Pagination
- Flash messages for notifications
- API offline detection with graceful error handling

### Security
- CSRF protection (double-submit cookie pattern)
- Helmet.js security headers
- Rate limiting (100 req/15min general, 10 req/15min for auth)
- HTTP-only signed cookies
- Session timeout (30 minutes)

### UX
- GOV.UK error summary and inline validation
- Breadcrumb navigation
- Responsive design
- Accessible components (WCAG 2.1 AA)

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development mode with watch (runs brand check first) |
| `npm start` | Production start (runs brand check first) |
| `npm run build:css` | Compile Sass to CSS |
| `npm run watch:css` | Watch Sass files |
| `npm run watch:server` | Watch server with nodemon |
| `npm run brand:check` | Verify no government branding exists |
| `npm test` | Run tests with Jest |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:watch` | Run tests in watch mode |

## Docker

**Docker is the only supported way to run this project.**

See the root [agent instructions](../../CLAUDE.md) for the Docker-only project invariant and production-container warnings.

### Quick Commands

```bash
# Development (default)
docker compose up -d

# Production mode
docker compose --profile prod up -d

# View logs
docker compose logs -f nexus-uk-frontend

# Rebuild
docker compose down && docker compose up --build -d

# Check health
docker compose ps
```

## Branding Guard

This project includes an automated branding check that runs on `dev` and `start`.

Run manually:

```bash
npm run brand:check
```

The check fails if any of these are found in templates:

- `govukFooter` or `govukHeader` macro usage (includes crown by default)
- `govuk-footer__copyright-logo` class
- `Open Government Licence` text
- Crown SVG elements
- OGL class references

## Branding Rules (Non-Negotiable)

This project uses GOV.UK Frontend for accessibility and usability patterns only.

**We do NOT use:**

- Crown logos, crests, or Royal Arms
- GOV.UK header component
- GOV.UK footer component (includes crown)
- Any implication of government affiliation

**We DO include:**

- Custom header with "Project NEXUS Community"
- Custom footer with plain links
- Disclaimer: "Not affiliated with GOV.UK or any government body."

## Test Credentials

See this README's test credentials section and the root [API parity map](../../docs/API_PARITY.md) for API documentation status.
