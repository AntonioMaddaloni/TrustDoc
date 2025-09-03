const express = require('express');
const router = express.Router();
const authLib = require('../libs/authLib');
const OrganizationDB = require('../libs/organizationDB');
const UserDB = require("../libs/userDB");

router.use(express.json());
//QUI AVRANNO TUTTI AD AUTHLIB A 100 POICHE SOLO L ADMIN DELLA ORG. PUO ACCEDERVI
router
    .get('/users', authLib(100), async (req, res) => {
        try {
            if(!req.user.organization_id)
            {
                return res.status(412).json({
                    success: false,
                    message: "Non hai collegato nessuna organizzazione"
                });
            }
            let users = await UserDB.getUsersByOrganization(req.user.organization_id);
            return res.status(200).json({
                success: true,
                message: "Utenti Ottenuti Con Successo!",
                data: users
            });
        } catch (error) {
            console.error('Errore ottenimento utenti:', error);
            return res.status(500).json({
                success: false,
                message: errorMessage
            });
        }
    });

module.exports = router;