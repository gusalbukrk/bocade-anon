import mime from 'mime-types';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as vscode from 'vscode';

import getCredentials, { credentials } from '../utils/getCredentials';
import { getUri } from '../utils/getUri';
import { getNonce } from '../utils/getNonce';
import { logIn, logOut, download, submitForm } from '../utils/navigate';
import {
  getProblems,
  getClarifications,
  getScore,
  getRunsData,
} from '../utils/getData';

type message = { command: string };
type loginMessage = { command: 'login'; credentials: credentials };
type downloadMessage = { command: 'download'; name: string; url: string };
type runsSubmitMessage = {
  command: 'runs-submit';
  problem: string;
  language: string;
  filePath: string;
};
type clarificationsSubmitMessage = {
  command: 'clarifications-submit';
  problem: string;
  question: string;
};

class BocaTeamDashboard {
  public static currentPanel: BocaTeamDashboard | undefined;
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
    if (BocaTeamDashboard.currentPanel) {
      BocaTeamDashboard.currentPanel._panel.reveal(vscode.ViewColumn.One);
    } else {
      const panel = vscode.window.createWebviewPanel(
        'bocaTeamDashboard',
        'BOCA Team Dashboard',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(extensionUri, 'out'),
            vscode.Uri.joinPath(
              extensionUri,
              'node_modules',
              '@vscode/codicons',
              'dist',
            ),
          ],
        },
      );

      BocaTeamDashboard.currentPanel = new BocaTeamDashboard(
        panel,
        secrets,
        extensionUri,
      );
    }
  }

  public dispose() {
    BocaTeamDashboard.currentPanel = undefined;

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
    const webviewUriStr = getUri(webview, extensionUri, [
      'out',
      'webview.js',
    ]).toString();
    const stylesheetUriStr = getUri(webview, extensionUri, [
      'out',
      'index.css',
    ]).toString();
    const codiconsUriStr = getUri(webview, extensionUri, [
      'node_modules',
      '@vscode/codicons',
      'dist',
      'codicon.css',
    ]).toString(true);

    const nonce = getNonce();

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: http:; script-src 'nonce-${nonce}';">
          <link href="${stylesheetUriStr}" rel="stylesheet" />
          <link href="${codiconsUriStr}" rel="stylesheet" />
          <title>BOCA Team Dashboard</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${webviewUriStr}"></script>
        </body>
      </html>
    `;
  }

  private _setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      async (message: message) => {
        switch (message.command) {
          case 'loaded': // window on load event has just been triggered
            const credentials = await getCredentials(this._secrets, false);

            if (credentials !== null && credentials.expireAt < Date.now()) {
              await logOut(this._secrets);

              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              vscode.window.showErrorMessage(
                'Credentials expired. Please, log in again.',
              );
            }

            await updateUi(this._secrets, this._panel);
            return;
          case 'login': // login form has been submitted
            const errorObject = await logIn(
              (message as loginMessage).credentials,
              this._secrets,
            );

            await updateUi(this._secrets, this._panel);

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
            await updateUi(this._secrets, this._panel);
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
          case 'runs-submit':
            const {
              problem: runProblem,
              language,
              filePath,
            } = message as runsSubmitMessage;
            const blob = new Blob(
              [readFileSync(filePath, { encoding: 'utf8', flag: 'r' })],

              // options.type is optional (defaults to '')
              // leave it undefined doesn't appear to break anything
              // however, it's being defined here just in case
              { type: mime.lookup(path.extname(filePath)) || '' },
            );

            const runsFormBody = new FormData();
            runsFormBody.append('confirmation', 'confirm');
            runsFormBody.append('problem', runProblem);
            runsFormBody.append('language', language);
            // may trigger warning `ExperimentalWarning: buffer.File is an experimental feature`;
            // as you can see here https://nodejs.org/api/buffer.html#class-file,
            // API is no longer experimental as of v20
            // (to check which Node version VS Code is running on, go to Help > About)
            runsFormBody.append('sourcefile', blob, path.basename(filePath));
            runsFormBody.append('Submit', 'Send');

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const runsSubmissionHtmlResponse = await submitForm(
              this._secrets,
              'team/run.php',
              runsFormBody,
            );
            console.log(runsSubmissionHtmlResponse);

            await this._panel.webview.postMessage({
              command: 'runs-submitted',
            });

            return;
          case 'clarifications-submit':
            const { problem: clarificationProblem, question } =
              message as clarificationsSubmitMessage;

            const clarificationsFormBody = new FormData();
            clarificationsFormBody.append('confirmation', 'confirm');
            clarificationsFormBody.append('problem', clarificationProblem);
            clarificationsFormBody.append('message', question);
            clarificationsFormBody.append('Submit', 'Send');

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const clarificationsSubmissionHtmlResponse = await submitForm(
              this._secrets,
              'team/clar.php',
              clarificationsFormBody,
            );
            console.log(clarificationsSubmissionHtmlResponse);

            await this._panel.webview.postMessage({
              command: 'clarifications-submitted',
            });

            return;
          case 'pick-file': // 'Choose a file' button has been clicked
            const files = await vscode.window.showOpenDialog({
              openLabel: 'Select file',
              title: 'File dialog',
              canSelectMany: false,
              filters: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Source code': [
                  'c',
                  'cc',
                  'cpp',
                  'cxx',
                  'java',
                  'py',
                  'py2',
                  'py3',
                  'kt',
                  'kts',
                  'js',
                  'cjs',
                  'mjs',
                ],
              },
            });

            await this._panel.webview.postMessage({
              command: 'picked-file',
              path: files?.[0].fsPath,
            });

            return;
        }
      },
      undefined,
      this._disposables,
    );
  }
}

/**
 * post `update-ui` event to the webview; additionally,
 * if there're credentials stored, send some data for the webview to display
 */
async function updateUi(
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

  const problems = await getProblems(secrets);
  const clarifications = await getClarifications(secrets);
  const score = await getScore(secrets);
  const { runs, allowedProgrammingLanguages, problemsIds } =
    await getRunsData(secrets);

  await panel.webview.postMessage({
    command: 'update-ui',
    credentials,
    problems,
    runs,
    clarifications,
    score,
    allowedProgrammingLanguages,
    problemsIds,
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function inspectSecretStorage(secrets: vscode.SecretStorage) {
  console.log({
    credentials: await secrets.get('credentials'),
    cookieJar: await secrets.get('cookieJar'),
  });
}

export default BocaTeamDashboard;
