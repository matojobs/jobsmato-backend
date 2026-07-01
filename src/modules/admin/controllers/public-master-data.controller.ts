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
}
