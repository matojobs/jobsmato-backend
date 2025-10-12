import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum SettingType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
}

@Entity('system_settings')
export class SystemSetting {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'site_name' })
  @Column({ length: 100, unique: true })
  @Index()
  settingKey: string;

  @ApiProperty({ example: 'Jobsmato', required: false })
  @Column({ type: 'text', nullable: true })
  settingValue: string;

  @ApiProperty({ example: SettingType.STRING, enum: SettingType })
  @Column({ length: 20, default: SettingType.STRING })
  settingType: SettingType;

  @ApiProperty({ example: 'Website name', required: false })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ example: true })
  @Column({ default: false })
  @Index()
  isPublic: boolean;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  getValue(): any {
    switch (this.settingType) {
      case SettingType.NUMBER:
        return this.settingValue ? Number(this.settingValue) : null;
      case SettingType.BOOLEAN:
        return this.settingValue === 'true';
      case SettingType.JSON:
        return this.settingValue ? JSON.parse(this.settingValue) : null;
      default:
        return this.settingValue;
    }
  }

  setValue(value: any): void {
    switch (this.settingType) {
      case SettingType.NUMBER:
        this.settingValue = value?.toString() || '';
        break;
      case SettingType.BOOLEAN:
        this.settingValue = value ? 'true' : 'false';
        break;
      case SettingType.JSON:
        this.settingValue = value ? JSON.stringify(value) : '';
        break;
      default:
        this.settingValue = value?.toString() || '';
    }
  }
}
