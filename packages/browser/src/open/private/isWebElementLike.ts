import { WebElement } from 'selenium-webdriver';

export default function isWebElementLike(value: unknown): value is WebElement {
  // Developers could be using a different version of "selenium-webdriver".
  return value instanceof WebElement || !!(value && typeof value === 'object' && 'driver_' in value);
}
