const jwt = require('jsonwebtoken');

// Secret for signing the token
const ANONYMOUS_TOKEN_SECRET = "your_secret_key"; 

// Middleware to generate and validate anonymous tokens
function anonymousTokenMiddleware(req, res, next) {
    let token = req.cookies.anonymousToken;

    if (!token) {
        // No token found, generate a new one
        const payload = {
            claims: {
                role: 'anonymous_user', // Custom claims
            },
            createdAt: new Date().toISOString(),
        };

        token = jwt.sign(payload, ANONYMOUS_TOKEN_SECRET, { expiresIn: '7d' }); // Token valid for 7 days

        // Attach token to the response as a cookie
        res.cookie('anonymousToken', token, {
            httpOnly: true, // Prevent JavaScript access
            secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
            sameSite: 'strict', // Protect against CSRF
        });
    }

    // Attach token payload to the request object for further use
    try {
        const decodedToken = jwt.verify(token, ANONYMOUS_TOKEN_SECRET);
        req.anonymousUser = decodedToken.claims;
    } catch (err) {
        console.error('Invalid anonymous token:', err);
        req.anonymousUser = null;
    }

    next();
}

function enforceAnonymousToken(req, res, next) {
    const token = req.cookies.anonymousToken;
  
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: Anonymous token is missing.' });
    }
  
    try {
      // Verify the token
      const decodedToken = jwt.verify(token, ANONYMOUS_TOKEN_SECRET);
      req.anonymousUser = decodedToken.claims;
      next(); // Allow the request to proceed
    } catch (err) {
      console.error('Invalid anonymous token:', err);
      return res.status(401).json({ message: 'Unauthorized: Invalid anonymous token.' });
    }
  }


module.exports = {anonymousTokenMiddleware,enforceAnonymousToken}