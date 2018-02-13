'use strict';

const Keycloak = require('keycloak-connect');
//const {  AuthenticationRequired } = require('../lib/server-impl.js');
//const session = require('express-session');

function enableKeycloakOauth(app) {

    //session                       
    // app.use(session({
    //     secret:'thisShouldBeLongAndSecret',                         
    //     resave: false,                         
    //     saveUninitialized: true,                         
    //     store: memoryStore                       
    // }));                                               
    //var memoryStore = new session.MemoryStore();                       
    var keycloak = new Keycloak({});                                                                       
    app.use(keycloak.middleware());
    console.log("in 1");

    app.get('/api/admin/login', keycloak.protect(), (req, res, next) => {
        console.log(":::::::::::::::::::REQ in /api/admin/login" + JSON.stringify(req))
    });


    app.use('/api/admin/', keycloak.protect(), (req, res, next) => {
        // if (req.user) {
            console.log(":::::::::::::::::::REQ" + JSON.stringify(req))
            next();
        // } else {
        //     // Instruct unleash-frontend to pop-up auth dialog
        //     return res
        //         .status('401')
        //         .json(
        //             new AuthenticationRequired({
        //                 path: '/api/admin/login',
        //                 type: 'custom',
        //                 message: `You have to identify yourself in order to use Unleash. 
        //                 Click the button and follow the instructions.`,
        //             })
        //         )
        //         .end();
        // }
    });
}

module.exports = enableKeycloakOauth;