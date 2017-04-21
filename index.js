// jshint esnext:true

const axios = require('axios'),
      bluebird = require('bluebird'),
      express = require('express'),
      greenlock = require('greenlock-express');

const domain = process.env.DEIS_DOMAIN;
const controller = 'http://deis.' + domain + '/v2/'; // assumes some stuff

let domains = [];

let deis = axios.create({
    baseURL: controller
});

let app = express();

app.use('/', function (req, res) {
    res.end('Updating, will be right back');
});

let lex = greenlock.create({
    server: 'staging',
    email: 'john.doe@example.com',
    agreeTos: true,
    approveDomains: ['example.com'],
    app: app
});

lex.listen(5000, 5001);

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

    });
