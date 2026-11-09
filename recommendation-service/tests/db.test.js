import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import { connectDB } from '../src/config/db.js';

test('fails startup in production when MongoDB is unavailable', async (t) => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalConnect = mongoose.connect;

  t.after(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    mongoose.connect = originalConnect;
  });

  process.env.NODE_ENV = 'production';
  mongoose.connect = async () => {
    throw new Error('database unavailable');
  };

  await assert.rejects(
    connectDB(),
    /MongoDB es obligatorio en producción/
  );
});
