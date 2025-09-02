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

function getAllOrganizations(){
    return new Promise((resolve, reject) => {
        Organization.find().then((orgs) => {
            resolve(orgs);
        }).catch((err) => {
            reject(err);
        });
    });
}

function getOrganizationById(id){
    return new Promise((resolve, reject) => {
        Organization.findOne({ _id: id }).then((orgs) => {
            resolve(orgs);
        }).catch((err) => {
            reject(err);
        });
    });
}


module.exports = {
    createOrganization,
    getAllOrganizations,
    getOrganizationById,
};