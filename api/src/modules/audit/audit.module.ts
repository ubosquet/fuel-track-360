import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditEventEntity } from './entities/audit-event.entity';

@Module({
    imports: [TypeOrmModule.forFeature([AuditEventEntity])],
    providers: [AuditService],
    exports: [AuditService],
})
export class AuditModule { }
