import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

let io: Server | undefined;

export function initSocket(server: HttpServer, corsOrigin: string) {
  io = new Server(server, {
    cors: {
      origin: corsOrigin === '*' ? true : corsOrigin,
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    socket.on('join:customer', (customerId: string) => socket.join(`customer:${customerId}`));
    socket.on('join:partner', (partnerId: string) => socket.join(`partner:${partnerId}`));
    socket.on('join:ops', () => socket.join('ops'));
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
