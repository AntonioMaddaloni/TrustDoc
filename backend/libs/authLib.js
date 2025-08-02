require('dotenv').config();
const jwt = require('jsonwebtoken');
const UserDB = require('../libs/userDB');

//Se uso nelle rotte authLib() mi serve per vedere se ho fatto prima l'accesso
//Se uso nelle rotte authLib(numero di ruolo) mi serve per vedere se ho fatto prima l'accesso ed ho i permessi per entrare in quella rotta solo se sono di quello specifico ruolo

function checkJwt(max = 1000, min = 0) {
    return async (req, res, next) => {
        // Get the JWT token from the request headers
        let token = req.headers.authorization;
        // Check if the token exists
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        //split from BEARER
        const tokenArray = token.split(' ');
        token = tokenArray[1];
        try {
            // Verify the token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (!decoded.id) {
                return res.status(401).json({ message: 'Invalid token' });
            }
            // Use the decoded token to get user info and attach it in the request object

            req.user = await UserDB.getUserById(decoded.id);

            req.user.iat = decoded.iat;
            req.user.exp = decoded.exp;

            // Call the next middleware
            if ((req.user.role_type < min || req.user.role_type > max) && req.user.role_type !== 0) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Invalid token' });
        }
    };
}

module.exports = checkJwt;