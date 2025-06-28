const router = require('express').Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-jwt-secret';

// 1. Redirect to GitHub for authorization
router.get('/github', (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=read:user,user:email`;
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

    // 5. Fetch user email
    const emailsResponse = await axios.get('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `token ${access_token}`
      }
    });

    const primaryEmail = emailsResponse.data.find(email => email.primary)?.email || '';

    // 6. Find or create user in the database
    let user = await User.findOne({ where: { githubId: id.toString() } });

    if (!user) {
      user = await User.create({
        githubId: id.toString(),
        username: login,
        email: primaryEmail,
        avatar: avatar_url,
        accessToken: access_token
      });
    } else {
      // Update existing user
      await user.update({
        username: login,
        email: primaryEmail,
        avatar: avatar_url,
        accessToken: access_token
      });
    }

    // 7. Generate a JWT
    const token = jwt.sign({
      id: user.id,
      githubId: user.githubId,
      username: user.username
    }, JWT_SECRET, { expiresIn: '7d' });

    // 8. Send token back to the client (extension)
    res.redirect(`vscode://joaoalvarenga.aircommits/auth/callback?token=${token}`);

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'An error occurred during authentication.' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;