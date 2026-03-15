import { ManagedIdentityCredential, AzureCliCredential, ChainedTokenCredential } from '@azure/identity';
import type { TokenCredential, AccessToken } from '@azure/identity';

const COGNITIVE_SERVICES_SCOPE = 'https://cognitiveservices.azure.com/.default';

let credential: TokenCredential | null = null;
let cachedToken: AccessToken | null = null;

function getCredential(): TokenCredential {
  if (!credential) {
    if (process.env.AZURE_CLIENT_ID) {
      // Explicit user-assigned managed identity
      console.log('Using ManagedIdentityCredential with client ID:', process.env.AZURE_CLIENT_ID);
      credential = new ManagedIdentityCredential({ clientId: process.env.AZURE_CLIENT_ID });
    } else {
      // Try system-assigned managed identity first (works on Azure Arc, VMs),
      // then fall back to Azure CLI for local development
      console.log('Using ManagedIdentityCredential (system-assigned) with AzureCliCredential fallback');
      credential = new ChainedTokenCredential(
        new ManagedIdentityCredential(),
        new AzureCliCredential(),
      );
    }
  }
  return credential;
}

export async function getAzureToken(): Promise<string> {
  // If a static token is provided (e.g. for Docker containers that can't use az CLI or Arc),
  // use it directly. Caller is responsible for refreshing before expiry.
  if (process.env.AZURE_ACCESS_TOKEN) {
    return process.env.AZURE_ACCESS_TOKEN;
  }

  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresOnTimestamp > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const cred = getCredential();
  cachedToken = await cred.getToken(COGNITIVE_SERVICES_SCOPE);
  if (!cachedToken) {
    throw new Error('Failed to acquire Azure token');
  }
  return cachedToken.token;
}
