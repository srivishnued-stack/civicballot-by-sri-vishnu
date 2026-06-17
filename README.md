# CivicBallot

Production-oriented digital election platform for institutions. Built with Next.js, PostgreSQL, Drizzle ORM, signed HTTP-only sessions, and transactional ballot submission.

## Security model

- Passwords are hashed with bcrypt at cost 12.
- Sessions are signed, HTTP-only, `SameSite=Strict`, and secure in production.
- Eligibility is locked inside the vote transaction, enforcing one voter/one vote.
- Ballot and selection tables contain no voter identifier.
- Election results query only closed or published elections.
- Critical administrative mutations write audit events.

This architecture is suitable for a production pilot, but a public or statutory election still requires an independent security review, penetration testing, operational key management, backups, monitoring, and jurisdiction-specific compliance.

## Local setup

1. Copy `.env.example` to `.env.local` and configure a PostgreSQL database.
2. Run `npm run db:migrate`.
3. Set the bootstrap variables and run `npm run db:bootstrap` once.
4. Run `npm run dev`.

## Vercel deployment

1. Import this repository into Vercel.
2. Add a PostgreSQL integration from the Vercel Marketplace.
3. Configure `DATABASE_URL` and a random `SESSION_SECRET` of at least 32 characters.
4. Run migrations against the production database, then run the bootstrap command once with secure initial credentials.
5. Deploy. The standard Next.js build command is already configured.

## Voter CSV import

Use these exact headers:

`Name,Voter ID,Email,Department,Year,Campus,Password`

Passwords are hashed before storage. Remove plaintext source files after a verified import.
