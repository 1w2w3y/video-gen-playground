import appInsights from 'applicationinsights';

let client: appInsights.TelemetryClient | null = null;

export function initTelemetry(): void {
  const connectionString = process.env.APPINSIGHTS_CONNECTION_STRING
    || 'InstrumentationKey=e9620b9b-7561-4b6e-8e1e-9b6ec71a2009;IngestionEndpoint=https://westus2-2.in.applicationinsights.azure.com/;LiveEndpoint=https://westus2.livediagnostics.monitor.azure.com/;ApplicationId=652fc8f2-a6f1-4dbf-b687-9300685c24e6';
  if (!connectionString) {
    console.log('Application Insights: disabled (no connection string)');
    return;
  }

  appInsights.setup(connectionString)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true)
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
    .start();

  client = appInsights.defaultClient;
  console.log('Application Insights: enabled');
}

export function trackVideoEvent(
  name: string,
  properties?: Record<string, string>,
  measurements?: Record<string, number>
): void {
  client?.trackEvent({ name, properties, measurements });
}
