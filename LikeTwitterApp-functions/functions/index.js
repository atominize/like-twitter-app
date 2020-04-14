const functions = require('firebase-functions');

const app = require('express')();

const FbAuth = require('./utils/fbAuth');

const { getAllScreams, postOneScream } = require('./handlers/screams');
const { signup, login, addUserDetails, uploadImage } = require('./handlers/users');


// scream routes
app.get('/screams', getAllScreams);
app.post('/scream', FbAuth, postOneScream);

//Signup route
app.post('/signup', signup);

// login route
app.post('/login', login);

//user details
app.post('/user', FbAuth, addUserDetails)

// upload image
app.post('/user/image', FbAuth, uploadImage)

exports.api = functions.https.onRequest(app);