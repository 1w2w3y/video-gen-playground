import { ManagedIdentityCredential, AzureCliCredential } from '@azure/identity';
import type { TokenCredential, AccessToken } from '@azure/identity';

const COGNITIVE_SERVICES_SCOPE = 'https://cognitiveservices.azure.com/.default';

let credential: TokenCredential | null = null;
let cachedToken: AccessToken | null = null;

function getCredential(): TokenCredential {
  if (!credential) {
    if (process.env.AZURE_CLIENT_ID) {
      console.log('Using ManagedIdentityCredential with client ID:', process.env.AZURE_CLIENT_ID);
      credential = new ManagedIdentityCredential({ clientId: process.env.AZURE_CLIENT_ID });
    } else {
      console.log('Using AzureCliCredential for local development');
      credential = new AzureCliCredential();
    }
  }
  return credential;
}

export async function getAzureToken(): Promise<string> {
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
