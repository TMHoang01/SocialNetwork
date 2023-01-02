
var admin = require("firebase-admin");

var serviceAccount = require("../config/firebase-key.json");

const BUCKET = 'gs://savvy-celerity-368016.appspot.com';

if (storage.apps.length === 0) {
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: BUCKET,
});
}

const bucket = admin.storage().bucket();

const uploadImage = async (req, res, next) => {
    if (!req.file) { return next(); }
    const image = req.file;
    const newNameFile = new Date().toISOString()+ '.' + image.originalname.split('.').pop();

    const file = bucket.file(newNameFile);

    const stream = file.createWriteStream({
        metadata: {
            contentType: image.mimetype,
        },
    });
    stream.on('error', (err) => {
        console.log(err);
    });
    stream.on('finish', async () => {
        await file.makePublic();
        image.url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURI(file.name)}?alt=media`;
        next();

    });

    stream.end(image.buffer);
}

module.exports = uploadImageFirebase;
