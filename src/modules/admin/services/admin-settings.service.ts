import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting, SettingType } from '../../../entities/system-setting.entity';

@Injectable()
export class AdminSettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private systemSettingRepository: Repository<SystemSetting>,
  ) {}

  async getSystemSettings() {
    return this.systemSettingRepository.find({ order: { settingKey: 'ASC' } });
  }

  async updateSystemSettings(settings: { key: string; value: any }[]) {
    const results: SystemSetting[] = [];
    for (const { key, value } of settings) {
      if (!key || key.trim() === '') continue;
      const settingKey = key.trim();
      let setting = await this.systemSettingRepository.findOne({
        where: { settingKey },
      });
      const settingType =
        typeof value === 'number' ? SettingType.NUMBER
          : typeof value === 'boolean' ? SettingType.BOOLEAN
            : typeof value === 'object' && value !== null ? SettingType.JSON
              : SettingType.STRING;

      if (setting) {
        setting.setValue(value);
        setting.settingType = settingType;
        await this.systemSettingRepository.save(setting);
      } else {
        setting = this.systemSettingRepository.create({
          settingKey,
          settingType,
        });
        setting.setValue(value);
        await this.systemSettingRepository.save(setting);
      }
      results.push(setting);
    }
    return { success: true, settings: results };
  }
}



