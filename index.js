// jshint esnext:true

const axios = require('axios'),
      bluebird = require('bluebird');

const domain = process.env.DEIS_DOMAIN;
const controller = 'http://deis.' + domain + '/v2/'; // assumes some stuff

let deis = axios.create({
    baseURL: controller
});

function getDomains(app) {
    return deis.get('apps/' + app.id + '/domains/');
}

let domains = [];

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

        return deis.get('apps');
    })
    .catch((error) => {
        console.error('failed to list apps');
    })
    .then((response) => {
        let apps = response.data.results.filter((app) => {
            return 'web' in app.structure;
        });

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

        // TK domainsWithoutCerts

    });
