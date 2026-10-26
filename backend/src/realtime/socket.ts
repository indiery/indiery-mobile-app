import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { verifyAuthToken, type AuthRole } from '../middleware/auth';

let io: Server | undefined;

function socketCorsOrigin(corsOrigin: string) {
  if (corsOrigin === '*') return true;
  return corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean);
}

export function initSocket(server: HttpServer, corsOrigin: string) {
  io = new Server(server, {
    cors: {
      origin: socketCorsOrigin(corsOrigin),
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || !token) return next(new Error('Unauthorized'));
      const auth = await verifyAuthToken(token);
      socket.data.auth = auth;
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const auth = socket.data.auth as { userId: string; role: AuthRole } | undefined;
    if (!auth) return socket.disconnect(true);
    socket.join(`${auth.role}:${auth.userId}`);
    if (auth.role === 'admin') socket.join('ops');
  });

  return io;
}

export function emitOrderChanged(payload: unknown, customerId?: string, partnerId?: string) {
  if (!io) return;
  io.to('ops').emit('order:changed', payload);
  if (customerId) io.to(`customer:${customerId}`).emit('order:changed', payload);
  if (partnerId) io.to(`partner:${partnerId}`).emit('order:changed', payload);
}

export function emitPartnerQueueChanged() {
  io?.emit('partner:queue_changed');
}
