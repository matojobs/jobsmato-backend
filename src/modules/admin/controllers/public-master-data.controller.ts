import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminMasterDataService } from '../services/admin-master-data.service';

@ApiTags('master-data')
@Controller('master-data')
export class PublicMasterDataController {
  constructor(private readonly masterDataService: AdminMasterDataService) {}

  @Get('cities')
  @ApiOperation({ summary: 'List active cities for dropdowns' })
  async getActiveCities() {
    const result = await this.masterDataService.getCities({ isActive: true });
    return { cities: result.cities.map((city) => ({ name: city.name, state: city.state || '' })) };
  }

  @Get('negative-funnel-reasons')
  @ApiOperation({ summary: 'List active not-interested reasons for dropdowns' })
  async getActiveNegativeFunnelReasons() {
    const result = await this.masterDataService.getNegativeFunnelReasons({ isActive: true });
    return { reasons: result.reasons.map((r) => r.reason) };
  }
}
