import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@WebSocketGateway({ namespace: '/fleet', cors: true })
export class GpsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(GpsGateway.name);

    handleConnection(client: Socket) {
        this.logger.debug(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.debug(`Client disconnected: ${client.id}`);
    }

    /**
     * Clients must emit `join` with their Firebase JWT and Organization ID
     * to subscribe to their organization's live fleet updates.
     */
    @SubscribeMessage('join')
    async handleJoin(client: Socket, payload: { token: string; orgId: string }) {
        try {
            // Very basic validation - in production the token should be fully verified via FirebaseAuthGuard
            const decodedToken = await admin.auth().verifyIdToken(payload.token);
            
            // Note: If you have custom claims for orgId, verify them here
            // if (decodedToken.organization_id !== payload.orgId) throw new Error('Org mismatch');

            const room = `org:${payload.orgId}`;
            await client.join(room);
            this.logger.log(`Client ${client.id} joined room ${room}`);
            
            return { status: 'success', room };
        } catch (error) {
            this.logger.error(`WebSocket Join Error for client ${client.id}: \${error.message}`);
            client.disconnect(true);
            return { status: 'error', message: 'Unauthorized WebSocket connection' };
        }
    }

    /**
     * Broadcasts a real-time GPS position update to all clients in the organization's room.
     */
    broadcastPosition(organizationId: string, truckId: string, lat: number, lng: number, source: string) {
        this.server.to(`org:${organizationId}`).emit('truck:position', {
            truckId,
            lat,
            lng,
            source,
            ts: Date.now(),
        });
    }
}
