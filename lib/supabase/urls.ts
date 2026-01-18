const DEFAULT_RETURN_PATH = '/dashboard'

const normalizeReturnPath = (path: string) => {
  if (!path) {
    return DEFAULT_RETURN_PATH
  }

  return path.startsWith('/') ? path : `/${path}`
}

const buildCallbackUrl = (baseUrl: string, nextPath: string) => {
  const url = new URL('/callback', baseUrl)
  url.searchParams.set('next', nextPath)
  return url.toString()
}

export function getAuthCallbackUrl(nextPath: string = DEFAULT_RETURN_PATH) {
  const explicitSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const normalizedNext = normalizeReturnPath(nextPath)

  if (explicitSiteUrl) {
    try {
      return buildCallbackUrl(explicitSiteUrl, normalizedNext)
    } catch (error) {
      console.warn('Invalid NEXT_PUBLIC_SITE_URL value, falling back to window origin.', error)
    }
  }

  if (globalThis.window !== undefined) {
    return buildCallbackUrl(globalThis.window.location.origin, normalizedNext)
  }

  const relativeUrl = new URL('/callback', 'http://localhost')
  relativeUrl.searchParams.set('next', normalizedNext)
  return `${relativeUrl.pathname}?${relativeUrl.searchParams.toString()}`
}
