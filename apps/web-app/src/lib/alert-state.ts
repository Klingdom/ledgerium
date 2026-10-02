/**
 * Alert notification state - public surface (rows #292, #296, #297).
 * Re-exports only; logic lives in lib/alerts/:
 *   state-machine.ts  pure decide/reduce + typed AlertState union
 *   store.ts          DB read/write adapter
 *   unconfirmed.ts    process-local failed-write set
 */
export * from './alerts/state-machine';
export { loadAlertStates, recordAlertState } from './alerts/store';
export { withoutUnconfirmed, clearUnconfirmedAlertWrites } from './alerts/unconfirmed';
