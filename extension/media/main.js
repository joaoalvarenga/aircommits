// @ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();

    let currentUser = null;
    let currentSignals = [];
    let currentLocation = null;

    // DOM elements
    const loginSection = document.getElementById('login-section');
    const appSection = document.getElementById('app-section');
    const loginButton = document.getElementById('login-button');
    const userInfo = document.getElementById('user-info');
    const signalsContainer = document.getElementById('signals-container');
    const signalMessage = document.getElementById('signal-message');
    const airportFilter = document.getElementById('airport-filter');
    const flightFilter = document.getElementById('flight-filter');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const autoDetectCheckbox = document.getElementById('auto-detect');
    const manualAirportInput = document.getElementById('manual-airport');
    const manualFlightInput = document.getElementById('manual-flight');
    const saveSettingsBtn = document.getElementById('save-settings');
    const logoutBtn = document.getElementById('logout-btn');
    const currentLocationDiv = document.getElementById('current-location');
    const locationInfoDiv = document.getElementById('location-info');
    const manualSettingsDiv = document.getElementById('manual-settings');

    // Event listeners
    loginButton.addEventListener('click', () => {
        vscode.postMessage({ type: 'login' });
    });

    applyFiltersBtn.addEventListener('click', () => {
        const filters = {};
        if (airportFilter.value.trim()) filters.airport = airportFilter.value.trim();
        if (flightFilter.value.trim()) filters.flight = flightFilter.value.trim();
        
        vscode.postMessage({ 
            type: 'getSignals', 
            filters: filters 
        });
    });

    clearFiltersBtn.addEventListener('click', () => {
        airportFilter.value = '';
        flightFilter.value = '';
        vscode.postMessage({ 
            type: 'getSignals', 
            filters: {} 
        });
    });

    // Auto-detect checkbox change handler
    autoDetectCheckbox.addEventListener('change', () => {
        toggleManualSettings();
        if (autoDetectCheckbox.checked) {
            detectCurrentLocation();
        } else {
            hideCurrentLocation();
        }
    });

    saveSettingsBtn.addEventListener('click', () => {
        const settings = {
            autoDetectLocation: autoDetectCheckbox.checked,
            manualAirport: manualAirportInput.value.trim(),
            manualFlight: manualFlightInput.value.trim()
        };
        
        vscode.postMessage({ 
            type: 'saveSettings', 
            settings: settings 
        });
        
        showNotification('Settings saved!');
    });

    logoutBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'logout' });
        showLoginSection();
    });

    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    function switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Load data for the tab
        if (tabName === 'feed') {
            loadSignals();
        } else if (tabName === 'settings') {
            loadSettings();
            if (autoDetectCheckbox.checked) {
                detectCurrentLocation();
            }
        }
    }

    function showLoginSection() {
        loginSection.style.display = 'block';
        appSection.style.display = 'none';
        currentUser = null;
    }

    function showAppSection() {
        loginSection.style.display = 'none';
        appSection.style.display = 'block';
    }

    function updateUserInfo(user) {
        currentUser = user;
        userInfo.innerHTML = `
            <div class="user-profile">
                <img src="${user.avatar}" alt="${user.username}" class="user-avatar">
                <a class="username" href="https://github.com/${user.username}">@${user.username}</a>
            </div>
        `;
    }

    function renderSignals(signals) {
        currentSignals = signals;
        
        if (signals.length === 0) {
            signalsContainer.innerHTML = `
                <div class="no-signals">
                    <p>No signals found. Be the first to send one!</p>
                </div>
            `;
            return;
        }
        
        const signalsHTML = signals.map(signal => `
            <div class="signal-card">
                <div class="signal-header">
                    <img src="${signal.userAvatar}" alt="${signal.username}" class="signal-avatar">
                    <div class="signal-info">
                        <div class="signal-user"><a style="text-decoration:none" href="https://github.com/${signal.username}">@${signal.username}</a></div>
                        <div class="signal-location">
                            ${signal.airport ? `🛫 ${signal.airport}` : ''}
                            ${signal.flight ? `✈️ ${signal.flight}` : ''}
                        </div>
                    </div>
                    <div class="signal-time">${formatTime(signal.timestamp)}</div>
                </div>
                <div class="signal-content">
                    ${signal.message || 'Working from VS Code'}
                </div>
            </div>
        `).join('');
        
        signalsContainer.innerHTML = signalsHTML;
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    function loadSignals() {
        signalsContainer.innerHTML = '<div class="loading">Loading signals...</div>';
        vscode.postMessage({ 
            type: 'getSignals', 
            filters: {} 
        });
    }

    function loadSettings() {
        vscode.postMessage({ type: 'getSettings' });
    }

    function toggleManualSettings() {
        if (autoDetectCheckbox.checked) {
            manualSettingsDiv.classList.add('disabled');
            manualAirportInput.disabled = true;
            manualFlightInput.disabled = true;
        } else {
            manualSettingsDiv.classList.remove('disabled');
            manualAirportInput.disabled = false;
            manualFlightInput.disabled = false;
        }
    }

    function detectCurrentLocation() {
        currentLocationDiv.style.display = 'block';
        locationInfoDiv.innerHTML = '<div class="location-loading">Detecting location...</div>';
        
        vscode.postMessage({ type: 'getCurrentLocation' });
    }

    function hideCurrentLocation() {
        currentLocationDiv.style.display = 'none';
        currentLocation = null;
    }

    function updateLocationDisplay(location, airport) {
        currentLocation = location;
        
        let locationHTML = `
            <div class="location-details">
                <strong>📍 Current Location</strong>
            </div>
            <div class="location-coordinates">
                ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}
            </div>
        `;
        
        if (airport) {
            locationHTML += `
                <div class="location-airport">
                    🛫 Nearest Airport: ${airport.code} - ${airport.name}
                </div>
            `;
        } else {
            locationHTML += `
                <div class="location-airport">
                    No nearby airports detected
                </div>
            `;
        }
        
        locationInfoDiv.innerHTML = locationHTML;
    }

    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
            case 'loggedIn':
                showAppSection();
                if (message.user) {
                    updateUserInfo(message.user);
                } else {
                    vscode.postMessage({ type: 'getCurrentUser' });
                }
                loadSignals();
                break;
                
            case 'currentUser':
                if (message.data) {
                    updateUserInfo(message.data);
                }
                break;
                
            case 'signals':
                renderSignals(message.data);
                break;
                
            case 'signalSent':
                if (message.success) {
                    showNotification('Signal sent successfully!');
                    loadSignals();
                } else {
                    showNotification('Failed to send signal');
                }
                break;
                
            case 'airports':
                // Handle airport search results if needed
                break;
                
            case 'settings':
                if (message.data) {
                    autoDetectCheckbox.checked = message.data.autoDetectLocation !== false;
                    manualAirportInput.value = message.data.manualAirport || '';
                    manualFlightInput.value = message.data.manualFlight || '';
                    toggleManualSettings();
                }
                break;
                
            case 'currentLocation':
                if (message.data) {
                    updateLocationDisplay(message.data.location, message.data.airport);
                } else {
                    locationInfoDiv.innerHTML = '<div class="location-loading">Unable to detect location</div>';
                }
                break;
                
            case 'settingsSaved':
                showNotification('Settings saved successfully!');
                break;
                
            case 'loggedOut':
                showLoginSection();
                break;
        }
    });

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        showLoginSection();
        vscode.postMessage({ type: 'getCurrentUser' });
    });
})();