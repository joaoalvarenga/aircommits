// @ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();

    let currentUser = null;
    let currentSignals = [];
    let currentLocation = null;
    let searchTimeout = null;
    let currentAirports = [];

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
    const autoPublishCheckbox = document.getElementById('auto-publish');
    const mySignalsContainer = document.getElementById('my-signals-container');

    const isValidFlightCode = (flight) => {
        const regex = /^[A-Z]{2}\d{4}$/;
        return regex.test(flight);
    }

    // Autocomplete functionality
    function createAutocompleteDropdown(input, results) {
        // Remove existing dropdown
        const existingDropdown = document.querySelector('.autocomplete-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        if (!results || results.length === 0) {
            return;
        }

        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        
        results.forEach(airport => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
                <div class="airport-code">${airport.code}</div>
                <div class="airport-details">
                    <div class="airport-name">${airport.name}</div>
                    <div class="airport-location">${airport.city}, ${airport.country}</div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                input.value = airport.code;
                dropdown.remove();
            });
            
            dropdown.appendChild(item);
        });

        // Position dropdown below input
        const rect = input.getBoundingClientRect();
        dropdown.style.position = 'absolute';
        dropdown.style.top = `${rect.bottom + window.scrollY}px`;
        dropdown.style.left = `${rect.left + window.scrollX}px`;
        dropdown.style.width = `${rect.width}px`;
        dropdown.style.zIndex = '1000';

        document.body.appendChild(dropdown);

        // Close dropdown when clicking outside
        document.addEventListener('click', function closeDropdown(e) {
            const target = e.target;
            if (target && target instanceof Element && !dropdown.contains(target) && target !== input) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        });
    }

    function debounceSearch(input, callback) {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        searchTimeout = setTimeout(() => {
            const query = input.value.trim();
            if (query.length >= 2) {
                callback(query);
            } else {
                const existingDropdown = document.querySelector('.autocomplete-dropdown');
                if (existingDropdown) {
                    existingDropdown.remove();
                }
            }
        }, 300);
    }

    function searchAirports(query) {
        vscode.postMessage({ 
            type: 'searchAirports', 
            query: query 
        });
    }

    // Event listeners
    loginButton?.addEventListener('click', () => {
        vscode.postMessage({ type: 'login' });
    });

    applyFiltersBtn?.addEventListener('click', () => {
        const filters = {};
        if (airportFilter && airportFilter instanceof HTMLInputElement && airportFilter.value.trim()) {
            filters.airport = airportFilter.value.trim();
        }
        if (flightFilter && flightFilter instanceof HTMLInputElement && flightFilter.value.trim()) {
            filters.flight = flightFilter.value.trim();
        }
        
        vscode.postMessage({ 
            type: 'getSignals', 
            filters: filters 
        });
    });

    clearFiltersBtn?.addEventListener('click', () => {
        if (airportFilter && airportFilter instanceof HTMLInputElement) {
            airportFilter.value = '';
        }
        if (flightFilter && flightFilter instanceof HTMLInputElement) {
            flightFilter.value = '';
        }
        vscode.postMessage({ 
            type: 'getSignals', 
            filters: {} 
        });
    });

    // Auto-detect checkbox change handler
    autoDetectCheckbox?.addEventListener('change', () => {
        toggleManualSettings();
        if (autoDetectCheckbox instanceof HTMLInputElement && autoDetectCheckbox.checked) {
            detectCurrentLocation();
        } else {
            hideCurrentLocation();
        }
    });

    saveSettingsBtn?.addEventListener('click', () => {
        if (manualFlightInput && manualFlightInput instanceof HTMLInputElement) {
            manualFlightInput.classList.remove('invalid');
            if (manualFlightInput.value && !isValidFlightCode(manualFlightInput.value.trim())) {
                showNotification('Invalid flight code format');
                //mark the input as invalid
                manualFlightInput.classList.add('invalid');
                return;
            }
        }

        const settings = {
            autoDetectLocation: autoDetectCheckbox instanceof HTMLInputElement ? autoDetectCheckbox.checked : false,
            manualAirport: manualAirportInput instanceof HTMLInputElement ? manualAirportInput.value.trim() : '',
            manualFlight: manualFlightInput instanceof HTMLInputElement ? manualFlightInput.value.trim() : '',
            autoPublish: autoPublishCheckbox instanceof HTMLInputElement ? autoPublishCheckbox.checked : false
        };
        
        vscode.postMessage({ 
            type: 'saveSettings', 
            settings: settings 
        });
        
        showNotification('Settings saved!');
    });

    logoutBtn?.addEventListener('click', () => {
        vscode.postMessage({ type: 'logout' });
        showLoginSection();
    });

    // Autocomplete event listeners
    if (airportFilter && airportFilter instanceof HTMLInputElement) {
        airportFilter.addEventListener('input', () => {
            debounceSearch(airportFilter, searchAirports);
        });

        airportFilter.addEventListener('focus', () => {
            if (airportFilter.value.trim().length >= 2) {
                searchAirports(airportFilter.value.trim());
            }
        });
    }

    if (manualAirportInput && manualAirportInput instanceof HTMLInputElement) {
        manualAirportInput.addEventListener('input', () => {
            debounceSearch(manualAirportInput, searchAirports);
        });

        manualAirportInput.addEventListener('focus', () => {
            if (manualAirportInput.value.trim().length >= 2) {
                searchAirports(manualAirportInput.value.trim());
            }
        });
    }

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
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) activeContent.classList.add('active');
        
        // Load data for the tab
        if (tabName === 'feed') {
            loadSignals();
        } else if (tabName === 'my-signals') {
            loadMySignals();
        } else if (tabName === 'settings') {
            loadSettings();
            if (autoDetectCheckbox instanceof HTMLInputElement && autoDetectCheckbox.checked) {
                detectCurrentLocation();
            }
        }
    }

    function showLoginSection() {
        if (loginSection) loginSection.classList.remove('hide');
        if (appSection) appSection.classList.add('hide');
        currentUser = null;
    }

    function showAppSection() {
        if (loginSection) loginSection.classList.add('hide');
        if (appSection) appSection.classList.remove('hide');
    }

    function updateUserInfo(user) {
        currentUser = {
            id: user.id,
            username: user.user_metadata.user_name,
            avatar: user.user_metadata.avatar_url,
        };
        if (userInfo) {
            userInfo.innerHTML = `
                <div class="user-profile">
                    <img src="${currentUser.avatar}" alt="${currentUser.username}" class="user-avatar">
                    <a class="username" href="https://github.com/${currentUser.username}">@${currentUser.username}</a>
                </div>
            `;
        }
    }

    function renderSignals(signals) {
        currentSignals = signals;
        
        if (!signalsContainer) return;
        
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

    function renderMySignals(signals) {
        if (!mySignalsContainer) return;
        
        if (signals.length === 0) {
            mySignalsContainer.innerHTML = `
                <div class="no-signals">
                    <p>You haven't sent any signals yet. Start coding to send your first signal!</p>
                </div>
            `;
            return;
        }
        
        const signalsHTML = signals.map(signal => `
            <div class="signal-card my-signal">
                <div class="signal-header">
                    <img src="${signal.userAvatar}" alt="${signal.username}" class="signal-avatar">
                    <div class="signal-info">
                        <div class="signal-user"><a style="text-decoration:none" href="https://github.com/${signal.username}">@${signal.username}</a></div>
                        <div class="signal-location">
                            ${signal.airport ? `🛫 ${signal.airport}` : ''}
                            ${signal.flight ? `✈️ ${signal.flight}` : ''}
                        </div>
                    </div>
                    <div class="signal-actions">
                        <div class="signal-time">${formatTime(signal.timestamp)}</div>
                        <button class="delete-btn" data-signal-id="${signal.id}" title="Delete signal">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="signal-content">
                    ${signal.message || 'Working from VS Code'}
                </div>
            </div>
        `).join('');
        
        mySignalsContainer.innerHTML = signalsHTML;
        
        // Add event listeners for delete buttons
        mySignalsContainer.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const signalId = btn.getAttribute('data-signal-id');
                showDeleteConfirmation(signalId);
            });
        });
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
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
        if (signalsContainer) signalsContainer.innerHTML = '<div class="loading">Loading signals...</div>';
        vscode.postMessage({ 
            type: 'getSignals', 
            filters: {} 
        });
    }

    function loadMySignals() {
        if (mySignalsContainer) mySignalsContainer.innerHTML = '<div class="loading">Loading your signals...</div>';
        vscode.postMessage({ 
            type: 'getUserSignals'
        });
    }

    function showDeleteConfirmation(signalId) {
        const dialog = document.createElement('div');
        dialog.className = 'delete-dialog-overlay';
        dialog.innerHTML = `
            <div class="delete-dialog">
                <h3>Delete Signal</h3>
                <p>Are you sure you want to delete this signal? This action cannot be undone.</p>
                <div class="dialog-buttons">
                    <button class="cancel-btn">Cancel</button>
                    <button class="confirm-btn">Delete</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Add event listeners
        dialog.querySelector('.cancel-btn').addEventListener('click', () => {
            dialog.remove();
        });
        
        dialog.querySelector('.confirm-btn').addEventListener('click', () => {
            dialog.remove();
            deleteSignal(signalId);
        });
        
        // Close dialog when clicking outside
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.remove();
            }
        });
    }

    function deleteSignal(signalId) {
        vscode.postMessage({ 
            type: 'deleteSignal', 
            signalId: signalId 
        });
    }

    function loadSettings() {
        vscode.postMessage({ type: 'getSettings' });
    }

    function toggleManualSettings() {
        if (autoDetectCheckbox instanceof HTMLInputElement && autoDetectCheckbox.checked) {
            if (manualSettingsDiv) manualSettingsDiv.classList.add('disabled');
            if (manualAirportInput && manualAirportInput instanceof HTMLInputElement) {
                manualAirportInput.disabled = true;
            }
            if (manualFlightInput && manualFlightInput instanceof HTMLInputElement) {
                manualFlightInput.disabled = true;
            }
        } else {
            if (manualSettingsDiv) manualSettingsDiv.classList.remove('disabled');
            if (manualAirportInput && manualAirportInput instanceof HTMLInputElement) {
                manualAirportInput.disabled = false;
            }
            if (manualFlightInput && manualFlightInput instanceof HTMLInputElement) {
                manualFlightInput.disabled = false;
            }
        }
    }

    function detectCurrentLocation() {
        if (currentLocationDiv) currentLocationDiv.style.display = 'block';
        if (locationInfoDiv) locationInfoDiv.innerHTML = '<div class="location-loading">Detecting location...</div>';
        
        vscode.postMessage({ type: 'getCurrentLocation' });
    }

    function hideCurrentLocation() {
        if (currentLocationDiv) currentLocationDiv.style.display = 'none';
        currentLocation = null;
    }

    function updateLocationDisplay(location, airport) {
        currentLocation = location;
        
        if (!locationInfoDiv) return;
        
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
                if (!message.data) {
                    showLoginSection();
                    break;
                }
                if (currentUser === null) {
                    showAppSection();
                    loadSignals();
                }
                updateUserInfo(message.data);
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
                currentAirports = message.data || [];
                // This will be handled by the specific input that triggered the search
                break;
                
            case 'airportSearchResults':
                // Create autocomplete dropdown for the active input
                const activeElement = document.activeElement;
                if (activeElement && (activeElement === airportFilter || activeElement === manualAirportInput)) {
                    createAutocompleteDropdown(activeElement, message.data);
                }
                break;
                
            case 'settings':
                if (message.data) {
                    if (autoDetectCheckbox && autoDetectCheckbox instanceof HTMLInputElement) {
                        autoDetectCheckbox.checked = message.data.autoDetectLocation !== false;
                    }
                    if (manualAirportInput && manualAirportInput instanceof HTMLInputElement) {
                        manualAirportInput.value = message.data.manualAirport || '';
                    }
                    if (manualFlightInput && manualFlightInput instanceof HTMLInputElement) {
                        manualFlightInput.value = message.data.manualFlight || '';
                    }
                    if (autoPublishCheckbox && autoPublishCheckbox instanceof HTMLInputElement) {
                        autoPublishCheckbox.checked = message.data.autoPublish !== false;
                    }
                    toggleManualSettings();
                    if (autoDetectCheckbox instanceof HTMLInputElement && autoDetectCheckbox.checked) {
                        detectCurrentLocation();
                    } else {
                        hideCurrentLocation();
                    }
                }
                break;
                
            case 'currentLocation':
                if (message.data) {
                    updateLocationDisplay(message.data.location, message.data.airport);
                } else {
                    if (locationInfoDiv) locationInfoDiv.innerHTML = '<div class="location-loading">Unable to detect location</div>';
                }
                break;
                
            case 'settingsSaved':
                showNotification('Settings saved successfully!');
                break;
                
            case 'userSignals':
                renderMySignals(message.data);
                break;
                
            case 'signalDeleted':
                if (message.success) {
                    showNotification('Signal deleted successfully!');
                    loadMySignals();
                } else {
                    showNotification('Failed to delete signal');
                }
                break;
                
            case 'loggedOut':
                showLoginSection();
                break;
        }
    });

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        vscode.postMessage({ type: 'getCurrentUser' });
    });
})();