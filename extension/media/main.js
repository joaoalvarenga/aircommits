// @ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();

    const loginButton = document.getElementById('login-button');
    const loginSection = document.getElementById('login-section');
    const appSection = document.getElementById('app-section');

    if (loginButton) {
        loginButton.addEventListener('click', () => {
            vscode.postMessage({
                type: 'login'
            });
        });
    }

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data; // The JSON data our extension sent

        switch (message.type) {
            case 'loggedIn':
                if (loginSection && appSection) {
                    loginSection.style.display = 'none';
                    appSection.style.display = 'block';
                }
                break;
        }
    });

    // Tab switching logic
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;

            tabContents.forEach(content => {
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });

            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    // Initial state: check if already logged in (e.g., on extension reload)
    // In a real scenario, you'd send a message from extension to check login status
    // For now, assume not logged in until 'loggedIn' message is received.

}());