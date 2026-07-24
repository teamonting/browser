import { type WebDriver, WebElement } from 'selenium-webdriver';
import type { MarshalledElement } from '../../../internal/marshalledElement.ts';

async function unmarshalToWebElement(value: MarshalledElement, webDriver: WebDriver): Promise<WebElement> {
  return new WebElement(webDriver, value[1].sharedId);
}

export default unmarshalToWebElement;
