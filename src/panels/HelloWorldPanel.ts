import fs from 'node:fs';
import * as vscode from 'vscode';
import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';
import cookie from 'cookie';
import sha256 from 'crypto-js/sha256.js';

import { getUri } from '../utilities/getUri';
import { getNonce } from '../utilities/getNonce';

export class HelloWorldPanel {
  public static currentPanel: HelloWorldPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getWebviewContent(
      this._panel.webview,
      extensionUri,
    );
    this._setWebviewMessageListener(this._panel.webview);
  }

  public static render(extensionUri: vscode.Uri) {
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

      HelloWorldPanel.currentPanel = new HelloWorldPanel(panel, extensionUri);
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
            const html = await f2();
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

async function f() {
  const browser = await puppeteer.launch({ headless: true });

  const page = (await browser.pages())[0];

  await page.goto('http://161.35.239.203/boca');

  await page.setViewport({ width: 1080, height: 1024 });

  await page.type('input[name=name]', 'team1');
  await page.type('input[name=password]', 'pass');

  await Promise.all([
    page.click('input[value=Login]'),
    page.waitForNavigation(),
  ]);

  await Promise.all([
    page.waitForNavigation(),
    page.click('a[href="problem.php"]'),
  ]);

  const table = await page.$('table:nth-of-type(3)');
  const html = (await table!.evaluate((el) => el.outerHTML)).replaceAll(
    /(\/boca\/balloons\/[a-z0-9]+?.png)/g,
    'http://161.35.239.203$1',
  );

  await browser.close();

  return html;
}

// https://github.com/puppeteer/puppeteer/issues/299#issuecomment-1848206653
async function waitForDownload(downloadPath: string, timeout = 60000) {
  let startTime = new Date().getTime();

  while (true) {
    if (fs.existsSync(downloadPath)) {
      return true;
    } else if (new Date().getTime() - startTime > timeout) {
      throw new Error('Download timeout.');
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

async function f2() {
  const cookies = cookie.parse(
    (await fetch('http://161.35.239.203/boca')).headers
      .getSetCookie()
      .map((str) => str.replace(/;.*$/, ''))
      .join('; '),
  );

  const hashedPassword = sha256(
    sha256('pass').toString() + cookies['PHPSESSID'],
  ).toString();
  //
  const login = await fetch(
    `http://161.35.239.203/boca/index.php?name=team1&password=${hashedPassword}`,
    {
      headers: {
        cookie: `PHPSESSID=${cookies['PHPSESSID']}; biscoitobocabombonera=${cookies['biscoitobocabombonera']}`,
      },
    },
  );

  const problemPage = await (
    await fetch('http://161.35.239.203/boca/team/problem.php', {
      headers: {
        cookie: `PHPSESSID=${cookies['PHPSESSID']}; biscoitobocabombonera=${cookies['biscoitobocabombonera']}`,
      },
    })
  ).text();

  const { document } = new JSDOM(problemPage, {
    url: 'http://161.35.239.203/',
  }).window;

  const table = document.querySelector('table:nth-of-type(3)')!;

  table.querySelectorAll('img').forEach((img) => {
    img.src = img.src;
  });

  const html = table.outerHTML;

  return html;
}
