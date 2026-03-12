import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GpsLogEntity } from '../fleet/entities/gps-log.entity';
import { TruckEntity } from '../fleet/entities/truck.entity';
import { AIService } from './ai.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AICronService {
    private readonly logger = new Logger(AICronService.name);

    constructor(
        private readonly aiService: AIService,
        private readonly auditService: AuditService,
        @InjectRepository(TruckEntity)
        private readonly truckRepository: Repository<TruckEntity>,
        @InjectRepository(GpsLogEntity)
        private readonly gpsLogRepository: Repository<GpsLogEntity>,
    ) {}

    /**
     * Run every 15 minutes to analyze the last 15 minutes of GPS logs for anomalies.
     * Use CronExpression.EVERY_5_MINUTES in default NextJS local environments for demo testing.
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async analyzeGpsAnomalies() {
        this.logger.log('Starting automated AI analysis of recent GPS logs...');
        
        // 1. Get all active trucks
        const activeTrucks = await this.truckRepository.find({
            where: { is_active: true }
        });

        // 2. Fetch recent GPS data
        const fifteenMinutesAgo = new Date();
        fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

        for (const truck of activeTrucks) {
            const recentLogs = await this.gpsLogRepository
                .createQueryBuilder('log')
                .where('log.truck_id = :truckId', { truckId: truck.id })
                .andWhere('log.recorded_at >= :since', { since: fifteenMinutesAgo })
                .orderBy('log.recorded_at', 'ASC')
                .getMany();

            if (recentLogs.length === 0) continue;

            // 3. Simple heuristic: If we have points but they are all stationary AND truck status is EN_ROUTE
            if (truck.status === 'EN_ROUTE') {
                const maxSpeed = Math.max(...recentLogs.map(l => Number(l.speed_kmh || 0)));
                
                if (maxSpeed < 5) {
                    this.logger.warn(`Potential anomaly detected: Truck ${truck.plate_number} has status EN_ROUTE but Max speed is ${maxSpeed}km/h in last 15 mins.`);
                    
                    // Use Gemini for deeper analysis (passing recent logs as context)
                    const prompt = `Analyze this GPS telemetry for truck ${truck.plate_number}. Status is EN_ROUTE but max speed is ${maxSpeed}km/h. Is this an anomaly? Telemetry: ` + JSON.stringify(recentLogs.map(l => ({ lat: l.lat, lng: l.lng, speed: l.speed_kmh, time: l.recorded_at })));
                    
                    try {
                        const analysis = await this.aiService.analyzeRisk(prompt);
                        
                        // If Gemini flags it as high risk, log an Audit event
                        if (analysis.risk_score > 70) {
                            // Using the correct `log` method from AuditService
                            await this.auditService.log({
                                organization_id: truck.organization_id,
                                event_type: 'AI_ANOMALY_DETECTED',
                                entity_type: 'TRUCK',
                                entity_id: truck.id,
                                actor_id: 'SYSTEM_CRON',
                                actor_role: 'SYSTEM',
                                payload: {
                                    severity: 'HIGH',
                                    description: `AI Anomaly: ${analysis.explanation}`,
                                    ai_recommendation: analysis.recommendation,
                                    risk_score: analysis.risk_score
                                }
                            });
                        }
                    } catch (e) {
                        this.logger.error(`AI Analysis failed for truck ${truck.id}: `, e);
                    }
                }
            }
        }
        
        this.logger.log('Automated AI analysis complete.');
    }
}
