const express = require('express');
const router = express.Router();
const authLib = require('../libs/authLib');
const UserDB = require('../libs/userDB');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const userRegistrationValidator = require('../validators/userRegistrationValidator');
const serviceUrl = process.env.SERVICE_URL;

router.use(express.json());

router
    .post('/registration',  userRegistrationValidator, async (req,res) => {
        try{
            let user = await UserDB.createUser(req.body); //si cripta la password da solo grazie all'observer pattern
            return res.status(200).json({message: "User Created Successfully!"});
        }catch(err)
        {
            console.log(err);
            return res.status(500).json({message: err});
        }
    });


module.exports = router;