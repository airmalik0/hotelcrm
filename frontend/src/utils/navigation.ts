/**
 * Navigation utility for handling redirects from outside React components
 * (e.g., axios interceptors)
 */

export const NAVIGATION_EVENT = "app-navigate"

export interface NavigationEventDetail {
  path: string
  replace?: boolean
}

/**
 * Trigger navigation from outside React components
 */
export function navigateFromOutside(path: string, replace = false): void {
  const event = new CustomEvent<NavigationEventDetail>(NAVIGATION_EVENT, {
    detail: { path, replace },
  })
  window.dispatchEvent(event)
}

/**
 * Setup navigation event listener
 */
export function setupNavigationListener(
  navigate: (path: string, options?: { replace?: boolean }) => void,
): () => void {
  const handleNavigation = (event: CustomEvent<NavigationEventDetail>) => {
    const { path, replace } = event.detail
    navigate(path, { replace })
  }

  window.addEventListener(NAVIGATION_EVENT, handleNavigation as EventListener)

  return () => {
    window.removeEventListener(
      NAVIGATION_EVENT,
      handleNavigation as EventListener,
    )
  }
}
