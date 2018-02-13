'use strict';

const unleash = require('unleash-server');
const keycloakOAuth = require('./keycloak-auth-hook');
console.log("Inside UNLEASH");
unleash.start({
    adminAuthentication: 'custom',
    preRouterHook: keycloakOAuth
}).then(server => {
    console.log(
        `CORINNE::Unleash started on http://localhost:${server.app.get('port')}`
    );
});