const LOOPS_API_BASE = 'https://app.loops.so/api/v1'

export async function sendLoopsEvent(
  apiKey: string,
  email: string,
  eventName: string
): Promise<void> {
  await fetch(`${LOOPS_API_BASE}/events/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ email, eventName }),
  })
}

export async function sendLoopsTransactional(
  apiKey: string,
  transactionalId: string,
  email: string
): Promise<void> {
  await fetch(`${LOOPS_API_BASE}/transactional`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ transactionalId, email }),
  })
}

export type AddToLoopsOptions = {
  email: string
  firstName?: string
  lastName?: string
  mailingListId: string
}

/**
 * Adds or updates a contact in Loops and subscribes them to the given mailing list.
 * Uses the Update contact API (upsert) so existing contacts are updated and new ones created.
 */
export async function addContactToLoopsAudience(
  apiKey: string,
  options: AddToLoopsOptions
): Promise<{ success: true; id: string } | { success: false; message: string }> {
  const { email, firstName, lastName, mailingListId } = options
  const res = await fetch(`${LOOPS_API_BASE}/contacts/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      email,
      ...(firstName != null && { firstName }),
      ...(lastName != null && { lastName }),
      mailingLists: { [mailingListId]: true },
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    return { success: false, message: data?.message ?? res.statusText }
  }
  return { success: true, id: data.id }
}
