import { JSDOM } from 'jsdom';
import path from 'node:path';
import * as vscode from 'vscode';

import getCredentials, { credentials } from '../utils/getCredentials';
import { getUri } from '../utils/getUri';
import { getNonce } from '../utils/getNonce';
import {
  getPageJSDOM,
  download,
  storeCredentialsIfValid,
} from '../utils/navigate';

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
      async (message: any) => {
        switch (message.command) {
          case 'howdy': // howdy button was clicked
            vscode.window.showInformationMessage(message.text);
            return;
          case 'loaded': // window on load event has just been triggered
            updateUI(this._globalState, this._panel);
            return;
          case 'login': // login form has been submitted
            // log out (consequently, clear cookie jar) to assure
            // old credentials don't interfere with new credentials validation
            await getPageJSDOM('index.php', this._globalState);

            const areCredentialsValid = await storeCredentialsIfValid(
              message.credentials,
              this._globalState,
            );
            updateUI(this._globalState, this._panel);
            return;
          case 'logout': // logout button was clicked
            getPageJSDOM('index.php', this._globalState); // log out
            this._globalState.update('credentials', undefined);
            updateUI(this._globalState, this._panel);
            return;
          case 'download': // user clicked on a link to download a pdf
            const pathToSave =
              vscode.workspace.workspaceFolders === undefined
                ? // if VS Code doesn't have a opened directory, save file in cwd
                  // (i.e. the directory from which VS Code was opened from)
                  message.name
                : path.join(
                    vscode.workspace.workspaceFolders[0].uri.fsPath,
                    message.name,
                  );

            await download(message.url, pathToSave, this._globalState);

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
  globalState: vscode.Memento,
  panel: vscode.WebviewPanel,
) {
  const credentials = getCredentials(globalState, false);

  if (credentials === null) {
    panel.webview.postMessage({
      command: 'update-ui',
      credentials,
    });
    return;
  }

  const [html, problemPageDownloadLinks] =
    await getProblemPageTable(globalState);
  const runPageDownloadLinks = await getRunPageLinks(globalState);

  panel.webview.postMessage({
    command: 'update-ui',
    credentials,
    content: html,
    downloadLinks: [...problemPageDownloadLinks, ...runPageDownloadLinks],
  });
}

async function getProblemPageTable(globalState: vscode.Memento) {
  const ip = getCredentials(globalState)!.ip;
  const problemPageJSDOM = await getPageJSDOM('team/problem.php', globalState);

  const table = problemPageJSDOM.window.document.querySelector(
    'table:nth-of-type(3)',
  )!;

  table.querySelectorAll('img').forEach((img) => {
    img.src = img.src;
  });

  const pdfs = [...table.querySelectorAll('a')].map((a) => {
    return { name: a.textContent, url: a.href };
  });

  return [table.outerHTML, pdfs];
}

async function getRunPageLinks(globalState: vscode.Memento) {
  const ip = getCredentials(globalState)!.ip;
  const runPageJSDOM = await getPageJSDOM('team/run.php', globalState);

  const links = [
    ...runPageJSDOM.window.document.querySelectorAll<HTMLAnchorElement>(
      'table:nth-of-type(3) a',
    ),
  ].map((a) => ({ name: a.textContent!, url: a.href }));

  return links;
}
