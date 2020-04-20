const functions = require('firebase-functions');

const { db } = require('./utils/admin');

const app = require('express')();

const FbAuth = require('./utils/fbAuth');

const { getAllScreams,
        postOneScream,
        getScream, 
        commentOnScream,
        likeScream,
        unlikeScream,
        deleteScream } = require('./handlers/screams');
const { signup,
        login, 
        addUserDetails, 
        getAuthUserDetails, 
        uploadImage } = require('./handlers/users');


// scream routes
app.get('/screams', getAllScreams);
app.post('/scream', FbAuth, postOneScream);
app.get('/scream/:screamId', getScream);
app.post('/scream/:screamId/comment', FbAuth, commentOnScream);
app.get('/scream/:screamId/like', FbAuth, likeScream);
app.get('/scream/:screamId/unlike', FbAuth, unlikeScream);
app.delete('/scream/:screamId', FbAuth, deleteScream);


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

exports.createNotificationOnLike = functions.firestore.document('likes/{id}')
    .onCreate((snapshot) => {
        db.doc(`/screams/${snapshot.data().screamId}`).get()
            .then(doc => {
                if(doc.exists) {
                    return db.doc(`/notification/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'like',
                        read: false,
                        screamId: doc.id
                    });
                }
            })
            .then(() => {
                return;
            })
            .then(err => {
                console.error(err);
                return;
            });
    });

exports.deleteNotificationOnUnlike = functions.firestore.document('likes/{id}')
    .onDelete((snapshot) => {
        db.doc(`/notification/${snapshot.id}`).delete()
            .then(() => {
                return;
            })
            .then(err => {
                console.error(err);
                return;
            });
    });

exports.createNotificationOnComment = functions.firestore.document('comments/{id}')
    .onCreate((snapshot) => {
        db.doc(`/screams/${snapshot.data().screamId}`).get()
            .then(doc => {
                if(doc.exists) {
                    return db.doc(`/notification/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'comment',    
                        read: false,
                        screamId: doc.id
                    });
                }
            })
            .then(() => {
                return;
            })
            .then(err => {
                console.error(err);
                return;
            });
    });