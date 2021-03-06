const { db, admin } = require('../utils/admin');

const firebase = require('firebase');

const firebaseConfig = require('../key/firebaseconfig');

firebase.initializeApp(firebaseConfig.firebaseConfig);


const isEmpty = (string) => {
    if(string.trim() === '') return true;
    else return false;
}

const isEmail = (email) => {
    const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(email.match(emailRegEx)) return true;
    else return false;
}

const reduceUserDetails = (data) => {
    let userDetails = {};

    if(!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
    if(!isEmpty(data.website.trim())) {
        if(data.website.trim().substring(0, 4) !== 'http') {
            userDetails.website = `http://${data.website.trim()}`;
        } else userDetails.website = data.website;
    }
    if(!isEmpty(data.location.trim())) userDetails.location = data.location;

    return userDetails;
}

exports.signup = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };

    let errors = {};

    if(isEmpty(newUser.email)) {
        errors.email = 'Must not be empty';
    } else if(!isEmail(newUser.email)) {
        errors.email = 'Must be a valid email';
    }

    if(isEmpty(newUser.password)) errors.password = 'Must not be empty';
    if(newUser.password !== newUser.confirmPassword) errors.password = 'Passwords must match';
    if(isEmpty(newUser.handle)) errors.handle = 'Must not be empty';

    if(Object.keys(errors).length > 0) return res.status(400).json(errors);

    const noimg = 'no-img.png';

    let idToken, userId;
    db.doc(`/users/${newUser.handle}`).get()
        .then(doc => {
            if(doc.exists) {
                return res.status(400)
                    .json({ handle: 'This user handle is already taken' });
            } else {
                return firebase.auth()
                    .createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then(data => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then(token => {
            idToken = token;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/vo/b/${
                    firebaseConfig.firebaseConfig.storageBucket}/o/${noimg
                    }?alt=media`,
                userId
            };
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            return res.status(201).json({ token: idToken });
        })
        .catch(err => {
            console.error(err);
            if(err.code === "auth/email-already-in-use") {
                return res.status(400)
                    .json({ email: 'Email is already in use' });
            } else {
                return res.status(500).json({ error: err.code});
            }
        });
};

exports.login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    let errors = {};

    if(isEmpty(user.email)) errors.email = 'Must not be empty';
    if(isEmpty(user.password)) errors.password = 'Must not be empty';

    if(Object.keys(errors).length > 0) return res.status(400).json(errors);

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        })
        .then(token => {
            return res.json({ token });
        })
        .catch(err => {
            console.error(err);
            if(err.code === "auth/wrong-password") {
                return res.status(403)
                    .json({ general: 'Wrong credentials, please try again'})
            } else {
                return res.status(500).json({error: err.code});
            }
        })
};

exports.addUserDetails = (req, res) => {
 let userDetails = reduceUserDetails(req.body);

 db.doc(`/users/${req.user.handle}`).update(userDetails)
    .then(() => {
        return res.json({ message: 'Details added successfully' });
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
    });
};

exports.getAuthUserDetails = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`).get()
        .then(doc => {
            if(doc.exists) {
                userData.userCredentials = doc.data();
                return db.collection('likes')
                    .where('userhandle', '==', req.user.handle).get();
            }
        })
        .then(data => {
            userData.likes = [];
            data.forEach(doc => {
                userData.likes.push(doc.data());
            });
            return res.json(userData);
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code });
        });
};

exports.uploadImage = (req, res) => {
    const Busboy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new Busboy({ headers: req.headers });

    let imageFilename;
    let imageToBeUploaded = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if(mimetype !== 'image/png' && mimetype !== 'image/jpeg') {
            return res.status(400).json({ error: 'wrong file type submitted'})
        }

        const imageExtention = filename.split('.')[filename.split('.').length - 1];
        imageFilename = `${Math.round(Math.random()*10000000000)}.${imageExtention}`;
        const filepath = path.join(os.tmpdir(), imageFilename);
        imageToBeUploaded = { filepath, mimetype };
        file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on('finish', () => {
        admin.storage().bucket().upload(imageToBeUploaded.filepath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimetype
                }
            }
        })
        .then(() => {
            const imageUrl = `https://firebasestorage.googleapis.com/vo/b/${
                firebaseConfig.firebaseConfig.storageBucket}/o/${imageFilename
                }?alt=media`;
            return db.doc(`users/${req.user.handle}`).update({ imageUrl });
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code });
        });
    });
    busboy.end(req.rawBody);
};