# ✈️ AirCommits

Connect with other developers at the same airport or on the same flight.

## 🚀 Features

- **GitHub Authentication** - Login with your GitHub account
- **Automatic Location Detection** - Automatically detect your location via IP geolocation
- **Manual Location Setting** - Set your airport or flight manually
- **Real-time Signals** - Send signals when you save files in VS Code
- **Public Feed** - View and filter signals by airport or flight
- **Supabase Backend** - Scalable Edge Functions and PostgreSQL database

## 🏗️ Architecture

AirCommits now uses **Supabase Edge Functions** for the backend, providing:

- **Scalability** - Automatic scaling with no server management
- **Performance** - Edge Functions run close to users globally
- **Security** - Row Level Security (RLS) and built-in authentication
- **Cost-effective** - Pay-per-use pricing model

## 📦 Installation

### Prerequisites

1. **VS Code** installed
2. **Supabase CLI** installed
3. **GitHub OAuth App** configured

### Quick Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/joaoalvarenga/aircommits.git
   cd aircommits
   ```

2. **Setup Supabase** (automated)
   ```bash
   ./setup-supabase.sh
   ```

3. **Configure GitHub OAuth**
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create new OAuth App
   - Set Authorization callback URL: `http://localhost:54321/functions/v1/auth-github/callback`

4. **Configure environment variables**
   ```bash
   # Edit supabase/.env with your GitHub OAuth credentials
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   JWT_SECRET=your_jwt_secret
   ```

5. **Install VS Code extension**
   ```bash
   cd extension
   npm install
   npm run compile
   ```

## 🔧 Development

### Local Development

1. **Start Supabase**
   ```bash
   supabase start
   ```

2. **Compile extension**
   ```bash
   cd extension
   npm run watch
   ```

3. **Test Edge Functions**
   ```bash
   # Test airports endpoint
   curl http://localhost:54321/functions/v1/airports
   
   # Test signals endpoint
   curl http://localhost:54321/functions/v1/signals
   ```

### Edge Functions

The backend consists of 4 Edge Functions:

- **`auth-github`** - GitHub OAuth authentication
- **`auth-me`** - Get current user information
- **`signals`** - Manage signals (create, read, filter)
- **`airports`** - Manage airports (search, nearby)

### Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    github_id TEXT UNIQUE,
    username TEXT,
    email TEXT,
    avatar TEXT,
    access_token TEXT
);

-- Airports table
CREATE TABLE airports (
    id UUID PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT,
    city TEXT,
    country TEXT,
    latitude DECIMAL,
    longitude DECIMAL
);

-- Signals table
CREATE TABLE signals (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    airport TEXT,
    flight TEXT,
    message TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    timestamp TIMESTAMP
);
```

## 🚀 Deployment

### Production Setup

1. **Create Supabase project**
   ```bash
   supabase projects create aircommits
   ```

2. **Link project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Deploy to production**
   ```bash
   # Deploy database
   supabase db push
   
   # Deploy Edge Functions
   supabase functions deploy
   
   # Set secrets
   supabase secrets set GITHUB_CLIENT_ID=your_client_id
   supabase secrets set GITHUB_CLIENT_SECRET=your_client_secret
   supabase secrets set JWT_SECRET=your_jwt_secret
   ```

4. **Update extension configuration**
   - Change `aircommits.supabaseUrl` to your production Supabase URL
   - Compile and publish the extension

## 📱 Usage

1. **Install the extension** in VS Code
2. **Login with GitHub** using the sidebar
3. **Configure location settings**:
   - Enable/disable automatic location detection
   - Set manual airport or flight
4. **Start coding** - signals are automatically sent when you save files
5. **View the feed** to see other developers nearby

## 🔧 Configuration

### Extension Settings

- `aircommits.supabaseUrl` - Supabase project URL
- `aircommits.autoDetectLocation` - Enable automatic location detection
- `aircommits.manualAirport` - Manually set airport code
- `aircommits.manualFlight` - Manually set flight number

### Environment Variables

- `GITHUB_CLIENT_ID` - GitHub OAuth App client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth App client secret
- `JWT_SECRET` - Secret key for JWT tokens
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

## 🐛 Troubleshooting

### Common Issues

1. **Edge Function not responding**
   ```bash
   supabase functions deploy auth-github
   ```

2. **CORS errors**
   - Check if CORS headers are set in Edge Functions

3. **Authentication errors**
   ```bash
   supabase secrets list
   ```

4. **Database connection issues**
   ```bash
   supabase db reset
   ```

## 📊 Migration from Express Server

This project was migrated from a local Express server to Supabase Edge Functions. See [SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md) for detailed migration guide.

### Key Changes

- **Backend**: Express.js → Supabase Edge Functions
- **Database**: SQLite → PostgreSQL
- **Authentication**: Custom JWT → Supabase Auth + GitHub OAuth
- **Deployment**: Local server → Serverless Edge Functions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `supabase start`
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) for the amazing backend platform
- [VS Code](https://code.visualstudio.com) for the extensible editor
- [GitHub](https://github.com) for OAuth authentication 

## TODO
- Add all airports
- Publish