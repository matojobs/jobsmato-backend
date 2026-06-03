import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CandidateSignupToken } from '../../entities/candidate-signup-token.entity';
import { TrainingCandidate } from '../../entities/training-candidate.entity';
import { CandidateSignupService } from './candidate-signup.service';
import { CandidateSignupController } from './candidate-signup.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CandidateSignupToken, TrainingCandidate]),
    ConfigModule,
  ],
  controllers: [CandidateSignupController],
  providers: [CandidateSignupService],
  exports: [CandidateSignupService],
})
export class CandidateSignupModule {}
