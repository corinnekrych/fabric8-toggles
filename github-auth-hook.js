'use strict';

const { User, AuthenticationRequired } = require('unleash-server');

const passport = require('passport');
const request = require('request');
const GitHubStrategy = require('passport-github').Strategy;

passport.use(
    new GitHubStrategy({
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: process.env.GITHUB_CALLBACK_URL,
            scope: ['read:org'],
        },

        (accessToken, refreshToken, profile, done) => {
            if (!profile.emails) {
                // user can choose to not display any email, then use a default one as unleash required it
                profile.emails.push(`${displayName}@unknown.com`);
            }
            let user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                username: profile.username,
                accessToken: accessToken
            });
            done(null, user);
        }
    )
);


function enableGitHubOAuth(app) {

    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => {
        done(null, user);
    });
    passport.deserializeUser((user, done) => {
        done(null, user);
    });

    app.get('/api/admin/login', passport.authenticate('github'));
    let context = process.env.TOGGLES_CONTEXT ? process.env.TOGGLES_CONTEXT : '';
 
    function authorize(req, res, next) {
        if (req.user && req.user['accessToken']) {
            let accessToken = req.user['accessToken'];
            let githubOrg = process.env.GITHUB_ORG ? process.env.GITHUB_ORG : 'rhdt-toggles-test';
            let githubOrgTeam = process.env.GITHUB_ORG_TEAM ? process.env.GITHUB_ORG : 'toggles-admin-test';

            // Successful authentication, now check if the authenticated user is a member of the GH org/team
            console.log(`Fetching teams on https://api.github.com/orgs/${githubOrg}/teams with access token ${accessToken}`);
            request({
                    url: `https://api.github.com/orgs/${githubOrg}/teams`,
                    headers: {
                        'User-Agent': 'toggles-admin',
                        'Authorization': 'Bearer ' + accessToken
                    }
                },
                function(error, response, body) {
                    if (error) {
                        console.error('access to GH org failed:', error);
                        res.status(403).render();
                        return;
                    } else if (response.statusCode != 200) {
                        console.error('access to GH org failed: ', response.statusCode, response.body);
                        res.status(403).send({ error: response.body }); //redirect(`${context}/error/`);//send({ error: response.body });
                        return;
                    }
                    console.log('access to GH org done. Server responded with:', response.body);
                    let jsonBody = JSON.parse(response.body)
                    jsonBody.forEach(team => {
                        if (team.name == githubOrgTeam) {
                            console.log('found team URL: ', team.members_url);
                            let teamMemberURL = team.members_url.replace("{/member}", `/${user.username}`);
                            console.log('using team URL: ', teamMemberURL);
                            request({
                                    url: teamMemberURL,
                                    headers: {
                                        'User-Agent': 'toggles-admin',
                                        'Authorization': 'Bearer ' + accessToken
                                    }
                                },
                                function(error, response, body) {
                                    if (error) {
                                        console.error('access to GH team failed:', error);
                                        res.status(403).render();
                                        return;
                                    } else if (response.statusCode != 204) {
                                        console.error('access to GH team failed: ', response.statusCode, response.body);
                                        res.status(403).render();
                                        return;
                                    }
                                    // user belongs to the org/team
                                    // redirect
                                    res.redirect(`${context}/`);
                                }
                            );
                        }
                    });
                }
            );
        } else {
            // NON authz
        } 
    };
    app.get(`/error/`, (req, res, next) => {
        res.render({err: res})
    })
    app.get( '/api/auth/callback',
        passport.authenticate('github', {
            failureRedirect: `${context}/api/admin/login`,
            failureFlash: true
        }),
        (req, res, next) => {
            //res.redirect(`${context}/`);
            next();
        }, authorize);
    
    function ensureAuthenticated(req, res, next) {
        if (req.user) {
            next();
        } else {
            // Instruct unleash-frontend to pop-up auth dialog
            return res
                .status('401')
                .json(
                    new AuthenticationRequired({
                        path: 'api/admin/login',
                        type: 'custom',
                        message: `You have to identify yourself in order to use Unleash. 
                        Click the button and follow the instructions.`,
                    })
                )
                .end();
        }
    }

    app.use('/api/admin/', ensureAuthenticated, authorize);
}

module.exports = enableGitHubOAuth;