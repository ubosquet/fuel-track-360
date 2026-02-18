import { SetMetadata } from '@nestjs/common';

export const REQUIRE_GEOFENCE_KEY = 'requireGeofence';
export const RequireGeofence = () => SetMetadata(REQUIRE_GEOFENCE_KEY, true);
