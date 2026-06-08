# GDELT Cyber Dashboard

Real-time cybersecurity intelligence dashboard powered by [GDELT](https://www.gdeltproject.org/) global news monitoring and Google BigQuery. Built to run free on Vercel's Hobby plan.

---

## What it shows

- **7-day trend chart** — daily volume of Cyber Attack, Hacking, and Information Operations coverage in global news
- **Top actors table** — most-mentioned organizations in cyber-related coverage (last 48h) with sentiment tone
- **Live event feed** — latest 50 articles from the last 24 hours, with source, timestamp, location, and tone score

---

## Auth options

| | Service account key | Workload Identity Federation |
|---|---|---|
| Long-lived secret stored on Vercel | Yes (encrypted) | **No** |
| Setup complexity | Low | ~10 min extra |
| Recommended for | Local dev | Vercel deployment |
| Risk if leaked | Attacker can query BigQuery on your quota | N/A — no key exists |

The app auto-detects which to use: WIF when `VERCEL=1` (set automatically by Vercel), key-based otherwise. So you can use a key locally and WIF in production with no code changes.

---

## Setup

### 1. Google Cloud Project

You need a GCP project with BigQuery enabled. GDELT is a public dataset — you pay only for query processing (first 1 TB/month is free).

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project.
2. Enable the **BigQuery API**.
3. Go to **IAM & Admin → Service Accounts** → Create service account.
4. Grant it the **BigQuery Data Viewer** and **BigQuery Job User** roles.
5. Note the service account email — you'll need it below. Do **not** create a key.

### 2. Local dev credentials (no key required)

Install the [gcloud CLI](https://cloud.google.com/sdk/docs/install) if you haven't, then run:

```bat
gcloud auth application-default login
```

This opens a browser, logs you in with your Google account, and writes a short-lived credential to your local machine. The BigQuery client finds it automatically — no key file, no env vars for auth.

Then copy the env example and set the two non-secret values:

```bat
copy .env.local.example .env.local
```

| Variable | Value |
|---|---|
| `GCP_PROJECT_ID` | Your GCP project ID (GCP console home page) |
| `GCP_CLIENT_EMAIL` | The service account email from step 1 |

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

### 3b. Keyless Auth Setup (Workload Identity Federation)

Skip this if you're happy using a key for Vercel too. Otherwise, ~10 minutes in GCP Console:

Run these one at a time in Command Prompt, substituting your own values for the ALL_CAPS placeholders:

```bat
gcloud iam workload-identity-pools create vercel-pool --project=YOUR_PROJECT_ID --location=global --display-name="Vercel Pool"

gcloud iam workload-identity-pools providers create-oidc vercel-provider --project=YOUR_PROJECT_ID --location=global --workload-identity-pool=vercel-pool --issuer-uri=https://oidc.vercel.com --attribute-mapping="google.subject=assertion.sub"

gcloud iam service-accounts add-iam-policy-binding YOUR_SA_EMAIL --project=YOUR_PROJECT_ID --role=roles/iam.workloadIdentityUser --member="principalSet://iam.googleapis.com/projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/vercel-pool/attribute.google.subject/YOUR_VERCEL_TEAM_ID:YOUR_VERCEL_PROJECT_ID"
```

Where to find each value:
| Placeholder | Where to find it |
|---|---|
| `YOUR_PROJECT_ID` | GCP console home page |
| `YOUR_PROJECT_NUMBER` | GCP console home page (different from project ID) |
| `YOUR_SA_EMAIL` | IAM & Admin → Service Accounts |
| `YOUR_VERCEL_TEAM_ID` | Vercel dashboard → Settings → General → Team ID |
| `YOUR_VERCEL_PROJECT_ID` | Vercel dashboard → your project → Settings → General → Project ID |

Then in Vercel, set these env vars (no `GCP_PRIVATE_KEY` needed):
- `GCP_PROJECT_ID`
- `GCP_PROJECT_NUMBER`
- `GCP_CLIENT_EMAIL`
- `GCP_WIF_POOL_ID` = `vercel-pool`
- `GCP_WIF_PROVIDER_ID` = `vercel-provider`

---

## Deploy to Vercel (free)

```bash
npx vercel
```

Add the WIF env vars in the Vercel dashboard under **Settings → Environment Variables** (see step 3b). No `GCP_PRIVATE_KEY` is needed on Vercel.

---

## Vercel free plan constraints & how this app handles them

| Constraint | Value | Mitigation |
|---|---|---|
| Serverless function timeout | 10 seconds | Live feed queries only scan 24h of data (~200–400 MB). Trend queries run server-side at build/ISR time, not on user requests. |
| BigQuery free tier | 1 TB/month query processing | Date filters on all queries minimize scan size. Trend data is ISR-cached for 1 hour, so heavy queries run at most 24×/day. |
| Bandwidth | 100 GB/month | Not a constraint for this app. |

---

## Extending the app

- **Add a country heatmap** — parse the `Locations` field from GKG and render with a D3 world map
- **CVE correlation** — join GDELT mentions with NVD CVE feed to surface news coverage of known vulnerabilities
- **Alert threshold** — use Vercel Cron (free: 2 jobs) to run a nightly trend check and email if volume spikes
- **Longer history** — increase the `INTERVAL 7 DAY` window in `getCyberTrends()`, but watch your BigQuery quota

---

## Data source

[The GDELT Project](https://www.gdeltproject.org/) — open data, updated every 15 minutes, supported by Google Jigsaw.
