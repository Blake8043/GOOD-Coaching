# PicklePro Coach Platform Updates

This project was converted from the original BPJ service-business template into a pickleball coaching marketplace.

## What was added

### Public/player features
- Pickleball-focused home page.
- Coach marketplace at `/coaches` and `/marketplace`.
- Individual coach profile and package checkout at `/coaches/:id`.
- Player video-review dashboard at `/dashboard/submissions`.
- Submission detail page at `/dashboard/submissions/:id`.
- Video upload link creation with Cloudflare Stream support and demo fallback.
- Player-visible completed coach reviews with timestamped comments.

### Coach features
- Coach signup/application page at `/coach-signup`.
- Coach dashboard at `/coach/dashboard`.
- Coach package creation.
- Stripe Connect onboarding endpoint with demo fallback.
- Assigned video review queue.
- Coach review workspace at `/coach/submissions/:id/review`.
- Timestamped comments, review drafts, and complete-review workflow.

### Admin features
- Coaching admin dashboard at `/admin/coaching`.
- Coach approval and featured coach control.
- Video submission monitoring.
- Payment split auditing.
- Admin stats now include coaches, pending coaches, submissions, pending reviews, and split records.

### Backend marketplace models
- `CoachProfile`
- `CoachingPackage`
- `PaymentSplit`
- `VideoSubmission`
- `VideoReview`

### Backend marketplace routes
- `/api/coaches`
- `/api/payments`
- `/api/videos`
- `/api/reviews`
- Expanded `/api/admin`

## Payment behavior

The code supports two modes:

### Demo mode
If `STRIPE_SECRET_KEY` is missing, checkout completes locally and immediately creates:
- an order
- a payment split record
- a video submission

This makes it easy to test the full workflow without paid API keys.

### Stripe mode
If `STRIPE_SECRET_KEY` is present, `/api/payments/checkout/session` creates a Stripe Checkout Session using Stripe's REST API through Node's built-in `fetch`.

Single-recipient payments are modeled as destination-charge style payments. Multi-recipient cases create a `PaymentSplit` record using the `separate_charges_and_transfers` charge type so payouts can be distributed to a primary coach, assistant coach, facility, or other connected account.

## Video behavior

The code supports two modes:

### Demo mode
If Cloudflare Stream credentials are missing, the app lets the player paste a private video URL and marks the submission as ready for review.

### Cloudflare Stream mode
If these variables are configured, `/api/videos/submissions/:id/upload-url` creates a direct upload URL:
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_STREAM_TOKEN`

## Production environment variables

Create `server/.env` from `server/.env.example`:

```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/picklepro_dev
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_STREAM_TOKEN=
```

Create `.env` from `.env.example`:

```env
VITE_API_URL=http://localhost:5001/api
```

## Local run commands

From the project folder:

```bash
npm install
npm install --prefix server
npm run dev
```

In a second terminal:

```bash
npm run dev --prefix server
```

For Railway production build/start, the existing scripts remain:

```bash
npm run railway:build
npm run railway:start
```

## Test result

Frontend build was tested successfully with:

```bash
npm run build
```

Server JavaScript syntax was checked with:

```bash
find server -path 'server/node_modules' -prune -o -name '*.js' -print | while read f; do node -c "$f" || exit 1; done
```
