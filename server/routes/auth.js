const router = require('express').Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-jwt-secret';

// 1. Redirect to GitHub for authorization
router.get('/github', (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=read:user`;
  res.redirect(url);
});

// 2. GitHub callback
router.get('/github/callback', async (req, res) => {
  const { code } = req.query;

  try {
    // 3. Exchange code for access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }, {
      headers: {
        'Accept': 'application/json'
      }
    });

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      return res.status(400).json({ error: 'Failed to retrieve access token.' });
    }

    // 4. Fetch user information
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${access_token}`
      }
    });

    const { id, login, avatar_url } = userResponse.data;

    // 5. Find or create user in the database
    let user = await User.findOne({ where: { githubId: id.toString() } });

    if (!user) {
      user = await User.create({
        githubId: id.toString(),
        username: login,
        avatarUrl: avatar_url,
      });
    }

    // 6. Generate a JWT
    const token = jwt.sign({
      id: user.id,
      githubId: user.githubId,
      username: user.username
    }, JWT_SECRET, { expiresIn: '1h' });

    // 7. Send token back to the client (extension)
    // In a real app, you'd redirect to a frontend page that can store the token.
    // For the VSCode extension, we'll need a way to pass this token back.
    // A simple approach for now is to show it on a page or pass it via a custom protocol.
    res.redirect(`vscode://joaoalvarenga.aircommits/auth/callback?token=${token}`);

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'An error occurred during authentication.' });
  }
});

module.exports = router;