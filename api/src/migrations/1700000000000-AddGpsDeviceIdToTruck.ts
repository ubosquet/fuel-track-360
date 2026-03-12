import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddGpsDeviceIdToTruck1700000000000 implements MigrationInterface {
    name = 'AddGpsDeviceIdToTruck1700000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("truck", new TableColumn({
            name: "gps_device_id",
            type: "varchar",
            isNullable: true
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("truck", "gps_device_id");
    }
}
