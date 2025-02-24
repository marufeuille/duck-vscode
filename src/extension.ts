import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import { DuckDBService } from './duckdbService';
import { SqlEditorPanel } from './sqlEditorPanel';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.openDuckSqlEditor', () => {
        SqlEditorPanel.createOrShow(context.extensionUri);
    });
    context.subscriptions.push(disposable);
    const runSqlFileCommand = vscode.commands.registerCommand(
        'extension.runSqlFileInDuckDB',
        async (uri: vscode.Uri) => {
            console.log("start command");
            
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No workspace is open.');
                return;
            }
    
            const workspacePath = workspaceFolders[0].uri.fsPath;
            process.chdir(workspacePath);
            try {
                const sqlFilePath = uri.fsPath;
                const content = await fs.readFile(sqlFilePath, 'utf8');

                const duckDBService = new DuckDBService();
                console.log("content: ", content);
                const result = await duckDBService.executeSql(content);

                SqlEditorPanel.createOrShow(context.extensionUri, content);
                SqlEditorPanel.currentPanel?.postMessage({ command: 'queryResult', result });
                console.log('SQL Execution Result:', result);
                return result; // SQLの実行結果を返す
            } catch (error) {
                console.log("fail");
                vscode.window.showErrorMessage(`Failed to read SQL file: ${error}`);
                return undefined;
            }
        }
    );

    context.subscriptions.push(runSqlFileCommand);
}
