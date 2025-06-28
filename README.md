# ✈️ AirCommits

Connect with other developers at airports and on flights! AirCommits is a VS Code extension that helps you find and connect with fellow developers who are working from the same airport or on the same flight.

## Features

- 🔐 **GitHub Authentication** - Login securely with your GitHub account
- 📍 **Automatic Location Detection** - Automatically detect your airport based on your location
- ✈️ **Manual Configuration** - Set your airport or flight number manually
- 📡 **Real-time Signals** - Send and receive signals when you save files
- 🔍 **Public Feed** - View signals from other developers with filtering options
- ⚙️ **Customizable Settings** - Configure your preferences for location detection

## Installation

### Prerequisites

- VS Code
- Node.js (for development)
- GitHub OAuth App (for authentication)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aircommits
   ```

2. **Setup the server**
   ```bash
   cd server
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the `server` directory:
   ```env
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   JWT_SECRET=your_jwt_secret_key_here
   PORT=3001
   ```

4. **Create GitHub OAuth App**
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create a new OAuth App
   - Set Authorization callback URL to: `http://localhost:3001/auth/github/callback`
   - Copy the Client ID and Client Secret to your `.env` file

5. **Start the server**
   ```bash
   cd server
   npm start
   ```

6. **Install the extension**
   ```bash
   cd extension
   npm install
   npm run compile
   ```

7. **Load the extension in VS Code**
   - Open VS Code
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Extensions: Install from VSIX"
   - Select the compiled extension

## Usage

### Getting Started

1. **Open the AirCommits sidebar**
   - Look for the airplane icon in the VS Code activity bar
   - Click on it to open the AirCommits panel

2. **Login with GitHub**
   - Click "Login with GitHub" in the AirCommits panel
   - Authorize the application in your browser
   - You'll be redirected back to VS Code

3. **Configure your location**
   - Go to the Settings tab
   - Choose between automatic location detection or manual configuration
   - Set your airport code (e.g., GRU, JFK) or flight number (e.g., LATAM 8001)

### Sending Signals

- **Automatic**: Every time you save a file, a signal is automatically sent to the server
- **Manual**: Use the text area in the Feed tab to send custom messages

### Viewing the Feed

- **All Signals**: View all recent signals from developers
- **Filter by Airport**: Use the airport filter to see signals from a specific airport
- **Filter by Flight**: Use the flight filter to see signals from a specific flight

### Settings

- **Auto-detect Location**: Enable/disable automatic location detection
- **Manual Airport**: Set a specific airport code
- **Manual Flight**: Set a specific flight number

## Development

### Project Structure

```
aircommits/
├── extension/          # VS Code extension
│   ├── src/           # TypeScript source files
│   ├── media/         # Webview assets (HTML, CSS, JS)
│   └── package.json   # Extension manifest
├── server/            # Backend server
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   └── index.js       # Server entry point
└── README.md
```

### Building the Extension

```bash
cd extension
npm run compile
```

### Running the Server

```bash
cd server
npm start
```

### Database

The application uses SQLite by default. The database file is created automatically at `server/aircommits.sqlite`.

## API Endpoints

### Authentication
- `GET /auth/github` - Redirect to GitHub OAuth
- `GET /auth/github/callback` - GitHub OAuth callback
- `GET /auth/me` - Get current user info

### Signals
- `GET /signals` - Get signals with optional filters
- `POST /signals` - Create a new signal
- `GET /signals/airports/nearby` - Get nearby airports

### Airports
- `GET /airports` - Get all airports
- `GET /airports/search` - Search airports
- `GET /airports/nearby` - Get nearby airports

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

**Happy coding from the skies! ✈️💻** 