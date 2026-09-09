/** Phaser may replay the same native event while draining its keyboard queue.
 * Consume its identity once, across menu/scene transitions, without delaying fresh input.
 * Weak references allow the browser to collect events after the queue drains.
 */
const consumed = new WeakSet<KeyboardEvent>();
export function consumeKeyboardEvent(event: KeyboardEvent): boolean {
  if (consumed.has(event)) return false;
  consumed.add(event);
  return true;
}
