require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.SERVER_PORT || 3000;

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

app.use('/esempio', require('./routes/nomeRoute'));
//FINE DICHIARAZIONE DELLE ROTTE

//CONFIGURAZIONE FINALE DELLE API
app.listen(port, () => {
    console.log("App listening on port " + port);
})