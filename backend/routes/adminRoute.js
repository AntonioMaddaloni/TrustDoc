const express = require('express');
const router = express.Router();
const authLib = require('../libs/authLib');
const OrganizationDB = require('../libs/organizationDB');
const emailRegex = /^\S+@\S+\.\S+$/;
const UserDB = require("../libs/userDB");
const { sendWelcomeEmail } = require('../libs/emailLib');

function generateRandomPassword(length = 12) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  let password = '';
  
  // Assicurati di avere almeno un carattere per ogni tipo
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Completa la password con caratteri casuali
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Mescola i caratteri
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

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

router.post('/user', authLib(0), async (req, res) => {
  try {
    const { name, surname, email, role_type, password } = req.body;

    // Validazioni base
    if (!name || !surname || !email) {
      return res.status(412).json({ success: false, message: 'Campi obbligatori mancanti: name, surname, email' });
    }

    if (!emailRegex.test(email)) {
      return res.status(412).json({ success: false, message: 'Email non valida' });
    }

    const allowedRoles = [0, 100, 200];
    const roleNum = Number(role_type ?? 200);
    if (!allowedRoles.includes(roleNum)) {
      return res.status(412).json({ success: false, message: 'Ruolo non valido' });
    }

    // Controlla se l'email esiste già
    const existing = await UserDB.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email già in uso' });
    }

    // Genera password se non fornita
    const finalPassword = password || generateRandomPassword(12);
    const isGeneratedPassword = !password;

    // Costruisci payload
    const payload = {
      name: name.trim(),
      surname: surname.trim(),
      email: email.trim().toLowerCase(),
      role_type: roleNum,
      created_by: req.user._id,
      password: finalPassword,
      // altri campi se servono...
    };


    const createdUser = await UserDB.createUser(payload);

    // Risposta con info sulla password generata
    const responseData = { id: createdUser._id };
    
    if (isGeneratedPassword) {
      responseData.generated_password = finalPassword;
      responseData.password_info = 'Password generata automaticamente. Ricorda di cambiarla al primo accesso.';
    }


    if (isGeneratedPassword) {
      await sendWelcomeEmail(payload.email, payload.name, finalPassword);
    }

    return res.status(201).json({
      success: true,
      message: 'Utente creato con successo',
      data: responseData
    });
  } catch (error) {
    console.error('Errore creazione utente:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore interno durante la creazione dell\'utente'
    });
  }
});

module.exports = router;