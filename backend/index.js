require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const db = require('./database/conn');  
const port = process.env.SERVER_PORT || 3000;
const frontend = process.env.FRONT_URL || 3000;

// Configurazione CORS
// Questo permette a qualsiasi origine (*) di accedere alle tue API.
// Per maggiore sicurezza in produzione, dovresti specificare solo le origini permesse.
const corsOptions = {
  origin: frontend, // Sostituisci con l'URL del tuo frontend Next.js in sviluppo
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Metodi HTTP permessi
  credentials: true, // Permette l'invio di cookie/header di autorizzazione
  optionsSuccessStatus: 204 // Alcuni browser richiedono 204 per le richieste OPTIONS
};

app.use(cors(corsOptions)); // Usa il middleware CORS con le opzion

//CONFIGURAZIONE INIZIALE DELLE API
app.use((req, res, next) => {
    console.log(req.method + " " + req.originalUrl);
    next();
});

console.log("Service URL is " + process.env.SERVICE_URL);

//INIZIO DICHIARAZIONE DELLE ROTTE
app.get('/', (req, res) => {
    res.json({ message: 'Hello World !' });
});

app.use('/token', require('./routes/tokenRoute'));
app.use('/user', require('./routes/userRoute'));
//FINE DICHIARAZIONE DELLE ROTTE

//CONFIGURAZIONE FINALE DELLE API
app.listen(port, () => {
    console.log("App listening on port " + port);
})