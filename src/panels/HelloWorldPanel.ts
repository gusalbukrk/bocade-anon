import * as vscode from 'vscode';
import jsdom, { JSDOM } from 'jsdom';
import sha256 from 'crypto-js/sha256.js';

import { getUri } from '../utilities/getUri';
import { getNonce } from '../utilities/getNonce';

export class HelloWorldPanel {
  public static currentPanel: HelloWorldPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _globalState: vscode.Memento;
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    globalState: vscode.Memento,
    extensionUri: vscode.Uri,
  ) {
    this._panel = panel;
    this._globalState = globalState;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getWebviewContent(
      this._panel.webview,
      extensionUri,
    );
    this._setWebviewMessageListener(this._panel.webview);
  }

  public static render(extensionUri: vscode.Uri, globalState: vscode.Memento) {
    if (HelloWorldPanel.currentPanel) {
      HelloWorldPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
    } else {
      const panel = vscode.window.createWebviewPanel(
        'helloworld',
        'Hello World',
        vscode.ViewColumn.One,
        {
          // Enable javascript in the webview
          enableScripts: true,
          // Restrict the webview to only load resources from the `out` directory
          localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out')],
        },
      );

      HelloWorldPanel.currentPanel = new HelloWorldPanel(
        panel,
        globalState,
        extensionUri,
      );
    }
  }

  public dispose() {
    HelloWorldPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private _getWebviewContent(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
  ) {
    const webviewUri = getUri(webview, extensionUri, ['out', 'webview.js']);

    const nonce = getNonce();

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: http://161.35.239.203; script-src 'nonce-${nonce}';">
          <title>Hello World!</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
        </body>
      </html>
    `;
  }

  private _setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      async (message: any) => {
        const command = message.command;
        const text = message.text;

        switch (command) {
          case 'howdy':
            vscode.window.showInformationMessage(text);
            return;
          case 'loaded':
            const cookieJar = await getCookieJar(this._globalState);
            printCookieJar(cookieJar);
            const html = await getProblemPageTable(cookieJar);
            this._panel.webview.postMessage({
              command: 'html',
              content: html,
            });
            return;
        }
      },
      undefined,
      this._disposables,
    );
  }
}

type cookieJarObj = ReturnType<jsdom.CookieJar['toJSON']>;

function getCookieFromCookieJarObj(cookieJarObj: cookieJarObj, key: string) {
  return cookieJarObj.cookies.find((cookie) => cookie.key === key)?.value;
}

function convertCookieJarObjToCookieJar(cookieJarObj: cookieJarObj) {
  return jsdom.toughCookie.CookieJar.fromJSON(JSON.stringify(cookieJarObj));
}

function printCookieJar(cookieJar: jsdom.CookieJar) {
  console.log(JSON.stringify(cookieJar.toJSON()));
}

async function logIn(cookieJarObj: cookieJarObj, cookieJar: jsdom.CookieJar) {
  const hashedPassword = sha256(
    sha256('pass').toString() +
      getCookieFromCookieJarObj(cookieJarObj, 'PHPSESSID'),
  ).toString();

  const loginPageHtml = (
    await JSDOM.fromURL(
      `http://161.35.239.203/boca/index.php?name=team1&password=${hashedPassword}`,
      { cookieJar: cookieJar },
    )
  ).serialize();

  const loginSuccessful = loginPageHtml.includes(
    "document.location='team/index.php'",
  );

  return loginSuccessful;
}

// if there's a stored cookie jar and it's valid, return it
// (valid means user is already logged with it or it can be used to log in)
// otherwise, generate new cookie jar, log using it, store it and return it
async function getCookieJar(
  globalState: vscode.Memento,
): Promise<jsdom.CookieJar> {
  const storedCookieJarObj = globalState.get<cookieJarObj>('cookieJar');

  if (storedCookieJarObj !== undefined) {
    const storedCookieJar = convertCookieJarObjToCookieJar(storedCookieJarObj);

    const teamIndexPageHtml = (
      await JSDOM.fromURL('http://161.35.239.203/boca/team/index.php', {
        cookieJar: storedCookieJar,
      })
    ).serialize();

    const isLogged = !teamIndexPageHtml.includes(
      "alert('Session expired. You must log in again.');",
    );

    if (isLogged) {
      console.log('user is already logged in with stored cookie jar');
      return storedCookieJar;
    }

    const loginSuccessful = await logIn(storedCookieJarObj, storedCookieJar);

    if (loginSuccessful) {
      console.log('user logged in using stored cookie jar');
      return storedCookieJar;
    }

    // only known circumstance in which next code line is reached
    // is if PHPSESSID cookie is somehow set to undefined
    console.log('stored cookie jar is invalid');
  }

  // this page HTTP response has 2 Set-Cookie headers: PHPSESSID and biscoitobocabombonera
  const newCookieJar = (await JSDOM.fromURL('http://161.35.239.203/boca'))
    .cookieJar;

  const newCookieJarObj = newCookieJar.toJSON();

  const loginSuccessful = await logIn(newCookieJarObj, newCookieJar);

  if (!loginSuccessful) {
    throw new Error('login with newly created cookie jar failed');
  }

  globalState.update('cookieJar', newCookieJarObj);

  console.log('newly created/stored cookie jar was used to log in');
  return newCookieJar;
}

async function getProblemPageTable(cookieJar: jsdom.CookieJar) {
  const { document } = (
    await JSDOM.fromURL(`http://161.35.239.203/boca/team/problem.php`, {
      cookieJar,
    })
  ).window;

  const table = document.querySelector('table:nth-of-type(3)')!;

  table.querySelectorAll('img').forEach((img) => {
    img.src = img.src;
  });

  return table.outerHTML;
}
