const functions = require('firebase-functions');

const app = require('express')();

const FbAuth = require('./utils/fbAuth');

const { getAllScreams, postOneScream, getScream } = require('./handlers/screams');
const { signup, login, addUserDetails, getAuthUserDetails, uploadImage } = require('./handlers/users');


// scream routes
app.get('/screams', getAllScreams);
app.post('/scream', FbAuth, postOneScream);
app.get('scream/:screamId', getScream);

//Signup route
app.post('/signup', signup);

// login route
app.post('/login', login);

//user details
app.post('/user', FbAuth, addUserDetails)
app.get('/user', FbAuth, getAuthUserDetails)

// upload image
app.post('/user/image', FbAuth, uploadImage)

exports.api = functions.https.onRequest(app);