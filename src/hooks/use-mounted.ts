import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/** false during SSR and the hydration pass, true afterwards. Avoids theme hydration mismatches. */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
