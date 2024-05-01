import * as vscode from 'vscode';
import * as runner from 'compile-run';

import { getNonce, getUri } from '../../shared';
import { sourceCodeExtension, testCases } from '../shared';

type runMessage = { command: 'run'; testCases: testCases };

type extractMessage = { command: 'extract' };

class TestCasesWebviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'testCasesView';

  private _view?: vscode.WebviewView;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  constructor(private readonly _extensionUri: vscode.Uri) {}

  public getView() {
    return this._view;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext, // eslint-disable-line @typescript-eslint/no-unused-vars
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'out'),
        vscode.Uri.joinPath(
          this._extensionUri,
          'node_modules',
          '@vscode/codicons',
          'dist',
        ),
      ],
    };

    webviewView.webview.html = this._getWebviewContent(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      async (message: runMessage | extractMessage) => {
        if (message.command === 'run') {
          const results = await Promise.all(
            message.testCases.map(async (tc) => {
              return await runCode(
                vscode.window.activeTextEditor?.document.fileName ?? '',
                tc.input,
              );
            }),
          );

          console.log('execution results:', results);

          await webviewView.webview.postMessage({
            command: 'ran',
            results,
          });
        } else {
          await vscode.commands.executeCommand('boca-team-dashboard.extract');
        }
      },
    );
  }

  private _getWebviewContent(webview: vscode.Webview) {
    const webviewUriStr = getUri(webview, this._extensionUri, [
      'out',
      'view.js',
    ]).toString();
    const stylesheetUriStr = getUri(webview, this._extensionUri, [
      'out',
      'view.css',
    ]).toString();
    const codiconsUriStr = getUri(webview, this._extensionUri, [
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
          <title>Test Cases</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${webviewUriStr}"></script>
        </body>
      </html>
    `;
  }
}

async function runCode(
  filePath: string,
  stdin: string,
): Promise<runner.Result> {
  const extension = filePath.split('.').pop() as sourceCodeExtension;

  switch (extension) {
    case 'c':
      return await runner.c.runFile(filePath, { stdin });
    case 'cpp':
    case 'cc':
      return await runner.cpp.runFile(filePath, { stdin });
    case 'java':
      return await runner.java.runFile(filePath, {
        stdin,
        compileTimeout: 10000,
      });
    case 'py':
    case 'py2':
    case 'py3':
      return await runner.python.runFile(filePath, {
        stdin,
        executionPath: 'python3',
      });
    case 'js':
    case 'cjs':
    case 'mjs':
      return await runner.node.runFile(filePath, { stdin });
  }
}

export default TestCasesWebviewViewProvider;
