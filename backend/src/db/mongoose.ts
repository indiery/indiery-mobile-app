import mongoose from 'mongoose';
import { env } from '../config/env';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { WalletLedger } from '../models/WalletLedger';
import { AccountDeletionRequest } from '../models/AccountDeletionRequest';

export async function connectMongo() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.MONGODB_URI, {
      autoIndex: env.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 6000
    });
  } catch (error) {
    const localMessage = env.MONGODB_URI.includes('127.0.0.1') || env.MONGODB_URI.includes('localhost')
      ? [
          'MongoDB is not running locally.',
          'Start MongoDB on 127.0.0.1:27017, or set MONGODB_URI in backend/.env to your MongoDB Atlas URI.',
          'Local options: install MongoDB Community Server, or run docker compose up -d mongo if Docker is installed.'
        ].join(' ')
      : 'Could not connect to the configured MongoDB URI. Check backend/.env and network access.';

    throw new Error(`${localMessage}\nOriginal error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function ensureDatabaseIndexes() {
  await Promise.all([
    User.createIndexes(),
    Vehicle.createIndexes(),
    Order.createIndexes(),
    WalletLedger.createIndexes(),
    AccountDeletionRequest.createIndexes()
  ]);
}
