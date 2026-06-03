import { MigrationInterface, QueryRunner } from 'typeorm';

export class CandidateSignupTokens1700000000043 implements MigrationInterface {
  name = 'CandidateSignupTokens1700000000043';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE candidate_signup_tokens (
        id            SERIAL PRIMARY KEY,
        token         VARCHAR(64) NOT NULL UNIQUE,
        candidate_id  INTEGER NOT NULL REFERENCES training_candidates(id) ON DELETE CASCADE,
        enrollment_id UUID REFERENCES internship_enrollments(id) ON DELETE SET NULL,
        expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
        used_at       TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX idx_signup_tokens_token ON candidate_signup_tokens(token);
      CREATE INDEX idx_signup_tokens_candidate ON candidate_signup_tokens(candidate_id);
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS candidate_signup_tokens;`);
  }
}
