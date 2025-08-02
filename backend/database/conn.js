require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI non è stato definito in .env');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ Impossibile connettersi a MongoDB:', err.message);
    process.exit(1);   // esci con codice d’errore, così Docker/PM2/Heroku capisce che c’è stato un fallimento
  }
})();

module.exports = mongoose.connection;
