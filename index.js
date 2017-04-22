// jshint esnext:true

const axios = require('axios'),
      basicAuth = require('express-basic-auth'),
      bluebird = require('bluebird'),
      express = require('express'),
      greenlock = require('greenlock'),
      http = require('http');

const port = process.env.PORT || 5000;
const domain = process.env.DEIS_DOMAIN;
const controller = 'http://deis.' + domain + '/v2/'; // assumes some stuff

let domains = [];

let deis = axios.create({
    baseURL: controller
});

let le = greenlock.create({
    server: 'staging',
    email: 'john.doe@example.com',
    agreeTos: true,
    approveDomains: ['example.com'],
    app: app
});

let app = express();

app.use('/', le.middleware());

app.use(basicAuth({
    authorizeAsync: true,
    authorizer(user,pass,cb) {
        axios.post('auth/login/',{
            username: user,
            password: pass,
            baseURL: controller
        })
        .catch((error) => {
            cb(new Error('failed to login to Deis'),false);
        })
        .then((response) => {
            const token = response.data.token;

            deis = axios.create({
                baseURL: controller,
                headers: {
                    Authorization: 'token ' + token
                }
            });
        });
    }
}));

app.use(function (err, req, res, next) {
    res.status(500)
        .send('Updating, will be right back');
});

app.listen(port);

function getDomains(app) {
    return deis.get('apps/' + app.id + '/domains/');
}

// login to Deis
deis.post('auth/login/',{
        username: process.env.DEIS_USER,
        password: process.env.DEIS_PASS
    })
    .catch((error) => {
        console.error('failed to login to Deis');
    })
    .then((response) => {
        const token = response.data.token;

        deis = axios.create({
            baseURL: controller,
            headers: {
                Authorization: 'token ' + token
            }
        });

        // get Deis apps
        return deis.get('apps');
    })
    .catch((error) => {
        console.error('failed to list apps');
    })
    .then((response) => {
        let apps = response.data.results.filter((app) => {
            return 'web' in app.structure;
        });

        // get list of domains from each app
        return bluebird.map(apps, getDomains, {
            concurrency: 1
        });
    })
    .catch((error) => {
        console.error('failed to get domains');
    })
    .then((results) => {
        // assuming n is small enough that we can get away with nested loops for now
        results.forEach((result) => {
            result.data.results.forEach((domain) => {
                domains.push(domain);
            });
        });

        // get list of certs
        return deis.get('certs');
    })
    .catch((error) => {
        console.error('failed to get get list of certificates');
    })
    .then((results) => {
        let certs = results.data.results;

        // assuming n is small enough that we can get away with nested loops for now
        let domainsWithoutCerts = domains.filter((d) => {
            let keep = true;

            certs.forEach((cert) => {
                if (cert.domains.indexOf(d.domain) !== -1) {
                    keep = false;
                }
            });

            return keep;
        });

        console.log(lex);

        // TK domainsWithoutCerts

        return le.register({
            domains: ['TK']
        });

    });
