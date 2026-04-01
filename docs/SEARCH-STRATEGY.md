# Search implementation and options

## What we use today

Search is implemented with **`ILIKE '%term%'`** (case-insensitive “contains”) on:

- **Recruiter applications**: candidate name, phone, email, portal, job role name, company name  
- **Recruiter candidates**: name, phone, email  
- **Admin applications**: applicant first name, last name, email, phone  

**Pros:** Simple, no extra extensions, works for substring and partial matches (e.g. phone digits, name parts).  
**Cons:** With a leading `%`, standard B-tree indexes cannot be used, so every search scans the rows that pass the rest of the filters.

---

## When this is “good enough”

- **Small/medium data** (e.g. &lt; 50k–100k rows in the main tables): performance is usually fine.
- You need **substring/partial match** (e.g. “123” in a phone number, “John” in “John Doe”).
- You want to **avoid extra infrastructure** (no Elasticsearch, etc.).

So the current approach is a reasonable and common choice for many apps.

---

## Better options (by use case)

### 1. **Faster `ILIKE '%term%'` (recommended upgrade)**

**PostgreSQL trigram extension (`pg_trgm`)** lets you create GIN indexes that **do** support `column ILIKE '%term%'`.

- **Same API:** keep using `ILIKE '%term%'` in your code.
- **Effect:** Searches that use those columns can use the index instead of full scans.
- **Cost:** Slightly more disk and a bit more work on writes; no app logic change.

We provide an optional migration that enables `pg_trgm` and adds GIN trigram indexes on the columns we search (see migration `1700000000032-AddSearchTrigramIndexes.ts`). Run it when you want better search performance without changing how you call the API. For very large tables in production, consider building indexes with `CREATE INDEX CONCURRENTLY` outside the migration to avoid long write locks.

### 2. **Word-based search and ranking**

**PostgreSQL full-text search (FTS)** with `to_tsvector` / `to_tsquery` and `@@`:

- **Best for:** “Search by words” (e.g. names, job titles, company names), with optional **ranking** (e.g. `ts_rank`).
- **Gets:** Stemming, stop words, and GIN indexes on `tsvector` for speed.
- **Not ideal for:** Exact substring of digits (e.g. phone fragments) or short tokens; for those, trigram is better.

So: use **trigram for “contains” on phone/email/short strings**, and **FTS for “word search” and relevance** on name/title/company if you need it later.

### 3. **Fuzzy / typo-tolerant search**

- **Trigram similarity** (`pg_trgm`): `similarity(name, 'term')` or `%` operator; good for typos and “did you mean?”.
- **Dedicated engines** (Elasticsearch, Typesense, Meilisearch): best when you need typo tolerance, facets, and complex relevance at large scale. Only worth the extra stack if you have that scale or product need.

---

## Summary

| Approach              | Use when                                      | Change required              |
|-----------------------|-----------------------------------------------|------------------------------|
| Current (`ILIKE`)     | Small/medium data, simple “contains” search   | None                         |
| **Trigram indexes**  | Same semantics, more data, want faster search | Run migration; no code change |
| Full-text search      | Word-based search + ranking                   | New queries / columns        |
| External search engine| Large scale, fuzzy + facets + relevance       | New service + integration   |

**Practical recommendation:** Keep the current search implementation; when you need better performance, run the trigram migration so the same `ILIKE` queries use indexes. Add FTS or an external engine only if you later need word ranking or fuzzy/advanced features.
