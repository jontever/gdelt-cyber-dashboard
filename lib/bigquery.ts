import { BigQuery } from '@google-cloud/bigquery';
import { ExternalAccountClient } from 'google-auth-library';
import { getVercelOidcToken } from '@vercel/oidc';

/**
 * Returns an authenticated BigQuery client.
 *
 * Auth strategy:
 *   - Vercel deployment  → Workload Identity Federation via @vercel/oidc.
 *     getVercelOidcToken() supplies the short-lived OIDC token automatically.
 *   - Local development  → Application Default Credentials.
 *     Run once: gcloud auth application-default login
 */
export async function getBigQueryClient(): Promise<BigQuery> {
  if (process.env.VERCEL) {
    const projectNumber = process.env.GCP_PROJECT_NUMBER;
    const poolId        = process.env.GCP_WIF_POOL_ID;
    const providerId    = process.env.GCP_WIF_PROVIDER_ID;
    const saEmail       = process.env.GCP_CLIENT_EMAIL;

    if (!projectNumber || !poolId || !providerId || !saEmail) {
      throw new Error('Missing env vars: GCP_PROJECT_NUMBER, GCP_WIF_POOL_ID, GCP_WIF_PROVIDER_ID, GCP_CLIENT_EMAIL');
    }

    const authClient = ExternalAccountClient.fromJSON({
      type: 'external_account',
      audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      token_url: 'https://sts.googleapis.com/v1/token',
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${saEmail}:generateAccessToken`,
      subject_token_supplier: {
        getSubjectToken: () => getVercelOidcToken(),
      },
    });

    if (!authClient) throw new Error('ExternalAccountClient.fromJSON returned null');

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
