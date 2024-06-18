import * as vscode from 'vscode';

import BocadeWebview from './webview/backend/BocadeWebview';
import TestCasesWebviewViewProvider from './view/backend/TestCasesWebviewViewProvider';

import organize from './commands/organize';
import extract from './commands/extract';

const postCurrentTabChangedMessageBase = async (
  provider: TestCasesWebviewViewProvider,
) => {
  const currentTabLabel =
    vscode.window.tabGroups.activeTabGroup.activeTab?.label;

  await provider.getView()?.webview.postMessage({
    command: 'currentTabChanged',
    currentTabLabel,
  });
};

export async function activate(context: vscode.ExtensionContext) {
  const openCommand = vscode.commands.registerCommand('bocade.open', () => {
    BocadeWebview.render(context.extensionUri, context.secrets);
  });
  context.subscriptions.push(openCommand);
  //
  const deleteCommand = vscode.commands.registerCommand(
    'bocade.delete',
    async () => {
      console.log('!!!', await context.secrets.get('credentials'));
      console.log('!!!', await context.secrets.get('cookieJar'));
      await context.secrets.delete('credentials');
      await context.secrets.delete('cookieJar');
    },
  );
  context.subscriptions.push(deleteCommand);
  //
  const organizeCommand = vscode.commands.registerCommand(
    'bocade.organize',
    organize,
  );
  context.subscriptions.push(organizeCommand);
  //
  const extractCommand = vscode.commands.registerCommand('bocade.extract', () =>
    extract(testCasesProvider),
  );
  context.subscriptions.push(extractCommand);

  await vscode.commands.executeCommand('bocade.open');

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
  //
  const postCurrentTabChangedMessage = () =>
    postCurrentTabChangedMessageBase(testCasesProvider);
  vscode.window.tabGroups.onDidChangeTabs(postCurrentTabChangedMessage);
  // needed because `onDidChangeTabs` isn't triggered when activating
  // the tab in other tab group that already was previously activated
  vscode.window.tabGroups.onDidChangeTabGroups(postCurrentTabChangedMessage);

  // 2 represents dark mode
  // https://code.visualstudio.com/api/references/vscode-api#ColorThemeKind
  const updateDarkModeTogglerTooltip = () =>
    (darkModeToggler.tooltip = `${vscode.window.activeColorTheme.kind !== (2 as vscode.ColorThemeKind) ? 'Enable' : 'Disable'} dark mode`);
  //
  const darkModeToggler = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    -99, // lower means more to the right
  );
  darkModeToggler.text = '$(color-mode)';
  darkModeToggler.name = 'Toggle dark mode';
  updateDarkModeTogglerTooltip();
  darkModeToggler.command = 'workbench.action.toggleLightDarkThemes';
  darkModeToggler.show();
  vscode.window.onDidChangeActiveColorTheme(() => {
    updateDarkModeTogglerTooltip();
  });

  const organizeButton = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    -100, // lower means more to the right
  );
  organizeButton.text = '$(split-horizontal)   Organize';
  organizeButton.name = 'BOCADE – Organize tabs';
  organizeButton.command = 'bocade.organize';
  organizeButton.tooltip = 'BOCADE – Organize tabs';
  organizeButton.backgroundColor = new vscode.ThemeColor(
    'statusBarItem.warningBackground',
  );
  organizeButton.show();
}

export function deactivate() {}
