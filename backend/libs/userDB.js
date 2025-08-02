require('dotenv').config();
const { resolve } = require('path');
const User = require('../database/models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

getterProjection = {
    __v: false,
    password: false,
    token: false
};

function getUserByEmail(email) { //DO NOT USE FOR ANY ROUTES. ONLY FOR AUTHLIB
    return new Promise(async(resolve, reject) => {
        const user = await User.findOne({ email: email, deleted: false }).lean()
            .catch((err) => {
                return reject(err);
            });
        resolve(user);
    });
}

function createUser(info) {
    return new Promise((resolve, reject) => {
        User.create(info).then((user) => {
            resolve(user);
        }).catch((err) => {
            reject(err);
        });
    });
}

module.exports = {
    getUserByEmail,
    createUser,
    cryptPassword,
};