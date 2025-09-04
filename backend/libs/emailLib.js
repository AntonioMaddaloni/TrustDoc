const nodemailer = require('nodemailer');

// Configura il "trasportatore" di email.
// USA VARIABILI D'AMBIENTE per le credenziali, non scriverle direttamente nel codice!
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,   // <-- OBBLIGATORIO
  port: process.env.MAIL_PORT,   // <-- OBBLIGATORIO
  secure: true, // true per la porta 465, false per le altre (come la 587)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Invia un'email di benvenuto con la password generata.
 * @param {string} toEmail L'email del destinatario.
 * @param {string} name Il nome del nuovo utente.
 * @param {string} generatedPassword La password in chiaro da inviare.
 */
async function sendWelcomeEmail(toEmail, name, generatedPassword) {
  const mailOptions = {
    from: `"TrustDoc" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Benvenuto! Ecco le tue credenziali di accesso',
    html: `
      <h1>Ciao ${name}, benvenuto!</h1>
      <p>Un account è stato creato per te sulla nostra piattaforma.</p>
      <p>Puoi accedere usando le seguenti credenziali:</p>
      <ul>
        <li><strong>Email:</strong> ${toEmail}</li>
        <li><strong>Password temporanea:</strong> <code>${generatedPassword}</code></li>
      </ul>
      <p>Ti consigliamo di modificare la password al tuo primo accesso.</p>
      <br>
      <p>Grazie,</p>
      <p>Il Team</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email di benvenuto inviata con successo a ${toEmail}`);
  } catch (error) {
    console.error(`❌ Errore durante l'invio dell'email a ${toEmail}:`, error);
    // Potresti voler gestire l'errore in modo più robusto (es. riprovare più tardi)
  }
}

module.exports = { sendWelcomeEmail };