# GDELT Cyber Dashboard

Real-time cybersecurity intelligence dashboard powered by [GDELT](https://www.gdeltproject.org/) global news monitoring and Google BigQuery. Runs free on Vercel's Hobby plan with no long-lived credentials stored anywhere.

---

## What it shows

- **7-day trend chart** — daily volume of Cyber Attack, Hacking, and Information Operations coverage in global news
- **Top actors table** — most-mentioned organizations in cyber-related coverage (last 48h) with sentiment tone
- **Live event feed** — latest 50 articles from the last 24 hours, with source, timestamp, location, and tone score

---

## How auth works

- **Local dev** — [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials) via `gcloud auth application-default login`. No key file.
- **Vercel** — [Workload Identity Federation](https://vercel.com/docs/oidc/gcp) via `@vercel/oidc`. Vercel issues a short-lived OIDC token per request; GCP exchanges it for a scoped access token. No long-lived secret stored anywhere.

---

## Setup

### 1. Google Cloud — APIs and service account

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com).
2. Enable the **BigQuery API** and the **IAM Service Account Credentials API**.
3. Go to **IAM & Admin → Service Accounts → Create service account**.
4. Grant it **BigQuery Data Viewer** and **BigQuery Job User** roles.
5. Note the service account email — you'll need it throughout. Do **not** create a key.

### 2. Google Cloud — Workload Identity Federation

1. Go to **IAM & Admin → Workload Identity Federation → Create Pool**
   - Name: `Vercel`, ID: `vercel-pool`

2. Add a provider to the pool:
   - Type: `OpenID Connect (OIDC)`
   - Name: `Vercel`, ID: `vercel-provider`
   - Issuer URL: `https://oidc.vercel.com/YOUR_TEAM_SLUG`
   - Audience: `https://vercel.com/YOUR_TEAM_SLUG`
   - Attribute mapping: `google.subject` → `assertion.sub`

   Your team slug is the path in your Vercel team URL — e.g. `vercel.com/acme` → slug is `acme`.

3. Grant the service account permission to be impersonated by your Vercel project. Run this in Command Prompt (all one line):

```bat
gcloud iam service-accounts add-iam-policy-binding YOUR_SA_EMAIL --project=YOUR_PROJECT_ID --role=roles/iam.serviceAccountTokenCreator --member="principal://iam.googleapis.com/projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/vercel-pool/subject/owner:YOUR_TEAM_SLUG:project:YOUR_VERCEL_PROJECT_NAME:environment:production"
```

### 3. Local dev

Install the [gcloud CLI](https://cloud.google.com/sdk/docs/install), then run:

```bat
gcloud auth login
gcloud auth application-default login
copy .env.local.example .env.local
```

Set these two values in `.env.local`:

| Variable | Value |
|---|---|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_CLIENT_EMAIL` | Your service account email |

Then:

```bat
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Deploy to Vercel

```bat
npx vercel
```

Add these environment variables in the Vercel dashboard under **Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `GCP_PROJECT_ID` | GCP project ID |
| `GCP_PROJECT_NUMBER` | GCP project number (IAM & Admin → Settings) |
| `GCP_CLIENT_EMAIL` | Service account email |
| `GCP_WIF_POOL_ID` | `vercel-pool` |
| `GCP_WIF_PROVIDER_ID` | `vercel-provider` |

---

## Vercel free plan — how constraints are handled

| Constraint | Limit | Mitigation |
|---|---|---|
| Serverless function timeout | 10 seconds | Live feed queries scan only the last 24h (~200–400 MB) and return well within 10s |
| BigQuery free tier | 1 TB/month query processing | All queries use date filters to minimise scan size; trend data is ISR-cached for 1 hour |
| Bandwidth | 100 GB/month | Not a concern for a dashboard app |

---

## Extending the app

- **Country heatmap** — parse the `Locations` field from GKG and render with a D3 world map
- **CVE correlation** — join GDELT mentions with the NVD CVE feed to surface news coverage of known vulnerabilities
- **Alerts** — use Vercel Cron (free: 2 jobs) to run a nightly trend check and send an email if volume spikes
- **Longer history** — increase the `INTERVAL 7 DAY` window in `getCyberTrends()`, but watch your BigQuery quota

---

## Data source

[The GDELT Project](https://www.gdeltproject.org/) — open data, updated every 15 minutes, supported by Google Jigsaw.
