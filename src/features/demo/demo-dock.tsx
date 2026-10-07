import { DemoPanel } from './demo-panel'
import { loadDemoState } from './load'

/** Le bouton de démo, là où le backend de démonstration répond — nulle part ailleurs. */
export async function DemoDock() {
  const state = await loadDemoState()
  return state === null ? null : <DemoPanel state={state} />
}
