require('dotenv').config();
const { resolve } = require('path');
const Document = require('../database/models/documentModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

function getDocumentById(id) { //DO NOT USE FOR ANY ROUTES. ONLY FOR AUTHLIB
    return new Promise(async(resolve, reject) => {
        const doc = await Document.findOne({ _id: id })
            .catch((err) => {
                return reject(err);
            });
        resolve(doc);
    });
}

function createDocument(info) {
    return new Promise((resolve, reject) => {
        Document.create(info).then((doc) => {
            resolve(doc);
        }).catch((err) => {
            reject(err);
        });
    });
}

module.exports = {
    getDocumentById,
    createDocument
};