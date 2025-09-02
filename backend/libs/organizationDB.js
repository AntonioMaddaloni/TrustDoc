require('dotenv').config();
const { resolve } = require('path');
const Organization = require('../database/models/organizationModel');

function createOrganization(info){
    return new Promise((resolve, reject) => {
        Organization.create(info).then((org) => {
            resolve(org);
        }).catch((err) => {
            reject(err);
        });
    });
}


module.exports = {
    createOrganization,
};