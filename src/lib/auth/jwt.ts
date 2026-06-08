import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { ApiError } from '../api/withApi';

const JWT_SECRET = process.env.JWT_SECRET || 'meeting-intelligence-dev-secret-change-me';
const JWT_EXPIRES_IN = '24h';
const SALT_ROUNDS = 12;

export interface JwtPayload {
  userId: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    throw new ApiError('Invalid or expired token', 401);
  }
}

export function extractUser(req: NextRequest): JwtPayload {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError('Authorization header missing or invalid', 401);
  }
  const token = authHeader.slice(7);
  return verifyToken(token);
}
