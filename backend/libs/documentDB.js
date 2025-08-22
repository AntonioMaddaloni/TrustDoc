require('dotenv').config();
const { resolve } = require('path');
const Document = require('../database/models/documentModel');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

function getDocumentById(id) {
    return new Promise(async(resolve, reject) => {
        const doc = await Document.findOne({ _id: id })
            .catch((err) => {
                return reject(err);
            });
        resolve(doc);
    });
}


function getMyDocuments(myid) {
    return new Promise(async(resolve, reject) => {
        const docs = await Document.find({ owner_id: myid, deleted: false })
            .catch((err) => {
                return reject(err);
            });
        resolve(docs);
    });
}

function getDocumentsByMyOrganizationUser(users) {
    return new Promise(async (resolve, reject) => {
        try {
            // Estrai gli _id degli utenti
            const userIds = users.map(user => user._id);

            // Trova tutti i documenti con owner_id tra gli userIds e non cancellati
            const docs = await Document.find({
                deleted: false,
                owner_id: { $in: userIds }
            });

            resolve(docs);
        } catch (err) {
            reject(err);
        }
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
    getMyDocuments,
    getDocumentsByMyOrganizationUser,
    createDocument
};