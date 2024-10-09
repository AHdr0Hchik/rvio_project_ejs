const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { User, refresh_tokens } = require('../sequelize/models');


const createPath = (page) => path.resolve(__dirname, '../../public/templates/', `${page}.ejs`);

// Регистрация
exports.register = async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await User.create({ firstName: firstName, lastName: lastName, email: email, passwordHash: hashedPassword });
        return res.status(201).json({ message: 'User registered!' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Database error' });
    }
};

// Авторизация
exports.login_post = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email } });

        if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
        }

        const accessToken = jwt.sign({ user_id: user.id }, process.env.JWT_ACCESS_SECRET, {
        expiresIn: '15m',
        });

        const refreshTokens = jwt.sign({ user_id: user.id }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: '7d',
        });

        await refresh_tokens.create({ user_id: user.id, token: refreshTokens });

        return res.cookie('accessToken', accessToken, {maxAge: 1000*60*60, httpOnly: true}).cookie('refreshToken', refreshTokens, {maxAge: 1000*60*60*24*180, httpOnly: true}).json({ accessToken, refreshTokens });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Database error' });
    }
};

//logout
exports.logout = async (req, res) => {
    const { refreshToken } = req.cookies;
  
    if (!refreshToken) {
        return res.status(400).json({ error: 'Token is required' });
    }
  
    try {
        await refresh_tokens.destroy({ where: { token: refreshToken } });
        // Clear the cookies
        res.clearCookie('accessToken', { httpOnly: true });
        res.clearCookie('refreshToken', { httpOnly: true });

        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Database error' });
    }
};

// Обновление токена
exports.refresh = async (req, res) => {
    console.log(req.cookies);
    const token = req.body.token || req.cookies.refreshToken;
    console.log(token);
    if (!token) {
        return res.status(401).json({ error: 'Token is required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const storedToken = await refresh_tokens.findOne({
        where: { user_id: decoded.user_id, token },
        });

        if (!storedToken) {
        return res.status(403).json({ error: 'Invalid refresh token' });
        }

        const accessToken = jwt.sign({ user_id: decoded.user_id }, process.env.JWT_ACCESS_SECRET, {
        expiresIn: '15m',
        });

        res.json({ accessToken });
    } catch (error) {
        console.log(error);
        res.status(403).json({ error: 'Invalid token' });
    }
};

exports.login = async (req, res) => {
    try {
        return res.render(createPath('login'));
    } catch(e) {
        console.log(e);
    }
}