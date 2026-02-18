import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage, Bucket } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private readonly storage: Storage;
    private readonly photoBucket: Bucket;
    private readonly signatureBucket: Bucket;
    private readonly signedUrlExpiry: number;

    constructor(private readonly configService: ConfigService) {
        this.storage = new Storage({
            projectId: this.configService.get<string>('GCP_PROJECT_ID'),
        });
        this.photoBucket = this.storage.bucket(
            this.configService.get<string>('GCS_BUCKET_PHOTOS', 'ft360-photos'),
        );
        this.signatureBucket = this.storage.bucket(
            this.configService.get<string>('GCS_BUCKET_SIGNATURES', 'ft360-signatures'),
        );
        this.signedUrlExpiry = this.configService.get<number>('GCS_SIGNED_URL_EXPIRY', 86400);
    }

    /**
     * Upload a photo buffer to GCS
     * Path format: organizations/{orgId}/s2l/{s2lId}/{photoType}_{uuid}.jpg
     */
    async uploadS2LPhoto(
        organizationId: string,
        s2lId: string,
        photoType: string,
        buffer: Buffer,
        mimeType: string,
    ): Promise<{ storagePath: string; publicUrl: string; sizeBytes: number }> {
        const ext = mimeType === 'image/png' ? '.png' : '.jpg';
        const filename = `${photoType.toLowerCase()}_${uuidv4()}${ext}`;
        const storagePath = `organizations/${organizationId}/s2l/${s2lId}/${filename}`;

        const file = this.photoBucket.file(storagePath);

        await file.save(buffer, {
            metadata: {
                contentType: mimeType,
                metadata: {
                    organizationId,
                    s2lId,
                    photoType,
                    uploadedAt: new Date().toISOString(),
                },
            },
            resumable: false, // Small files — no resume needed
        });

        this.logger.log(`Photo uploaded: ${storagePath} (${buffer.length} bytes)`);

        return {
            storagePath,
            publicUrl: `gs://${this.photoBucket.name}/${storagePath}`,
            sizeBytes: buffer.length,
        };
    }

    /**
     * Upload a signature image to GCS
     */
    async uploadSignature(
        organizationId: string,
        s2lId: string,
        buffer: Buffer,
        mimeType: string,
    ): Promise<{ storagePath: string; publicUrl: string }> {
        const ext = mimeType === 'image/png' ? '.png' : '.jpg';
        const filename = `signature_${uuidv4()}${ext}`;
        const storagePath = `organizations/${organizationId}/s2l/${s2lId}/${filename}`;

        const file = this.signatureBucket.file(storagePath);

        await file.save(buffer, {
            metadata: {
                contentType: mimeType,
                metadata: { organizationId, s2lId },
            },
            resumable: false,
        });

        this.logger.log(`Signature uploaded: ${storagePath}`);

        return {
            storagePath,
            publicUrl: `gs://${this.signatureBucket.name}/${storagePath}`,
        };
    }

    /**
     * Generate a signed URL for reading a photo (time-limited access)
     */
    async getSignedUrl(storagePath: string, bucket: 'photos' | 'signatures' = 'photos'): Promise<string> {
        const targetBucket = bucket === 'photos' ? this.photoBucket : this.signatureBucket;
        const file = targetBucket.file(storagePath);

        const [url] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + this.signedUrlExpiry * 1000,
        });

        return url;
    }

    /**
     * Delete a photo from GCS
     */
    async deleteFile(storagePath: string, bucket: 'photos' | 'signatures' = 'photos'): Promise<void> {
        const targetBucket = bucket === 'photos' ? this.photoBucket : this.signatureBucket;
        await targetBucket.file(storagePath).delete({ ignoreNotFound: true });
        this.logger.log(`File deleted: ${storagePath}`);
    }
}
