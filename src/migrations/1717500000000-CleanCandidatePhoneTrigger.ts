import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Safety net so dirty phone numbers never get stored again, regardless of write
 * path (recruiter API, bulk ETL, or direct SQL).
 *
 * `normalize_phone_safe` cleans the common dirt (spaces, +91 / 91 / 0 prefixes)
 * but ONLY when the remainder is a valid 10-digit Indian mobile (6-9 start). It
 * never blindly takes "last 10 digits" like the old `normalize_phone` did
 * (which turned 084569782900 into the wrong 4569782900). If it can't recover a
 * valid number it returns NULL and the trigger keeps the raw value — so no data
 * is lost and inserts never fail. Recruiter manual entry is additionally
 * validated/rejected at the DTO layer.
 *
 * The trigger is named `clean_candidate_phone` so it fires alphabetically BEFORE
 * `trigger_candidate_phone_hash`, ensuring the phone_hash is computed on the
 * cleaned number.
 */
export class CleanCandidatePhoneTrigger1717500000000 implements MigrationInterface {
  name = 'CleanCandidatePhoneTrigger1717500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.normalize_phone_safe(phone_text text)
      RETURNS varchar LANGUAGE plpgsql IMMUTABLE AS $$
      DECLARE d text;
      BEGIN
        IF phone_text IS NULL THEN RETURN NULL; END IF;
        d := regexp_replace(phone_text, '[^0-9]', '', 'g');
        IF d ~ '^[6-9][0-9]{9}$'     THEN RETURN d; END IF;
        IF d ~ '^0[6-9][0-9]{9}$'    THEN RETURN substring(d from 2); END IF;
        IF d ~ '^91[6-9][0-9]{9}$'   THEN RETURN substring(d from 3); END IF;
        IF d ~ '^0091[6-9][0-9]{9}$' THEN RETURN substring(d from 5); END IF;
        RETURN NULL;
      END; $$;
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.trg_clean_candidate_phone()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        NEW.phone := COALESCE(sourcing.normalize_phone_safe(NEW.phone), NEW.phone);
        RETURN NEW;
      END; $$;
    `);
    await queryRunner.query(`DROP TRIGGER IF EXISTS clean_candidate_phone ON sourcing.candidates`);
    await queryRunner.query(`
      CREATE TRIGGER clean_candidate_phone
        BEFORE INSERT OR UPDATE OF phone ON sourcing.candidates
        FOR EACH ROW EXECUTE FUNCTION sourcing.trg_clean_candidate_phone();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS clean_candidate_phone ON sourcing.candidates`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS sourcing.trg_clean_candidate_phone()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS sourcing.normalize_phone_safe(text)`);
  }
}
