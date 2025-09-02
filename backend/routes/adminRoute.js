const express = require('express');
const router = express.Router();
const authLib = require('../libs/authLib');
const OrganizationDB = require('../libs/organizationDB');
const UserDB = require('../libs/userDB');

router.use(express.json());
//QUI AVRANNO TUTTI AD AUTHLIB A 0 POICHE SOLO L ADMIN PUO ACCEDERVI
router
    .get('/users', authLib(0), async (req, res) => {
        try {
            let users = await UserDB.getAllUsersNotAdmin();
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
    })
    .get('/organizations', authLib(0), async (req, res) => {
        try {
            let orgs = await OrganizationDB.getAllOrganizations();
            return res.status(200).json({
                success: true,
                message: "Organizzazioni Ottenuti Con Successo!",
                data: orgs
            });
        } catch (error) {
            console.error('Errore ottenimento organizzazioni:', error);
            return res.status(500).json({
                success: false,
                message: errorMessage
            });
        }
    })
    .put('/user-assignments', authLib(0), async (req, res) => {
        try {
           const { assignments } = req.body;

           for (const [key, value] of Object.entries(assignments)) {
                let user = await UserDB.getUserById(key);
                if (!user) continue;
                if(value)
                {
                    let org = await OrganizationDB.getOrganizationById(value);
                    if(user && org)
                    {
                        user.organization_id = org._id;
                        user.save();
                    }
                }
                else
                {
                    user.organization_id = null;
                    user.save();
                }

           }
           return res.status(200).json({
                success: true,
                message: "Assegnazione Avvenuta Con Successo!",
            });
        } catch (error) {
            console.error('Errore modifica assegnazioni:', error);
            return res.status(500).json({
                success: false,
                message: errorMessage
            });
        }
    })
    .post('/organization', authLib(0), async (req, res) => {
        try {
            if(!req.body.name)
                return res.status(412).json({ success: false, message: 'Nome non disponibile'});

            req.body.created_by = req.user._id;

            let org = await OrganizationDB.createOrganization(req.body);

            return res.status(200).json({
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