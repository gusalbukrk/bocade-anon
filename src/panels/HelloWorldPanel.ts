import path from 'node:path';
import * as vscode from 'vscode';

import getCredentials, { credentials } from '../utils/getCredentials';
import { getUri } from '../utils/getUri';
import { getNonce } from '../utils/getNonce';
import {
  getPageJSDOM,
  download,
  storeCredentialsIfValid,
  logOut,
} from '../utils/navigate';

type message = { command: string };
type howdyMessage = { command: 'howdy'; text: string };
type loginMessage = { command: 'login'; credentials: credentials };
type downloadMessage = { command: 'download'; name: string; url: string };

export class HelloWorldPanel {
  public static currentPanel: HelloWorldPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _secrets: vscode.SecretStorage;
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    secrets: vscode.SecretStorage,
    extensionUri: vscode.Uri,
  ) {
    this._panel = panel;
    this._secrets = secrets;
    this._panel.onDidDispose(
      () => {
        this.dispose();
      },
      null,
      this._disposables,
    );
    this._panel.webview.html = this._getWebviewContent(
      this._panel.webview,
      extensionUri,
    );
    this._setWebviewMessageListener(this._panel.webview);
  }

  public static render(
    extensionUri: vscode.Uri,
    secrets: vscode.SecretStorage,
  ) {
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
        secrets,
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
    const webviewUri = getUri(webview, extensionUri, [
      'out',
      'webview.js',
    ]).toString();

    const nonce = getNonce();

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: http:; script-src 'nonce-${nonce}';">
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
      async (message: message) => {
        switch (message.command) {
          case 'howdy': // howdy button was clicked
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            vscode.window.showInformationMessage(
              (message as howdyMessage).text,
            );
            return;
          case 'loaded': // window on load event has just been triggered
            await updateUI(this._secrets, this._panel);
            return;
          case 'login': // login form has been submitted
            // assuring old credentials don't interfere with new credentials validation
            await logOut(this._secrets);

            const errorObject = await storeCredentialsIfValid(
              (message as loginMessage).credentials,
              this._secrets,
            );

            await updateUI(this._secrets, this._panel);

            if (errorObject === null) {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              vscode.window.showInformationMessage('Logged in successfully!');
            } else {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              vscode.window.showErrorMessage(
                `Login failed. Reason: ${errorObject.message}. Please try again.`,
              );
            }

            await this._panel.webview.postMessage({
              command: 'login-finished',
            });

            return;
          case 'logout': // logout button was clicked
            await logOut(this._secrets);
            await updateUI(this._secrets, this._panel);
            return;
          case 'download': // user clicked on a link to download a pdf
            const pathToSave =
              vscode.workspace.workspaceFolders === undefined
                ? // if VS Code doesn't have a opened directory, save file in cwd
                  // (i.e. the directory from which VS Code was opened from)
                  (message as downloadMessage).name
                : path.join(
                    vscode.workspace.workspaceFolders[0].uri.fsPath,
                    (message as downloadMessage).name,
                  );

            await download(
              (message as downloadMessage).url,
              pathToSave,
              this._secrets,
            );

            return;
        }
      },
      undefined,
      this._disposables,
    );
  }
}

// if there're stored credentials, fetch data from BOCA and send it to the webview
async function updateUI(
  secrets: vscode.SecretStorage,
  panel: vscode.WebviewPanel,
) {
  const credentials = await getCredentials(secrets, false);

  if (credentials === null) {
    await panel.webview.postMessage({
      command: 'update-ui',
      credentials,
    });
    return;
  }

  const [html, problemPageDownloadLinks] = await getProblemPageTable(secrets);
  const runPageDownloadLinks = await getRunPageLinks(secrets);

  await panel.webview.postMessage({
    command: 'update-ui',
    credentials,
    content: html,
    downloadLinks: [...problemPageDownloadLinks, ...runPageDownloadLinks],
  });
}

async function getProblemPageTable(secrets: vscode.SecretStorage) {
  const problemPageJSDOM = await getPageJSDOM('team/problem.php', secrets);

  const table = problemPageJSDOM.window.document.querySelector(
    'table:nth-of-type(3)',
  );

  if (table === null) {
    throw new Error('no problems table found on problem.php');
  }

  table.querySelectorAll('img').forEach((img) => {
    img.src = img.src;
  });

  const pdfs = [...table.querySelectorAll('a')].map((a) => {
    return { name: a.textContent, url: a.href };
  });

  return [table.outerHTML, pdfs];
}

async function getRunPageLinks(secrets: vscode.SecretStorage) {
  const runPageJSDOM = await getPageJSDOM('team/run.php', secrets);

  const links = [
    ...runPageJSDOM.window.document.querySelectorAll<HTMLAnchorElement>(
      'table:nth-of-type(3) a',
    ),
  ].map((a) => ({ name: a.text, url: a.href }));

  return links;
}
