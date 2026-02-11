/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Throttles a callback. Ensures the first call runs immediately, 
 * and the LAST call in a burst runs after the delay (trailing edge).
 */
export function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  
  return function(...args) {
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