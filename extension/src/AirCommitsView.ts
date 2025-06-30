import * as vscode from 'vscode';
import { AirCommitsService } from './AirCommitsService';

export class AirCommitsViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'aircommits.feed';

	private _view?: vscode.WebviewView;
	private _onDidReceiveMessage = new vscode.EventEmitter<any>();
	public readonly onDidReceiveMessage = this._onDidReceiveMessage.event;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _service: AirCommitsService
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
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<title>AirCommits</title>
			</head>
			<body>
				<div id="login-section" class="hide">
					<div class="header">
						<h1>✈️ AirCommits</h1>
						<p>Connect with developers at airports and on flights</p>
					</div>
					<button id="login-button" class="login-btn">Login with GitHub</button>
				</div>
				
				<div id="app-section" class="hide">
					<div class="header">
						<h2>✈️ AirCommits</h2>
						<div id="user-info" class="user-info"></div>
					</div>
					
					<div class="tabs">
						<button class="tab-button active" data-tab="feed">Feed</button>
						<button class="tab-button" data-tab="my-signals">My Signals</button>
						<button class="tab-button" data-tab="settings">Settings</button>
					</div>
					
					<div id="feed-tab" class="tab-content active">
						<div class="filters">
							<input type="text" id="airport-filter" placeholder="Filter by airport (e.g., GRU, JFK)" class="filter-input">
							<input type="text" id="flight-filter" placeholder="Filter by flight (e.g., LA8001)" class="filter-input">
							<button id="apply-filters" class="filter-btn">Apply Filters</button>
							<button id="clear-filters" class="filter-btn secondary">Clear</button>
						</div>
						
						<div id="signals-container" class="signals-container">
							<div class="loading">Loading signals...</div>
						</div>
					</div>
					
					<div id="my-signals-tab" class="tab-content">
						<div id="my-signals-container" class="signals-container">
							<div class="loading">Loading your signals...</div>
						</div>
					</div>
					
					<div id="settings-tab" class="tab-content">
						<div class="settings-section">
							<h3>Location Settings</h3>
							<div class="setting-item">
								<label>
									<input type="checkbox" id="auto-detect" checked>
									Automatically detect location
								</label>
							</div>
							
							<div id="current-location" class="current-location" style="display: none;">
								<h4>Current Location</h4>
								<div id="location-info" class="location-info">
									<div class="location-loading">Detecting location...</div>
								</div>
							</div>
							
							<div id="manual-settings" class="manual-settings">
								<div class="setting-item">
									<label>Manual Airport Code:</label>
									<input type="text" id="manual-airport" placeholder="e.g., GRU, JFK" class="setting-input">
								</div>
								<div class="setting-item">
									<label>Manual Flight Number:</label>
									<input type="text" id="manual-flight" placeholder="e.g., LA8001" class="setting-input">
								</div>
							</div>
							
							<button id="save-settings" class="save-btn">Save Settings</button>
						</div>
						
						<div class="settings-section">
							<h3>Auto-Publish Settings</h3>
							<div class="setting-item">
								<label>
									<input type="checkbox" id="auto-publish" checked>
									Automatically publish signals when files are saved
								</label>
								<p class="setting-description">When enabled, AirCommits will automatically send signals whenever you save a file in VS Code.</p>
							</div>
						</div>
						
						<div class="settings-section">
							<h3>Account</h3>
							<button id="logout-btn" class="logout-btn">Logout</button>
						</div>
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
