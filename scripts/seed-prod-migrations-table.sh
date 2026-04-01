#!/bin/bash
# One-time: seed prod migrations table so TypeORM only runs NEW migrations on deploy.
# Prod DB already has schema; migrations table was empty so run-migrations tried to re-run all.
# Run on server: bash seed-prod-migrations-table.sh
docker exec -i jobsmato_postgres psql -U jobsmato_user -d jobsmato_db << 'SQLEOF'
INSERT INTO migrations (timestamp, name)
SELECT v.ts, v.n FROM (VALUES
(1700000000000::bigint, 'AddIndustryToJobs1700000000000'),
(1700000000001::bigint, 'ChangeExperienceLevelToExperience1700000000001'),
(1700000000002::bigint, 'UpdateIndustryEnum1700000000002'),
(1700000000003::bigint, 'AddOnboardingCompleteToUsers1700000000003'),
(1700000000004::bigint, 'AddSimilarJobsIndexes1700000000004'),
(1700000000005::bigint, 'AddAdminFieldsToUsers1700000000005'),
(1700000000006::bigint, 'AddAdminFieldsToJobs1700000000006'),
(1700000000007::bigint, 'AddAdminFieldsToCompanies1700000000007'),
(1700000000008::bigint, 'CreateAdminTables1700000000008'),
(1700000000009::bigint, 'MergeJobSeekerProfileIntoUser1700000000009'),
(1700000000010::bigint, 'AddOnboardingFieldsToUser1700000000010'),
(1700000000011::bigint, 'AddGoogleIdToUser1700000000011'),
(1700000000012::bigint, 'ConvertExperienceTypeToNumber1700000000012'),
(1700000000013::bigint, 'AddLanguagesAndIndustryToUser1700000000013'),
(1700000000014::bigint, 'UpdateLanguagesToJSONB1700000000014'),
(1700000000015::bigint, 'FixPreferredLocationsNullValues1700000000015'),
(1700000000016::bigint, 'MakeLastNameNullable1700000000016'),
(1700000000017::bigint, 'AddHRContactFieldsToJob1700000000017'),
(1700000000018::bigint, 'CreateErrorLogsTable1700000000018'),
(1700000000019::bigint, 'AddCandidateContactFieldsToJobApplication1700000000019'),
(1700000000020::bigint, 'CreateSourcingDataLake1700000000020'),
(1700000000021::bigint, 'ImproveSourcingDataLake1700000000021'),
(1700000000022::bigint, 'CreateCompanyMembersTable1700000000022'),
(1700000000023::bigint, 'AddRecruiterToUserRoleEnum1700000000023')
) AS v(ts, n)
WHERE NOT EXISTS (SELECT 1 FROM migrations m WHERE m.timestamp = v.ts);
SQLEOF
echo "Done. Migrations table seeded (duplicates skipped if any)."