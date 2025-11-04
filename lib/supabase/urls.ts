export function getAuthCallbackUrl() {
  const explicitSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (explicitSiteUrl) {
    try {
      return new URL('/callback', explicitSiteUrl).toString()
    } catch (error) {
      console.warn('Invalid NEXT_PUBLIC_SITE_URL value, falling back to window origin.', error)
    }
  }

  if (typeof window !== 'undefined') {
    return new URL('/callback', window.location.origin).toString()
  }

  return '/callback'
}
