import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../../../entities/system-setting.entity';

@Injectable()
export class AdminSettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private systemSettingRepository: Repository<SystemSetting>,
  ) {}

  async getSystemSettings() {
    return this.systemSettingRepository.find();
  }

  async updateSystemSettings(settings: { key: string; value: any }[]) {
    // Placeholder implementation
    return { success: true, settings: [] };
  }
}



