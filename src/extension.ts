import * as vscode from 'vscode';
import { promises as fs } from 'fs'; 

import {SqlEditorPanel} from './sqlEditorPanel';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.openDuckSqlEditor', () => {
        SqlEditorPanel.createOrShow(context.extensionUri);
    });

    context.subscriptions.push(disposable);
    const runSqlFileCommand = vscode.commands.registerCommand(
        'extension.runSqlFileInDuckDB',
        async (uri: vscode.Uri) => {
            try {
                const sqlFilePath = uri.fsPath; 
                const content = await fs.readFile(sqlFilePath, 'utf8');

                SqlEditorPanel.createOrShow(context.extensionUri, content);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to read SQL file: ${error}`);
            }
        }
    );
    context.subscriptions.push(runSqlFileCommand);
}

export function deactivate() {}

