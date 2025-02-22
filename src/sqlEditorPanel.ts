import * as vscode from 'vscode';
import { DuckDBClient } from './duckdbClient';

export class SqlEditorPanel {
    public static currentPanel: SqlEditorPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    // ここで実際に SQL を実行
    public async runQuery(sql: string) {
        const client = new DuckDBClient();
        try {
            const result = await client.execute(sql);
            // 実行結果を Webview に送信
            this._panel.webview.postMessage({ command: 'queryResult', result });
        } catch (err: any) {
            this._panel.webview.postMessage({ command: 'queryError', message: err.message });
        }
    }

    public static createOrShow(extensionUri: vscode.Uri, initialQuery?: string) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // 既にパネルが存在する場合
        if (SqlEditorPanel.currentPanel) {
            SqlEditorPanel.currentPanel._panel.reveal(column);
            // initialQuery があれば実行
            if (initialQuery) {
                SqlEditorPanel.currentPanel.runQuery(initialQuery);
            }
            return;
        }

        // 新しいパネルを作成
        const panel = vscode.window.createWebviewPanel(
            'sqlEditor',
            'DuckDB SQL Editor',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        SqlEditorPanel.currentPanel = new SqlEditorPanel(panel, extensionUri);

        // パネル生成直後にもクエリを実行したい場合
        if (initialQuery) {
			SqlEditorPanel.currentPanel.setEditorValue(initialQuery);
            SqlEditorPanel.currentPanel.runQuery(initialQuery);
        }
    }
	
    public setEditorValue(sql: string) {
        // Webview に対して「エディタの内容を更新」メッセージを送る
        this._panel.webview.postMessage({ command: 'setEditorValue', sql });
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // WebviewのHTML
        this._update();

        // Webviewからのメッセージ受信（ユーザーがエディタから実行ボタンを押した場合）
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'executeQuery':
                        const sql = message.sql;
                        this.runQuery(sql);
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

    public dispose() {
        SqlEditorPanel.currentPanel = undefined;

        // すべてのディスポーザブルを破棄
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

        // media フォルダの URI を Webview 用に変換
        const baseUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media'));
        // プレースホルダーを置換

        return html;
    }
}