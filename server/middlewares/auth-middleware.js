const jwt = require('jsonwebtoken'); // Ensure you have jwt imported
const { refresh_tokens } = require('../sequelize/models');

module.exports = async function(req, res, next) {
    // Destructure tokens from cookies
    const {accessToken, refreshToken} = req.cookies;

    try {
        // If no access token but has refresh token
        if (!accessToken && refreshToken) {
            try {
                // Verify the refresh token
                const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

                // Find the stored token in the database
                const storedToken = await refresh_tokens.findOne({
                    where: { user_id: decoded.user_id, token: refreshToken },
                });

                // If no stored token, respond with 403 status
                if (!storedToken) {
                    return res.status(403).json({ error: 'Invalid refresh token' });
                }

                // Generate a new access token
                const newAccessToken = jwt.sign({ user_id: decoded.user_id }, process.env.JWT_ACCESS_SECRET, {
                    expiresIn: '15m',
                });

                // Set the new access token in the cookies
                res.cookie('accessToken', newAccessToken, { maxAge: 1000 * 60 * 60, httpOnly: true });
            } catch (error) {
                console.log(error);
                // If there's an error verifying the refresh token, respond with 403 status
                return res.status(403).json({ error: 'Invalid token' });
            }
        }

        // If no refresh token, redirect to login
        if (!refreshToken && accessToken) {
            next;
        }

        if(!refreshToken && !accessToken) {
            const redirectUrl = `/auth/login`;
            return res.redirect(redirectUrl);
        }

        // Move to the next middleware or route handler
        next();
    } catch (e) {
        console.log(e);
    }
};