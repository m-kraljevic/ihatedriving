const functions = require('firebase-functions');
const fetch = require('node-fetch');
const cors = require('cors');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

const express = require('express');

const simpleServer = express();

simpleServer.use(cors({origin: 'https://ihatedriving.web.app'}));

simpleServer.post('*', (request, response) => {
    let origin = request.body.origin;
    let dest = request.body.dest;
    console.log(origin);
    console.log(dest);
    fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${origin.lat},${origin.lng}&destinations=${dest.lat},${dest.lng}&key=${functions.config().maps.key}`)
        .then(res => {
            return res.json();
        })
        .then(res => {
            response.send(res);
        })
        .catch(err => {
            console.log(err);
        });
});

const distance = functions.https.onRequest(simpleServer);

module.exports = {
    distance
}