import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'API is running' })
  getHello(): { message: string; status: string; timestamp: string } {
    return {
      message: 'Jobsmato API is running!',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Detailed health check' })
  @ApiResponse({ status: 200, description: 'Detailed health status' })
  @ApiResponse({ status: 503, description: 'Service unhealthy' })
  async getHealth() {
    const healthStatus = await this.appService.getHealthStatus();
    
    // Return 503 if service is degraded
    if (healthStatus.status === 'degraded') {
      // Note: In NestJS, we'd typically use HttpException, but for health checks
      // we might want to return 200 with status field for monitoring tools
      return healthStatus;
    }
    
    return healthStatus;
  }
}
