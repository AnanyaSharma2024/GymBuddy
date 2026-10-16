// Firebase Admin SDK - used ONLY server-side to send push notifications.
// The service account private key must never reach the client.
const admin = require('firebase-admin');
const env = require('./env');
const logger = require('../utils/logger');

let initialized = false;

function initFirebase() {
  if (initialized) return admin;
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    logger.warn('Firebase credentials not set - push notifications disabled');
    return null;
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
  initialized = true;
  return admin;
}

module.exports = { initFirebase, admin };
