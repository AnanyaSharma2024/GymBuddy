const crypto = require('crypto');

// We hash refresh-session identifiers with SHA-256 (not bcrypt) because
// the input is already a high-entropy random UUID/token, not a
// low-entropy human password - bcrypt's slow KDF adds no security value
// here but would add latency to every refresh request.
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

module.exports = { sha256 };
