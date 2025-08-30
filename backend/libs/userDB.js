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
        const user = await User.findOne({ email: email })
            .catch((err) => {
                return reject(err);
            });
        resolve(user);
    });
}

function getUsersByOrganization(organization) {
    return new Promise(async(resolve, reject) => {
        const users = await User.find({ organization_id: organization })
            .catch((err) => {
                return reject(err);
            });
        resolve(users);
    });
}

function getUserById(id) { //DO NOT USE FOR ANY ROUTES. ONLY FOR AUTHLIB
    return new Promise(async(resolve, reject) => {
        const user = await User.findOne({ _id: id })
            .catch((err) => {
                return reject(err);
            });
        resolve(user);
    });
}

// NUOVO: Ottieni profilo utente (senza password)
function getUserProfile(id) {
    return new Promise(async(resolve, reject) => {
        const user = await User.findOne({ _id: id }, getterProjection)
            .catch((err) => {
                return reject(err);
            });
        resolve(user);
    });
}

// NUOVO: Aggiorna profilo utente (nome, cognome, email)
function updateUserProfile(id, updateData) {
    return new Promise(async(resolve, reject) => {
        try {
            // Verifica se l'email è già in uso da un altro utente
            if (updateData.email) {
                const existingUser = await User.findOne({ 
                    email: updateData.email, 
                    _id: { $ne: id } 
                });
                
                if (existingUser) {
                    return reject(new Error('Email già in uso da un altro utente'));
                }
            }

            // Filtra solo i campi che possono essere aggiornati
            const allowedFields = ['name', 'surname', 'email'];
            const filteredData = {};
            
            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    filteredData[field] = updateData[field];
                }
            });

            // Aggiorna solo se ci sono campi validi
            if (Object.keys(filteredData).length === 0) {
                return reject(new Error('Nessun campo valido da aggiornare'));
            }

            const updatedUser = await User.findByIdAndUpdate(
                id, 
                filteredData, 
                { new: true, projection: getterProjection }
            );

            if (!updatedUser) {
                return reject(new Error('Utente non trovato'));
            }

            resolve(updatedUser);
        } catch (err) {
            reject(err);
        }
    });
}

// NUOVO: Cambia password utente
function updateUserPassword(id, currentPassword, newPassword) {
    return new Promise(async(resolve, reject) => {
        try {
            // Trova l'utente con la password per verificarla
            const user = await User.findById(id);
            
            if (!user) {
                return reject(new Error('Utente non trovato'));
            }

            // Verifica password corrente
            const isCurrentPasswordValid = await user.comparePassword(currentPassword);
            if (!isCurrentPasswordValid) {
                return reject(new Error('Password corrente non valida'));
            }

            // Hash della nuova password
            const saltRounds = 12;
            const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

            // Aggiorna la password
            await User.findByIdAndUpdate(id, { 
                password: hashedNewPassword 
            });

            resolve({ success: true, message: 'Password aggiornata con successo' });
        } catch (err) {
            reject(err);
        }
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
    getUsersByOrganization,
    getUserById,
    getUserProfile,        // NUOVO
    updateUserProfile,     // NUOVO
    updateUserPassword,    // NUOVO
    createUser,
};