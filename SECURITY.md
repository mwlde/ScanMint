# Security Policy

## About This Project

ScanMint is an academic project built for CSCI435 (Computer Vision Algorithms
and Systems) at the University of Wollongong in Dubai. It is a demonstration
application and is not intended for production use with sensitive or
confidential data.

## Supported Versions

| Version | Supported |
|---------|-----------|
| main (latest) | Yes |
| All other branches/tags | No |

Only the `main` branch receives security attention. There are no maintained
release versions.

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it
responsibly:

1. **Do not** open a public GitHub issue describing the vulnerability.
2. Instead, contact the maintainers directly via email or GitHub's private
   vulnerability reporting feature (Security tab/ Report a vulnerability).
3. Include a clear description of the issue, steps to reproduce it, and its
   potential impact if known.

We aim to acknowledge reports within a few days. Since this is a student
project maintained on a best-effort basis outside of class deadlines, response
and fix times may vary.

## Known Security Considerations

This project already implements several baseline protections, documented in
the project report:

- File upload validation (size limits, content-type and magic-byte checks,
  maximum decoded image dimensions) on both backend services.
- Generic error responses to clients; detailed errors are logged server-side
  only.
- Row Level Security (RLS) enabled on all Supabase tables, with database-level
  CHECK constraints on label fields.
- Password validation rules (minimum length, character variety, maximum
  length aligned with bcrypt's input limit) on account creation.

Known limitations (also discussed in the report's Limitations section):

- CORS is currently configured to allow all origins (`*`), suitable for
  development/demo but not for a production deployment.
- There is no rate limiting on the `/scan` or `/classify` endpoints.
- The Supabase `feedback` table uses permissive RLS policies (`true`) to
  support anonymous/guest feedback submission, which is an intentional
  trade-off for this project's guest-first design, not an oversight.

These are not actively monitored or patched outside of coursework
requirements, so please use this project for learning and demonstration
purposes rather than handling real or sensitive documents.
