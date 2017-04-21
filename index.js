// jshint esnext:true

const axios = require('axios');

const controller = process.env.DEIS_CONTROLLER;

let deis = axios.create({
    baseURL: controller + '/v2/'
});

deis.post('auth/login/',{
        username: process.env.DEIS_USER,
        password: process.env.DEIS_PASS
    })
    .then((response) => {
        const token = response.data.token;

        deis = axios.create({
            baseURL: controller + '/v2/',
            headers: {
                Authorization: 'token ' + token
            }
        });

        return deis.get('apps');
    })
    .catch((error) => {
        console.error('failed to login to Deis');
    })
    .then((response) => {
        console.log(response.data.results);
    })
    .catch((error) => {
        console.error('failed to list apps');
    });
