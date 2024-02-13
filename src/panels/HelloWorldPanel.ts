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
            const html = await f(this._globalState);
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

async function f(globalState: vscode.Memento) {
  const getNewCookie = false;

  if (getNewCookie) {
    const cookieJar = (await JSDOM.fromURL('http://161.35.239.203/boca'))
      .cookieJar;

    const cookies = cookieJar.toJSON();
    const getCookie = (key: string) =>
      cookies.cookies.find((cookie) => cookie.key === key)!.value;

    const hashedPassword = sha256(
      sha256('pass').toString() + getCookie('PHPSESSID'),
    ).toString();
    const loginPage = await JSDOM.fromURL(
      `http://161.35.239.203/boca/index.php?name=team1&password=${hashedPassword}`,
      { cookieJar },
    );
    // console.log(loginPage.window.document.documentElement.outerHTML);

    globalState.update('cookie', cookies);
  }

  const saved =
    globalState.get<ReturnType<jsdom.CookieJar['toJSON']>>('cookie');
  console.log(JSON.stringify(saved?.cookies));

  const cookieJar = jsdom.toughCookie.CookieJar.fromJSON(JSON.stringify(saved));

  const { document } = (
    await JSDOM.fromURL(`http://161.35.239.203/boca/team/problem.php`, {
      cookieJar,
    })
  ).window;
  // console.log(document.documentElement.outerHTML);

  const table = document.querySelector('table:nth-of-type(3)')!;

  table.querySelectorAll('img').forEach((img) => {
    img.src = img.src;
  });

  return table.outerHTML;
}
