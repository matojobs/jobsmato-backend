import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TrainingCandidate } from '../../entities/training-candidate.entity';
import { Job } from '../../entities/job.entity';
import { roleSimilarity, familyKeywordsFor } from './role-families';

/** Default days before an assigned-but-uncalled candidate resets to unassigned */
const DEFAULT_RESET_DAYS = 7;

@Injectable()
export class TrainingDataService {
  private readonly logger = new Logger(TrainingDataService.name);

  constructor(
    @InjectRepository(TrainingCandidate)
    private candidateRepo: Repository<TrainingCandidate>,
    @InjectRepository(Job)
    private jobRepo: Repository<Job>,
  ) {}

  async getStats() {
    const total = await this.candidateRepo.count();
    const assigned = await this.candidateRepo
      .createQueryBuilder('c')
      .innerJoin('task_assignments', 'ta', 'ta.candidateId = c.id')
      .getCount();
    const available = total - assigned;
    const byStatus = await this.candidateRepo
      .createQueryBuilder('c')
      .select('c.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.status')
      .getRawMany();
    const bySource = await this.candidateRepo
      .createQueryBuilder('c')
      .select('c.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.source')
      .orderBy('count', 'DESC')
      .getRawMany();
    const portals = bySource.map(r => ({ name: r.source || 'Unknown', count: parseInt(r.count) }));
    return { total, assigned, available, byStatus, bySource, portals };
  }

  findAll(page = 1, search?: string) {
    const take = 50;
    const qb = this.candidateRepo.createQueryBuilder('c').orderBy('c.id', 'ASC');
    if (search) qb.where('c.name ILIKE :s OR c.phone ILIKE :s', { s: `%${search}%` });
    return qb.skip((page - 1) * take).take(take).getManyAndCount();
  }

  // ── Helper ─────────────────────────────────────────────────────────────────

  /** Extract city from job.location strings like "GURUGRAM, HARYANA" or "New Delhi" */
  private extractCity(location: string): string {
    if (!location || location.toLowerCase().includes('multiple')) return '';
    return location.split(',')[0].trim()
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase()); // title case
  }

  // ── Task Wizard data (Steps 2, 3, 4) ───────────────────────────────────────

  /**
   * Step 2 — Companies: distinct companies that have ACTIVE job postings on Jobsmato.
   * Admin picks who they are sourcing for.
   */
  async getCompanies() {
    const rows = await this.jobRepo
      .createQueryBuilder('job')
      .leftJoin('job.company', 'company')
      .select('DISTINCT company.name', 'name')
      .where("job.status IN ('active', 'draft')")
      .andWhere('company.name IS NOT NULL')
      .andWhere("company.name != ''")
      .orderBy('company.name', 'ASC')
      .getRawMany();
    return rows.map(r => r.name).filter(Boolean);
  }

  /**
   * Step 3 — Roles: job titles actively required by the selected companies.
   * Admin picks which openings to source candidates for.
   */
  async getProfiles(companies?: string[]) {
    const qb = this.jobRepo
      .createQueryBuilder('job')
      .leftJoin('job.company', 'company')
      .select('DISTINCT job.title', 'title')
      .where("job.status IN ('active', 'draft')")
      .andWhere('job.title IS NOT NULL');
    if (companies?.length) qb.andWhere('company.name IN (:...companies)', { companies });
    const rows = await qb.orderBy('job.title', 'ASC').getRawMany();
    return rows.map(r => r.title).filter(Boolean);
  }

  /**
   * Step 4 — Cities: locations where the selected companies+roles have openings.
   * Count = number of training candidates available in that city (so admin knows supply).
   */
  async getCities(companies?: string[], profiles?: string[]) {
    // 1. Get the cities from active job postings for selected companies + roles
    const jqb = this.jobRepo
      .createQueryBuilder('job')
      .leftJoin('job.company', 'company')
      .select(['job.location', 'job.vacancies'])
      .where("job.status IN ('active', 'draft')")
      .andWhere('job.location IS NOT NULL');
    if (companies?.length) jqb.andWhere('company.name IN (:...companies)', { companies });
    if (profiles?.length) jqb.andWhere('job.title IN (:...profiles)', { profiles });
    const jobs = await jqb.getMany();

    // Extract unique cities from job locations + vacancies
    const citiesFromJobs = new Set<string>();
    jobs.forEach(j => {
      // From main location field
      const city = this.extractCity(j.location || '');
      if (city) citiesFromJobs.add(city);
      // From vacancies JSONB array (if set)
      if (Array.isArray(j.vacancies)) {
        j.vacancies.forEach((v: any) => {
          const vc = this.extractCity(v.city || '');
          if (vc) citiesFromJobs.add(vc);
        });
      }
    });

    if (citiesFromJobs.size === 0) {
      // Fallback: return cities from candidate pool
      const rows = await this.candidateRepo
        .createQueryBuilder('c')
        .select('c.currentCity', 'city').addSelect('COUNT(*)', 'count')
        .where('c.currentCity IS NOT NULL').andWhere("c.currentCity != ''")
        .groupBy('c.currentCity').orderBy('count', 'DESC').limit(50).getRawMany();
      return rows.map(r => ({ city: r.city, count: parseInt(r.count) }));
    }

    // 2. For each job-posting city, find ALL candidate city variants using
    //    a contains match (e.g. "Bengaluru" also returns "Bengaluru Rural",
    //    "Bengaluru Urban"). Return distinct actual values with counts so
    //    admin can select specific variants.
    const cityList = Array.from(citiesFromJobs);
    const qb = this.candidateRepo
      .createQueryBuilder('c')
      .select('c.currentCity', 'city')
      .addSelect('COUNT(*)', 'count')
      .where('c.currentCity IS NOT NULL')
      .andWhere("c.currentCity != ''");

    // Build OR conditions: LOWER(currentCity) LIKE '%bengaluru%' OR ...
    const conditions = cityList
      .map((_, i) => `LOWER(c."currentCity") LIKE :city${i}`)
      .join(' OR ');
    const params: Record<string, string> = {};
    cityList.forEach((city, i) => { params[`city${i}`] = `%${city.toLowerCase()}%`; });

    qb.andWhere(`(${conditions})`, params)
      .groupBy('c.currentCity')
      .orderBy('count', 'DESC');

    const rows = await qb.getRawMany();
    return rows.map(r => ({ city: r.city, count: parseInt(r.count) }));
  }

  /**
   * Faceted breakdown of the candidate pool matching current company/profile/city
   * selections.  Returns all distinct values with counts so admin can see
   * variants (e.g. "Bengaluru Rural", "Bengaluru Urban") and refine further.
   */
  async getFacets(companies: string[], profiles: string[], cities: string[]) {
    const base = () => {
      const qb = this.candidateRepo.createQueryBuilder('c');
      if (companies.length) qb.andWhere('c.currentCompany IN (:...companies)', { companies });
      if (profiles.length) qb.andWhere('c.currentDesignation IN (:...profiles)', { profiles });
      if (cities.length) qb.andWhere('c.currentCity IN (:...cities)', { cities });
      return qb;
    };

    const [cityRows, companyRows, profileRows, total] = await Promise.all([
      base()
        .select('c.currentCity', 'value').addSelect('COUNT(*)', 'count')
        .andWhere('c.currentCity IS NOT NULL').andWhere("c.currentCity != ''")
        .groupBy('c.currentCity').orderBy('count', 'DESC').getRawMany(),
      base()
        .select('c.currentCompany', 'value').addSelect('COUNT(*)', 'count')
        .andWhere('c.currentCompany IS NOT NULL').andWhere("c.currentCompany != ''")
        .groupBy('c.currentCompany').orderBy('count', 'DESC').getRawMany(),
      base()
        .select('c.currentDesignation', 'value').addSelect('COUNT(*)', 'count')
        .andWhere('c.currentDesignation IS NOT NULL').andWhere("c.currentDesignation != ''")
        .groupBy('c.currentDesignation').orderBy('count', 'DESC').getRawMany(),
      base().getCount(),
    ]);

    const parse = (rows: any[]) => rows.map(r => ({ value: r.value, count: parseInt(r.count) }));
    return { total, cities: parse(cityRows), companies: parse(companyRows), profiles: parse(profileRows) };
  }

  /**
   * Step 6 — Preview candidates: training candidates who are good fits for
   * the selected job requirements (role-family keyword match + city match).
   */
  async previewCandidates(
    companies: string[], profiles: string[], cities: string[],
    page = 1, limit = 20,
  ) {
    const qb = this.candidateRepo
      .createQueryBuilder('c')
      .where('c."lockedByEnrollmentId" IS NULL') // not currently locked by another intern
      .andWhere("c.status IN ('unassigned', 'talent_pool')"); // available

    // Role-family keyword matching: find candidates whose sourcedForRole matches job requirements
    if (profiles?.length) {
      const keywords = profiles.flatMap(title => familyKeywordsFor(title));
      const unique = [...new Set(keywords)];
      if (unique.length) {
        const { Brackets } = await import('typeorm');
        qb.andWhere(new Brackets(b => {
          unique.forEach((kw, i) => {
            b.orWhere(`c."sourcedForRole" ILIKE :kw${i}`, { [`kw${i}`]: `%${kw}%` });
          });
        }));
      }
    }

    // City match (case-insensitive)
    if (cities?.length) {
      const { Brackets } = await import('typeorm');
      qb.andWhere(new Brackets(b => {
        cities.forEach((city, i) => {
          b.orWhere(`LOWER(c."currentCity") = :city${i}`, { [`city${i}`]: city.toLowerCase() });
        });
      }));
    }

    qb.orderBy('c.id', 'ASC');
    const [candidates, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { candidates, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ── Scoring helpers ─────────────────────────────────────────────────────

  /** City score: same city=100, candidate city present but no match=15, missing=40 */
  private cityScore(targetCities: string[], candidateCity?: string | null): number {
    if (!candidateCity) return 40; // unknown — neutral
    const cc = candidateCity.toLowerCase().trim();
    if (targetCities.some(t => t === cc || t.includes(cc) || cc.includes(t))) return 100;
    return 15;
  }

  /** Experience score against an admin-set range. Missing=40 neutral. */
  private expScore(minExp?: number, maxExp?: number, candidateExp?: string | null): number {
    if (minExp == null && maxExp == null) return 60; // no range set → mild neutral
    const n = parseFloat((candidateExp || '').replace(/[^0-9.]/g, ''));
    if (isNaN(n)) return 40; // unknown
    const lo = minExp ?? 0;
    const hi = maxExp ?? 99;
    if (n >= lo && n <= hi) return 100;
    if (n >= lo - 1 && n <= hi + 1) return 50;
    return 0;
  }

  /** Availability/contactability from last call status. Fresh/retryable = higher. */
  private availScore(lastCallStatus?: string | null): number {
    const s = (lastCallStatus || '').toLowerCase();
    if (!s) return 100;                                   // never contacted
    if (s.includes('call back')) return 90;
    if (['rnr', 'busy', 'switched off', 'incoming off'].some(x => s.includes(x))) return 80;
    if (s.includes('out of network')) return 60;
    if (s.includes('connected')) return 50;              // already talked
    if (s.includes('invalid') || s.includes('wrong')) return 0;
    return 50;
  }

  /**
   * Suggest candidates for a job, scored 0–100.
   * Factors: role 35% + city 35% + experience 20% + availability 10%.
   * Pool: 'unassigned' (default callable) or 'talent_pool' (re-engagement).
   */
  async suggestForJob(opts: {
    jobId: number;
    minExp?: number;
    maxExp?: number;
    pool?: 'unassigned' | 'talent_pool';
    page?: number;
    limit?: number;
  }) {
    const job = await this.jobRepo.findOne({ where: { id: opts.jobId }, relations: ['company'] });
    if (!job) throw new NotFoundException('Job not found');

    const page = opts.page || 1;
    const limit = Math.min(opts.limit || 50, 200);
    const pool = opts.pool || 'unassigned';

    // Target cities: prefer per-city vacancies, else parse job.location
    let targetCities: string[] = (job.vacancies ?? [])
      .map(v => (v.city || '').toLowerCase().trim()).filter(Boolean);
    if (targetCities.length === 0 && job.location) {
      targetCities = [job.location.split(',')[0].toLowerCase().trim()];
    }

    // Pre-filter by role-family keywords (narrows 54k → relevant subset)
    const keywords = familyKeywordsFor(job.title);
    const qb = this.candidateRepo.createQueryBuilder('c')
      .where('c.status = :status', { status: pool })
      .andWhere('c."assignedToEnrollmentId" IS NULL')
      .andWhere('c."lockedByEnrollmentId" IS NULL');

    if (keywords.length) {
      qb.andWhere(new Brackets(b => {
        keywords.forEach((kw, i) => {
          b.orWhere(`c."sourcedForRole" ILIKE :kw${i}`, { [`kw${i}`]: `%${kw}%` });
        });
      }));
    }

    // Load the role-matching subset (cap to keep scoring fast)
    const matched = await qb.take(8000).getMany();

    // Score each
    const scored = matched.map(c => {
      const role = roleSimilarity(job.title, c.sourcedForRole);
      const city = this.cityScore(targetCities, c.currentCity);
      const exp  = this.expScore(opts.minExp, opts.maxExp, c.experience);
      const avail = this.availScore(c.lastCallStatus);
      const score = Math.round(role * 0.35 + city * 0.35 + exp * 0.20 + avail * 0.10);
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        city: c.currentCity,
        experience: c.experience,
        sourcedForRole: c.sourcedForRole,
        sourcedForCompany: c.sourcedForCompany,
        lastCallStatus: c.lastCallStatus,
        lastInterested: c.lastInterested,
        status: c.status,
        score,
        breakdown: { role, city, exp, avail },
      };
    }).sort((a, b) => b.score - a.score);

    const total = scored.length;
    const pageItems = scored.slice((page - 1) * limit, page * limit);

    return {
      job: {
        id: job.id, title: job.title,
        company: job.company?.name ?? null,
        location: job.location,
        targetCities,
        roleFamilyKeywords: keywords,
      },
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      candidates: pageItems,
    };
  }

  // ── Auto-reset cron ──────────────────────────────────────────────────────────

  /**
   * Every day at 2 AM: release candidates assigned >N days ago with no call logged.
   * Returns them to `unassigned` so another intern can call them.
   * N = DEFAULT_RESET_DAYS (7) unless overridden per-candidate via resetAt.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async autoResetStaleAssignments(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DEFAULT_RESET_DAYS);

    const result = await this.candidateRepo
      .createQueryBuilder()
      .update(TrainingCandidate)
      .set({
        status: 'unassigned' as any,
        assignedToEnrollmentId: () => 'NULL',
        assignedAt: () => 'NULL',
        assignedByUserId: () => 'NULL',
        resetAt: new Date(),
      })
      .where('status = :s', { s: 'assigned' })
      .andWhere('assigned_at < :cutoff', { cutoff })
      .andWhere('(last_call_date IS NULL OR last_call_date < :cutoff)', { cutoff })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Auto-reset: returned ${result.affected} stale candidates to unassigned pool`);
    }
  }

  /** Manual trigger for admin — reset stale assignments immediately */
  async manualResetStale(resetDays: number = DEFAULT_RESET_DAYS): Promise<{ reset: number }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - resetDays);

    const result = await this.candidateRepo
      .createQueryBuilder()
      .update(TrainingCandidate)
      .set({
        status: 'unassigned' as any,
        assignedToEnrollmentId: () => 'NULL',
        assignedAt: () => 'NULL',
        assignedByUserId: () => 'NULL',
        resetAt: new Date(),
      })
      .where('status = :s', { s: 'assigned' })
      .andWhere('assigned_at < :cutoff', { cutoff })
      .andWhere('(last_call_date IS NULL OR last_call_date < :cutoff)', { cutoff })
      .execute();

    return { reset: result.affected ?? 0 };
  }

  /** Manually return a single candidate to the unassigned pool */
  async releaseCandidate(candidateId: number): Promise<void> {
    await this.candidateRepo
      .createQueryBuilder()
      .update(TrainingCandidate)
      .set({
        status: 'unassigned' as any,
        assignedToEnrollmentId: () => 'NULL',
        assignedAt: () => 'NULL',
        resetAt: new Date(),
      })
      .where('id = :id', { id: candidateId })
      .execute();
  }
}
