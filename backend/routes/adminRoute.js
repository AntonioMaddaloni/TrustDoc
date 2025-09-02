const express = require('express');
const router = express.Router();
const authLib = require('../libs/authLib');
const OrganizationDB = require('../libs/organizationDB');

router.use(express.json());
//QUI AVRANNO TUTTI AD AUTHLIB A 0 POICHE SOLO L ADMIN PUO ACCEDERVI
router
    .post('/organization', authLib(0), async (req, res) => {
        try {
            if(!req.body.name)
                return res.status(412).json({ success: false, message: 'Nome non disponibile'});

            req.body.created_by = req.user._id;

            let org = await OrganizationDB.createOrganization(req.body);

            return res.status(500).json({
                success: true,
                message: "Organizzazione Creata Con Successo!"
            });

        } catch (error) {
            console.error('Errore creazione organizzazione:', error);
            return res.status(500).json({
                success: false,
                message: errorMessage
            });
        }
    });

module.exports = router;