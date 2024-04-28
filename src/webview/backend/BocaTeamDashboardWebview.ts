import mime from 'mime-types';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as vscode from 'vscode';

import getCredentials, { credentials } from './getCredentials';
import { getUri, getNonce } from '../../shared';
import {
  logIn as logInBase,
  logOut,
  download as downloadBase,
  submitForm,
} from './navigate';
import {
  getProblems,
  getClarifications,
  getScore,
  getRunsData,
} from './getData';

type message = { command: 'logout' | 'loaded' | 'reload' | 'pick-file' };
type loginMessage = { command: 'submit-login'; credentials: credentials };
type downloadMessage = { command: 'download'; filename: string; url: string };
type submitRunMessage = {
  command: 'submit-run';
  problem: string;
  language: string;
  filePath: string;
};
type submitClarificationMessage = {
  command: 'submit-clarification';
  problem: string;
  question: string;
};

class BocaTeamDashboardWebview {
  public static currentPanel: BocaTeamDashboardWebview | undefined;
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
      async () => {
        this.dispose();

        // reopen the webview if user has closed it
        await vscode.commands.executeCommand('boca-team-dashboard.open');
      },
      null,
      this._disposables,
    );
    this._panel.iconPath = {
      light: vscode.Uri.joinPath(extensionUri, 'media', 'code-black.svg'),
      dark: vscode.Uri.joinPath(extensionUri, 'media', 'code-white.svg'),
    };
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
    if (BocaTeamDashboardWebview.currentPanel) {
      BocaTeamDashboardWebview.currentPanel._panel.reveal();
    } else {
      const panel = vscode.window.createWebviewPanel(
        'DashboardWebview',
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
          enableFindWidget: true,
          retainContextWhenHidden: true,
        },
      );

      BocaTeamDashboardWebview.currentPanel = new BocaTeamDashboardWebview(
        panel,
        secrets,
        extensionUri,
      );
    }
  }

  public dispose() {
    BocaTeamDashboardWebview.currentPanel = undefined;

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
      'webview.css',
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
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource} data:; img-src ${webview.cspSource} https: http:; script-src 'nonce-${nonce}';">
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
      async (
        message:
          | message
          | loginMessage
          | downloadMessage
          | submitClarificationMessage
          | submitRunMessage,
      ) => {
        const { command } = message;

        if (command === 'submit-login') {
          await logIn(message);
        } else if (command === 'logout') {
          await logOut(this._secrets);
        } else {
          const c = await getCredentials(this._secrets, false);

          if (c !== null && c.expireAt <= Date.now()) {
            await logOut(this._secrets);

            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            vscode.window.showErrorMessage(
              'Credentials expired. Please, log in again.',
              {
                modal: true,
              },
            );
          }
        }

        const credentials = await getCredentials(this._secrets, false);
        if (
          credentials === null // login failed, command is `logout` or credentials were expired
        ) {
          await this._panel.webview.postMessage({
            command: 'update-data',
            credentials,
          });
          return;
        }

        if (command === 'loaded' || command === 'reload') {
          await updateData();
        } else if (command === 'submit-clarification') {
          await submitClarification(message);
          await updateClarificationsData();
        } else if (command === 'submit-run') {
          await submitRun(message);
          await updateRunsData();
        } else if (command === 'download') {
          await download(message);
        } else if (command === 'pick-file') {
          await pickFile();
        }
      },
      undefined,
      this._disposables,
    );

    /** update all data in webview */
    const updateData = async () => {
      const credentials = await getCredentials(this._secrets, false);
      const problems = await getProblems(this._secrets);
      const clarifications = await getClarifications(this._secrets);
      const score = await getScore(this._secrets);
      const {
        contestRemainingTime,
        runs,
        allowedProgrammingLanguages,
        problemsIds,
      } = await getRunsData(this._secrets);

      await this._panel.webview.postMessage({
        command: 'update-data',
        credentials,
        contestRemainingTime,
        problems,
        runs,
        clarifications,
        score,
        allowedProgrammingLanguages,
        problemsIds,
      });
    };

    const updateClarificationsData = async () => {
      const clarifications = await getClarifications(this._secrets);
      await this._panel.webview.postMessage({
        command: 'update-clarifications-data',
        clarifications,
      });
    };

    const updateRunsData = async () => {
      const { runs } = await getRunsData(this._secrets);

      await this._panel.webview.postMessage({
        command: 'update-runs-data',
        runs,
      });
    };

    const logIn = async (message: loginMessage) => {
      const error = await logInBase(message.credentials, this._secrets);

      if (error === null) {
        await updateData();
      }

      await this._panel.webview.postMessage({
        command: 'login-submitted',
        error,
      });
    };

    const submitClarification = async (message: submitClarificationMessage) => {
      const { problem, question } = message;

      const formBody = new FormData();
      formBody.append('confirmation', 'confirm');
      formBody.append('problem', problem);
      formBody.append('message', question);
      formBody.append('Submit', 'Send');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const submissionHtmlResponse = await submitForm(
        this._secrets,
        'team/clar.php',
        formBody,
      );
      console.log(submissionHtmlResponse);

      await this._panel.webview.postMessage({
        command: 'clarification-submitted',
      });
    };

    const submitRun = async (message: submitRunMessage) => {
      const { problem, language, filePath } = message;
      const blob = new Blob(
        [readFileSync(filePath, { encoding: 'utf8', flag: 'r' })],

        // options.type is optional (defaults to '')
        // leave it undefined doesn't appear to break anything
        // however, it's being defined here just in case
        { type: mime.lookup(path.extname(filePath)) || '' },
      );

      const formBody = new FormData();
      formBody.append('confirmation', 'confirm');
      formBody.append('problem', problem);
      formBody.append('language', language);
      // may trigger warning `ExperimentalWarning: buffer.File is an experimental feature`;
      // as you can see here https://nodejs.org/api/buffer.html#class-file,
      // API is no longer experimental as of v20
      // (to check which Node version VS Code is running on, go to Help > About)
      formBody.append('sourcefile', blob, path.basename(filePath));
      formBody.append('Submit', 'Send');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const submissionHtmlResponse = await submitForm(
        this._secrets,
        'team/run.php',
        formBody,
      );
      console.log(submissionHtmlResponse);

      await this._panel.webview.postMessage({
        command: 'run-submitted',
      });
    };

    const download = async (message: downloadMessage) => {
      const pathToSave =
        vscode.workspace.workspaceFolders === undefined
          ? // if VS Code doesn't have a opened directory, save file in cwd
            // (i.e. the directory from which VS Code was opened from)
            message.filename
          : path.join(
              vscode.workspace.workspaceFolders[0].uri.fsPath,
              message.filename,
            );

      await downloadBase(message.url, pathToSave, this._secrets);

      // wait a while to open file, because error if tried to open while downloading;
      // for PDFs, error message appears in view and it's not automatically dismissed even after
      // download finished and document opened successfully; for other files, they don't even open
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      setTimeout(async () => {
        if (/\.pdf$/.test(message.filename)) {
          // https://github.com/microsoft/vscode/issues/98473#issuecomment-634306217
          // https://github.com/tomoki1207/vscode-pdfviewer/blob/d5f1ea28d1826dad60a3f4b6f025109caea9b4c2/src/pdfProvider.ts#L5
          await vscode.commands.executeCommand(
            'vscode.openWith',
            vscode.Uri.file(pathToSave),
            'pdf.preview',
          );
        } else {
          await vscode.window.showTextDocument(vscode.Uri.file(pathToSave), {
            preview: false,
          });
        }
      }, 1000);
    };

    const pickFile = async () => {
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
        command: 'file-picked',
        path: files?.[0].fsPath,
      });
    };
  }
}

export default BocaTeamDashboardWebview;
