const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const UserDB = require('../libs/userDB');
const authLib = require('../libs/authLib');

router.use(express.json());
// Create, renew, and validate a JWT token using environment variables
router
    .post('/', async(req, res) => {
        const { password, email } = req.body;
        if (!password || !email) {
            return res.status(412).json({ message: "Missing data" });
        }
        let user = await UserDB.getUserByEmail(email);

        if (!user) {
            return res.status(400).json({ message: "Wrong email or password" });
        }
        if (!(await user.comparePassword(password))) {
            return res.status(400).json({ message: "Wrong email or password" });
        }

        const token = jwt.sign({ id: user._id, role: user.role_type }, process.env.JWT_SECRET, { expiresIn: '1d' });
        const renewToken = jwt.sign({ id: user._id, role: user.role_type, renew: true }, process.env.JWT_SECRET, { expiresIn: '30d' });
        return res.status(200).json({ token, renewToken, role: user.role_type });
    })
    .post('/renew', authLib(), (req, res) => {
        jwt.verify(req.body.token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Invalid token' });
            }
        });
        const token = jwt.sign({ id: req.user._id, role: req.user.role_type }, process.env.JWT_SECRET, { expiresIn: '1h' });
        return res.status(200).json({ token });
    })
    .get('/', authLib(), (req, res) => {
        res.status(200).json({ id: req.user._id, role: req.user.role_type });
    })
    .get('/checkToken', authLib(), (req, res) => {
        res.status(200).json({ message: 'Token is valid' });
    });

module.exports = router;