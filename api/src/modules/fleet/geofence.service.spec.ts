import { GeofenceService } from './geofence.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GeofenceEntity } from './entities/geofence.entity';
import { StationEntity } from '../organization/entities/station.entity';

const mockGeofenceRepo = () => ({
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOneOrFail: jest.fn(),
    update: jest.fn(),
});

const mockStationRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
});

describe('GeofenceService', () => {
    let service: GeofenceService;
    let stationRepo: ReturnType<typeof mockStationRepo>;

    beforeEach(async () => {
        stationRepo = mockStationRepo();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GeofenceService,
                { provide: getRepositoryToken(GeofenceEntity), useValue: mockGeofenceRepo() },
                { provide: getRepositoryToken(StationEntity), useValue: stationRepo },
            ],
        }).compile();

        service = module.get<GeofenceService>(GeofenceService);
    });

    describe('checkGeofence()', () => {
        it('returns is_within=true when inside geofence radius', async () => {
            stationRepo.findOne.mockResolvedValue({
                id: 'station-001',
                name: 'Terminal Thor',
                gps_lat: 18.5393,
                gps_lng: -72.3366,
                geofence_radius_m: 300,
            });

            // ~50m from station center
            const result = await service.checkGeofence(18.53975, -72.33615, 'station-001');

            expect(result.is_within).toBe(true);
            expect(result.distance_m).toBeLessThan(300);
        });

        it('returns is_within=false when outside geofence radius', async () => {
            stationRepo.findOne.mockResolvedValue({
                id: 'station-001',
                name: 'Terminal Thor',
                gps_lat: 18.5393,
                gps_lng: -72.3366,
                geofence_radius_m: 300,
            });

            // ~5km from station center
            const result = await service.checkGeofence(18.58, -72.30, 'station-001');

            expect(result.is_within).toBe(false);
            expect(result.distance_m).toBeGreaterThan(300);
        });

        it('returns is_within=false for unknown station', async () => {
            stationRepo.findOne.mockResolvedValue(null);

            const result = await service.checkGeofence(18.5393, -72.3366, 'unknown');
            expect(result.is_within).toBe(false);
        });
    });

    describe('findNearestStation()', () => {
        it('finds the nearest station from multiple', async () => {
            stationRepo.find.mockResolvedValue([
                { id: 'far', name: 'Far Away', gps_lat: 19.0, gps_lng: -72.0, is_active: true },
                { id: 'near', name: 'Nearby', gps_lat: 18.54, gps_lng: -72.34, is_active: true },
            ]);

            const result = await service.findNearestStation(18.5393, -72.3366, 'org-001');

            expect(result).not.toBeNull();
            expect(result!.station.id).toBe('near');
        });

        it('returns null when no stations exist', async () => {
            stationRepo.find.mockResolvedValue([]);

            const result = await service.findNearestStation(18.5393, -72.3366, 'org-001');
            expect(result).toBeNull();
        });
    });
});
