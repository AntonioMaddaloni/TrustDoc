const express = require('express');
const router = express.Router();
const authLib = require('../libs/authLib');
const UserDB = require('../libs/userDB');

router.use(express.json());

router
    // GET - Ottieni profilo utente corrente
    .get('/profile', authLib(), async (req, res) => {
        try {
            const user = await UserDB.getUserProfile(req.user._id);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Utente non trovato'
                });
            }

            // Determina il tipo di utente basato sul role_type
            let userStatus = '';
            let userStatusDetail = '';
            
            switch (user.role_type) {
                case 0:
                    userStatus = 'Super Amministratore';
                    userStatusDetail = 'Accesso completo a tutto il sistema';
                    break;
                case 100:
                    userStatus = 'Amministratore Organizzazione';
                    userStatusDetail = user.organization_id 
                        ? `Amministri l'organizzazione ${user.organization_id}` 
                        : 'Amministratore senza organizzazione assegnata';
                    break;
                case 200:
                    userStatus = 'Utente Indipendente';
                    userStatusDetail = 'Gestisci i tuoi documenti personali';
                    break;
                default:
                    userStatus = 'Tipo utente sconosciuto';
                    userStatusDetail = 'Contatta il supporto tecnico';
            }

            return res.status(200).json({
                success: true,
                message: 'Profilo utente recuperato',
                data: {
                    id: user._id,
                    name: user.name,
                    surname: user.surname,
                    email: user.email,
                    role_type: user.role_type,
                    organization_id: user.organization_id,
                    created_at: user.created_at,
                    updated_at: user.updated_at,
                    status: {
                        type: userStatus,
                        detail: userStatusDetail,
                        isIndependent: user.role_type === 200,
                        isOrganizationAdmin: user.role_type === 100,
                        isSuperAdmin: user.role_type === 0
                    }
                }
            });

        } catch (error) {
            console.error('Errore recupero profilo:', error);
            return res.status(500).json({
                success: false,
                message: 'Errore interno del server'
            });
        }
    })

    // PUT - Aggiorna profilo utente (nome, cognome, email)
    .put('/profile', authLib(), async (req, res) => {
        try {
            const { name, surname, email } = req.body;
            
            // Validazione base
            if (!name || !surname || !email) {
                return res.status(400).json({
                    success: false,
                    message: 'Nome, cognome ed email sono obbligatori'
                });
            }

            // Validazione email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato email non valido'
                });
            }

            // Aggiorna il profilo
            const updatedUser = await UserDB.updateUserProfile(req.user._id, {
                name: name.trim(),
                surname: surname.trim(),
                email: email.trim().toLowerCase()
            });

            return res.status(200).json({
                success: true,
                message: 'Profilo aggiornato con successo',
                data: {
                    id: updatedUser._id,
                    name: updatedUser.name,
                    surname: updatedUser.surname,
                    email: updatedUser.email,
                    role_type: updatedUser.role_type,
                    organization_id: updatedUser.organization_id,
                    updated_at: updatedUser.updated_at
                }
            });

        } catch (error) {
            console.error('Errore aggiornamento profilo:', error);
            
            let errorMessage = 'Errore interno del server';
            let statusCode = 500;
            
            if (error.message === 'Email già in uso da un altro utente') {
                errorMessage = 'Questa email è già utilizzata da un altro utente';
                statusCode = 400;
            } else if (error.message === 'Utente non trovato') {
                errorMessage = 'Utente non trovato';
                statusCode = 404;
            }
            
            return res.status(statusCode).json({
                success: false,
                message: errorMessage
            });
        }
    })

    // PUT - Cambia password
    .put('/password', authLib(), async (req, res) => {
        try {
            const { currentPassword, newPassword, confirmPassword } = req.body;
            
            // Validazione input
            if (!currentPassword || !newPassword || !confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Tutti i campi password sono obbligatori'
                });
            }

            // Verifica che nuova password e conferma corrispondano
            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'La nuova password e la conferma non corrispondono'
                });
            }

            // Validazione lunghezza password
            if (newPassword.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'La nuova password deve essere di almeno 8 caratteri'
                });
            }

            // Verifica che non sia uguale alla password corrente
            if (currentPassword === newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'La nuova password deve essere diversa da quella corrente'
                });
            }

            // Cambia la password usando il metodo del userDB
            await UserDB.updateUserPassword(req.user._id, currentPassword, newPassword);

            return res.status(200).json({
                success: true,
                message: 'Password cambiata con successo'
            });

        } catch (error) {
            console.error('Errore cambio password:', error);
            
            let errorMessage = 'Errore interno del server';
            let statusCode = 500;
            
            if (error.message === 'Password corrente non valida') {
                errorMessage = 'La password corrente non è corretta';
                statusCode = 400;
            } else if (error.message === 'Utente non trovato') {
                errorMessage = 'Utente non trovato';
                statusCode = 404;
            }
            
            return res.status(statusCode).json({
                success: false,
                message: errorMessage
            });
        }
    });

module.exports = router;