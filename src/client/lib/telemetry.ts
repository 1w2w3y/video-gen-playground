import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ClickAnalyticsPlugin } from '@microsoft/applicationinsights-clickanalytics-js';

let appInsights: ApplicationInsights | null = null;

export function initClientTelemetry(connectionString: string): void {
  if (!connectionString || appInsights) return;

  const clickPlugin = new ClickAnalyticsPlugin();

  const ai = new ApplicationInsights({
    config: {
      connectionString,
      enableAutoRouteTracking: true,
      enableCorsCorrelation: true,
      enableRequestHeaderTracking: true,
      enableResponseHeaderTracking: true,
      extensions: [clickPlugin],
      extensionConfig: {
        [clickPlugin.identifier]: {
          autoCapture: true,
          dataTags: { useDefaultContentNameOrId: true },
        },
      },
    },
  });

  ai.loadAppInsights();
  appInsights = ai;
}

export function trackEvent(
  name: string,
  properties?: Record<string, string>,
): void {
  appInsights?.trackEvent({ name }, properties);
}

export function trackException(error: Error, properties?: Record<string, string>): void {
  appInsights?.trackException({ exception: error }, properties);
}
