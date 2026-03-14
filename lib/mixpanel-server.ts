const MIXPANEL_TOKEN = 'a57fd33001269c679b909f70bc479996'
const MIXPANEL_API_HOST = 'https://api-eu.mixpanel.com'

/**
 * Fire a server-side Mixpanel event.
 * Uses the HTTP /track endpoint so it works in Server Actions and route handlers.
 * Never throws — analytics must not break the main flow.
 */
export async function trackServerEvent(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  try {
    await fetch(`${MIXPANEL_API_HOST}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
      body: JSON.stringify([
        {
          event,
          properties: {
            distinct_id: distinctId,
            token: MIXPANEL_TOKEN,
            ...properties,
          },
        },
      ]),
    })
  } catch {
    // Don't block main flow on analytics failure
  }
}
