/**
 * A wrapper around native fetch that acts as a global interceptor.
 * It catches 401 errors specifically shaped with { error: 'jira_reauth_required' }
 * and dispatches a custom window event so the UI can show a reconnect banner.
 */

export async function fetchApi(url, options = {}) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`

  // Default credentials to 'include' if making a request to our API
  // This is important for session cookies
  const fetchOptions = {
    ...options,
    credentials: options.credentials || 'include',
  }

  try {
    const response = await fetch(fullUrl, fetchOptions)
    
    // Check for 401 Jira Re-auth Required
    if (response.status === 401) {
      // Clone the response so the caller can still read the original body if they want to
      const clone = response.clone()
      try {
        const body = await clone.json()
        if (body?.error === 'jira_reauth_required') {
          // Dispatch a custom event to be caught by GlobalJiraHandler
          window.dispatchEvent(new CustomEvent('jira_reauth_required'))
        }
      } catch (err) {
        // Not a JSON response, ignore
      }
    }

    return response
  } catch (error) {
    throw error
  }
}
