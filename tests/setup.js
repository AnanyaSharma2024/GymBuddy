// Integration tests spin up an in-memory MongoDB so they don't require a
// real MongoDB instance. Redis-dependent code paths (rate limiting) are
// not exercised by these tests directly - they're covered by manual/
// Postman testing against docker-compose, since spinning up a real Redis
// per test run adds CI complexity without much marginal safety value here.
process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret_please_ignore';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_please_ignore';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret';
process.env.GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
