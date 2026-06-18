import { Browser, Builder } from 'selenium-webdriver';
import { Options as ChromeOptions, ServiceBuilder as ChromeServiceBuilder } from 'selenium-webdriver/chrome.js';
import { Options as EdgeOptions, ServiceBuilder as EdgeServiceBuilder } from 'selenium-webdriver/edge.js';
import { Options as FirefoxOptions, ServiceBuilder as FirefoxServiceBuilder } from 'selenium-webdriver/firefox.js';
import { Options as SafariOptions, ServiceBuilder as SafariServiceBuilder } from 'selenium-webdriver/safari.js';
import findChromeDriverBin from './findChromeDriverBin.ts';
import findEdgeDriverBin from './findEdgeDriverBin.ts';
import findGeckoDriverBin from './findGeckoDriverBin.ts';
import findHostIP from './findHostIP.ts';
import findLocalIP from './findLocalIP.ts';
import findSafariDriverBin from './findSafariDriverBin.ts';

export default async function buildWebDriver(
  browser: 'chrome' | 'edge' | 'firefox' | 'safari',
  {
    pipeStdio,
    useWindowsBinary
  }: {
    readonly pipeStdio: boolean;
    readonly useWindowsBinary: boolean;
  }
) {
  const hostIP = useWindowsBinary ? await findHostIP() : '127.0.0.1';
  const localIP = useWindowsBinary ? await findLocalIP() : '127.0.0.1';

  switch (browser) {
    case 'edge': {
      const builder = new EdgeServiceBuilder(await findEdgeDriverBin({ windows: useWindowsBinary }))
        // WSL2: Despite ChromeDriver hosted on same subnet, local IP must be explicitly allowed.
        .addArguments('--allowed-ips', localIP)
        .setHostname(hostIP);

      pipeStdio && builder.setStdio([0, 1, 2]);

      const options = new EdgeOptions();

      options.enableBidi();

      return await new Builder()
        .forBrowser(Browser.EDGE)
        .setEdgeOptions(options)
        .usingServer(await builder.build().start())
        .build();
    }

    case 'firefox': {
      const builder = new FirefoxServiceBuilder(await findGeckoDriverBin({ windows: useWindowsBinary }))
        // WSL2: Firefox currently has a bug that it does not use host for the `webSocketUrl`, https://github.com/mozilla/geckodriver/issues/2249.
        .addArguments('--host', hostIP)
        .setHostname(hostIP);

      pipeStdio && builder.setStdio([0, 1, 2]);

      const options = new FirefoxOptions();

      options.enableBidi();

      const serverURL = await builder.build().start();

      return await new Builder().forBrowser(Browser.FIREFOX).setFirefoxOptions(options).usingServer(serverURL).build();
    }

    case 'safari': {
      const builder = new SafariServiceBuilder(await findSafariDriverBin())
        .addArguments('--host', hostIP)
        .setHostname(hostIP);

      pipeStdio && builder.setStdio([0, 1, 2]);

      const options = new SafariOptions();

      'enableBidi' in options && typeof options.enableBidi === 'function' && options.enableBidi();

      const serverURL = await builder.build().start();

      return await new Builder().forBrowser(Browser.SAFARI).setSafariOptions(options).usingServer(serverURL).build();
    }

    default: {
      browser satisfies 'chrome';

      const builder = new ChromeServiceBuilder(await findChromeDriverBin({ windows: useWindowsBinary }))
        // WSL2: Despite ChromeDriver hosted on same subnet, local IP must be explicitly allowed.
        .addArguments('--allowed-ips', localIP)
        .setHostname(hostIP);

      pipeStdio && builder.setStdio([0, 1, 2]);

      const options = new ChromeOptions();

      options.enableBidi();

      return await new Builder()
        .forBrowser(Browser.CHROME)
        .setChromeOptions(options)
        .usingServer(await builder.build().start())
        .build();
    }
  }
}
