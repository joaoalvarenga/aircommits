
import * as vscode from 'vscode';

export class AirCommitsViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'aircommits.feed';

	private _view?: vscode.WebviewView;
	private _onDidReceiveMessage = new vscode.EventEmitter<any>();
	public readonly onDidReceiveMessage = this._onDidReceiveMessage.event;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			this._onDidReceiveMessage.fire(data);
		});
	}

	public postMessage(message: any) {
		if (this._view) {
			this._view.webview.postMessage(message);
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<title>AirCommits</title>
			</head>
			<body>
				<div id="login-section">
					<h1>AirCommits</h1>
					<button id="login-button">Login with GitHub</button>
				</div>
				<div id="app-section" style="display:none;">
					<div class="tabs">
						<button class="tab-button active" data-tab="feed">Feed</button>
						<button class="tab-button" data-tab="settings">Settings</button>
					</div>
					<div id="feed-tab" class="tab-content active">
						<h2>Feed</h2>
						<!-- Feed content will go here -->
						<p>Latest signals will appear here.</p>
					</div>
					<div id="settings-tab" class="tab-content">
						<h2>Settings</h2>
						<!-- Settings content will go here -->
						<p>Configure your AirCommits settings.</p>
					</div>
				</div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
