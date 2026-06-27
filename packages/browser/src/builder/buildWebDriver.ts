import { Options as ChromeOptions } from 'selenium-webdriver/chrome.js';
import { Options as EdgeOptions } from 'selenium-webdriver/edge.js';
import { Options as FirefoxOptions } from 'selenium-webdriver/firefox.js';
import { Options as SafariOptions } from 'selenium-webdriver/safari.js';
import { Browser, Builder, type WebDriver } from 'selenium-webdriver';

async function buildWebDriver(
  browser: 'chrome' | 'edge' | 'firefox' | 'safari',
  serverURL: string
): Promise<WebDriver> {
  switch (browser) {
    case 'edge': {
      const options = new EdgeOptions();

      options.enableBidi();

      return await new Builder().forBrowser(Browser.EDGE).setEdgeOptions(options).usingServer(serverURL).build();
    }

    case 'firefox': {
      const options = new FirefoxOptions();

      options.enableBidi();

      return await new Builder().forBrowser(Browser.FIREFOX).setFirefoxOptions(options).usingServer(serverURL).build();
    }

    case 'safari': {
      const options = new SafariOptions();

      'enableBidi' in options && typeof options.enableBidi === 'function' && options.enableBidi();

      return await new Builder().forBrowser(Browser.SAFARI).setSafariOptions(options).usingServer(serverURL).build();
    }

    default: {
      browser satisfies 'chrome';

      const options = new ChromeOptions();

      options.enableBidi();

      return await new Builder().forBrowser(Browser.CHROME).setChromeOptions(options).usingServer(serverURL).build();
    }
  }
}

export default buildWebDriver;
