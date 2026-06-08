import * as fs from 'fs';
import { BigQuery } from '@google-cloud/bigquery';
import { ExternalAccountClient } from 'google-auth-library';

/**
 * Returns an authenticated BigQuery client.
 *
 * Auth strategy:
 *   - Vercel deployment  → Workload Identity Federation via ExternalAccountClient.
 *     Writes the short-lived Vercel OIDC token to /tmp so google-auth-library
 *     can read it, then handles the STS exchange and SA impersonation natively.
 *   - Local development  → Application Default Credentials.
 *     Run once: gcloud auth application-default login
 */
export async function getBigQueryClient(): Promise<BigQuery> {
  if (process.env.VERCEL) {
    const oidcToken = process.env.VERCEL_OIDC_TOKEN;
    if (!oidcToken) throw new Error('VERCEL_OIDC_TOKEN is not set — enable OIDC in Vercel project settings');

    const projectNumber = process.env.GCP_PROJECT_NUMBER;
    const poolId        = process.env.GCP_WIF_POOL_ID;
    const providerId    = process.env.GCP_WIF_PROVIDER_ID;
    const saEmail       = process.env.GCP_CLIENT_EMAIL;

    if (!projectNumber || !poolId || !providerId || !saEmail) {
      throw new Error('Missing env vars: GCP_PROJECT_NUMBER, GCP_WIF_POOL_ID, GCP_WIF_PROVIDER_ID, GCP_CLIENT_EMAIL');
    }

    // Write the OIDC token to /tmp so ExternalAccountClient can read it as a file source.
    // Vercel serverless functions have a writable /tmp directory.
    const tokenPath = '/tmp/vercel_oidc.txt';
    fs.writeFileSync(tokenPath, oidcToken);

    const authClient = ExternalAccountClient.fromJSON({
      type: 'external_account',
      audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      token_url: 'https://sts.googleapis.com/v1/token',
      credential_source: { file: tokenPath },
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${saEmail}:generateAccessToken`,
    });

    if (!authClient) throw new Error('ExternalAccountClient.fromJSON returned null — check WIF config');

    return new BigQuery({
      projectId: process.env.GCP_PROJECT_ID,
      authClient,
    });
  }

  // Local dev: Application Default Credentials — no key needed.
  // Run once: gcloud auth application-default login
  return new BigQuery({
    projectId: process.env.GCP_PROJECT_ID,
  });
}
