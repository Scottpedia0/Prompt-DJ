/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Throttles a callback. Ensures the first call runs immediately, 
 * and the LAST call in a burst runs after the delay (trailing edge).
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastFunc: ReturnType<typeof setTimeout>;
  let lastRan: number;
  
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function() {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}