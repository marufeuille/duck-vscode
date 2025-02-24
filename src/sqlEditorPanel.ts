import * as vscode from 'vscode';
import { DuckDBService } from './duckdbService';
import { promises as fs } from 'fs';

export class SqlEditorPanel {
    public static currentPanel: SqlEditorPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public async runQuery(sql: string) {
        const duckDBService = new DuckDBService();
        try {
            const result = await duckDBService.executeSql(sql);
            this._panel.webview.postMessage({ command: 'queryResult', result });
        } catch (err: any) {
            this._panel.webview.postMessage({ command: 'queryError', message: err.message });
        }
    }

    public postMessage(message: any) {
        this._panel.webview.postMessage(message);
    }

    public static createOrShow(extensionUri: vscode.Uri, initialQuery?: string) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (SqlEditorPanel.currentPanel) {
            SqlEditorPanel.currentPanel._panel.reveal(column);
            // initialQuery があれば実行
            if (initialQuery) {
                SqlEditorPanel.currentPanel.runQuery(initialQuery);
            }
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'sqlEditor',
            'DuckDB SQL Editor',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        SqlEditorPanel.currentPanel = new SqlEditorPanel(panel, extensionUri);

        if (initialQuery) {
			SqlEditorPanel.currentPanel.setEditorValue(initialQuery);
            SqlEditorPanel.currentPanel.runQuery(initialQuery);
        }
    }
	
    public setEditorValue(sql: string) {
        this._panel.webview.postMessage({ command: 'setEditorValue', sql });
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'executeQuery':
                        const sql = message.sql;
                        this.runQuery(sql);
                        break;
                    case 'saveFile':
                        this.saveFile(message.sql);
                        break;
                }
            },
            undefined,
            this._disposables
        );

        // パネルのdispose時のクリーンアップ
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    private async _update() {
        this._panel.webview.html = await this._getHtmlForWebview(this._panel.webview);
    }

    private async saveFile(sql: string) {
        const options: vscode.SaveDialogOptions = {
            saveLabel: "Save SQL File",
            filters: {
                'SQL Files': ['sql'],
                'All Files': ['*']
            }
        };

        const fileUri = await vscode.window.showSaveDialog(options);
        if (fileUri) {
            try {
                await fs.writeFile(fileUri.fsPath, sql, 'utf8');
                vscode.window.showInformationMessage('SQLファイルが保存されました。');
            } catch (error) {
                vscode.window.showErrorMessage(`ファイルの保存に失敗しました: ${error}`);
            }
        }
    }

    public dispose() {
        SqlEditorPanel.currentPanel = undefined;

        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async _getHtmlForWebview(webview: vscode.Webview): Promise<string> {
        const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'editor.html');
        let htmlContent = await vscode.workspace.fs.readFile(htmlPath);
        let html = htmlContent.toString();

        const baseUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media'));
        return html;
    }
}
