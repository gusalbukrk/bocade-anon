import * as vscode from 'vscode';
import * as runner from 'compile-run';

import BocaTeamDashboardWebview from './panels/BocaTeamDashboardWebview';
import TestCasesWebviewViewProvider from './panels/TestCasesWebviewViewProvider';

const splitInChunksOfTwo = (arr: string[]) =>
  arr.reduce<unknown[][]>((acc, cur, index) => {
    const chunkIndex = Math.floor(index / 2);

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (acc[chunkIndex] === undefined) {
      acc.push([]);
    }
    acc[chunkIndex].push(cur);

    return acc;
  }, []) as [string, string][];

const inputRegexBase = /^((exemplos? de |sample )?(entradas?|inputs?))/i;
const outputRegexBase = /^((exemplos? de |sample )?(sa(í|´ı)das?|outputs?))/i;
const inputRowRegex = new RegExp(
  `${inputRegexBase.source}$`,
  inputRegexBase.flags,
);
const outputRowRegex = new RegExp(
  `${outputRegexBase.source}$`,
  outputRegexBase.flags,
);
const inputAtStartRegex = new RegExp(
  `${inputRegexBase.source}( [0-9]+)?\\n`,
  inputRegexBase.flags,
);
const outputAtStartRegex = new RegExp(
  `${outputRegexBase.source}( [0-9]+)?\\n`,
  outputRegexBase.flags,
);

// headers are rows or substrings that're not part of the input/output data
// but instead describe it as such
const removeHeaders = (testCases: [string, string][]) => {
  // remove header rows, e.g. `[ ["Exemplos de Entrada", "Exemplos de Saída"], ... ]`
  const headerRowsRemoved = testCases.filter(([input, output]) => {
    return !inputRowRegex.test(input) || !outputRowRegex.test(output);
  });

  // remove header substrings at the start of input and output
  // e.g.: `[ ["Sample input 1\n1 5\n5 3 2 1 4", "Sample output 1\n5"], ... ]`
  const headerSubstringsRemoved = headerRowsRemoved.map(([input, output]) => {
    return [
      input.replace(inputAtStartRegex, ''),
      output.replace(outputAtStartRegex, ''),
    ];
  });

  return headerSubstringsRemoved;
};

export async function activate(context: vscode.ExtensionContext) {
  const openCommand = vscode.commands.registerCommand(
    'boca-team-dashboard.open',
    () => {
      BocaTeamDashboardWebview.render(context.extensionUri, context.secrets);
    },
  );
  context.subscriptions.push(openCommand);
  await vscode.commands.executeCommand('boca-team-dashboard.open');

  const organizeCommand = vscode.commands.registerCommand(
    'boca-team-dashboard.organize',
    async () => {
      await vscode.commands.executeCommand('workbench.action.joinAllGroups');

      // if there's no or only one editor, no need to organize
      // (also, `workbench.action.moveEditorToRightGroup` command won't work if there's only one
      // editor because empty editor groups are automatically removed)
      if (vscode.window.tabGroups.activeTabGroup.tabs.length <= 1) {
        return;
      }

      // navigate to the leftmost editor
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const leftMostEditorLabel =
          vscode.window.tabGroups.activeTabGroup.tabs[0].label;
        const currentEditorLabel =
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          vscode.window.tabGroups.activeTabGroup.activeTab!.label;

        if (leftMostEditorLabel === currentEditorLabel) {
          break;
        }

        await vscode.commands.executeCommand('workbench.action.previousEditor');
      }

      // place the Boca Team Dashboard and PDFs on the right editor group,
      // anything else goes on the left editor group
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const currentEditorLabel =
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          vscode.window.tabGroups.activeTabGroup.activeTab!.label;

        if (
          currentEditorLabel === 'BOCA Team Dashboard' ||
          /\.pdf$/.test(currentEditorLabel)
        ) {
          await vscode.commands.executeCommand(
            'workbench.action.moveEditorToRightGroup',
          );

          // if condition is true, it means that the previous command moved the last editor on the
          // left editor group to the right editor group; the left group editor consequently became
          // empty and it was removed (which is the default behavior for empty editor groups)
          if (vscode.window.tabGroups.all.length === 1) {
            break;
          }

          await vscode.commands.executeCommand(
            'workbench.action.focusLeftGroup',
          );

          if (vscode.window.tabGroups.activeTabGroup.activeTab === undefined) {
            break;
          }
        } else {
          const rightMostEditorGroupLabel =
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            vscode.window.tabGroups.activeTabGroup.tabs.at(-1)!.label;

          if (currentEditorLabel === rightMostEditorGroupLabel) {
            break;
          }

          await vscode.commands.executeCommand('workbench.action.nextEditor');
        }
      }
    },
  );
  context.subscriptions.push(organizeCommand);

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    -100, // lower means more to the right
  );
  statusBarItem.text = '$(split-horizontal)   Organize';
  statusBarItem.name = 'BOCA Team Dashboard – Organize tabs';
  statusBarItem.command = 'boca-team-dashboard.organize';
  statusBarItem.tooltip = 'BOCA Team Dashboard – Organize tabs';
  statusBarItem.backgroundColor = new vscode.ThemeColor(
    'statusBarItem.warningBackground',
  );
  statusBarItem.show();

  const testCasesProvider = new TestCasesWebviewViewProvider(
    context.extensionUri,
  );
  const testCasesView = vscode.window.registerWebviewViewProvider(
    TestCasesWebviewViewProvider.viewType,
    testCasesProvider,
    {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    },
  );
  context.subscriptions.push(testCasesView);

  const postCurrentTabChangedMessage = async () => {
    const currentTabLabel =
      vscode.window.tabGroups.activeTabGroup.activeTab?.label;

    await testCasesProvider.getView()?.webview.postMessage({
      command: 'currentTabChanged',
      currentTabLabel,
    });
  };

  vscode.window.tabGroups.onDidChangeTabs(postCurrentTabChangedMessage);
  // needed because `onDidChangeTabs` isn't triggered when activating
  // the tab in other tab group that already was previously activated
  vscode.window.tabGroups.onDidChangeTabGroups(postCurrentTabChangedMessage);

  const extractCommand = vscode.commands.registerCommand(
    'boca-team-dashboard.extract',
    async () => {
      type pdfInput = {
        uri: {
          fsPath: string;
        };
        viewType: 'pdf.preview';
      };

      const input = vscode.window.tabGroups.activeTabGroup.activeTab
        ?.input as Record<string, unknown>;

      if (input.viewType !== 'pdf.preview') {
        return;
      }

      const path = (input as pdfInput).uri.fsPath.replace(/\\/g, '\\\\');

      const result = await runner.python.runSource(
        `import pdfplumber

pdf = pdfplumber.open('${path}')

t = []

for page in pdf.pages:
	t += page.extract_tables()

print(t)`,
        {
          executionPath: 'python3',
        },
      );

      console.log('extraction result:', result);

      const testCasesArr = removeHeaders(
        splitInChunksOfTwo(
          // line breaks in the middle of the stdout are represented by a `\\n`
          // also, stdout always ends with a unescaped `\n`
          (JSON.parse(result.stdout.replaceAll("'", '"')) as unknown[]).flat(
            Infinity,
          ) as string[],
        ),
      );

      await testCasesProvider.getView()?.webview.postMessage({
        command: 'extracted',
        testCasesArr,
      });
    },
  );
  context.subscriptions.push(extractCommand);
}

export function deactivate() {}
