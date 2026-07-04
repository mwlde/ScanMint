# Contributing to ScanMint

ScanMint was built as a group project for CSCI435. It isn't actively seeking
external contributions, but if you'd like to report a bug, suggest an
improvement, or fork it for your own learning, here's how.

## Reporting Bugs

Open a GitHub issue with:
- A clear description of the problem
- Steps to reproduce it
- Expected vs actual behaviour
- Screenshots if relevant (especially for detection/classification issues)

## Suggesting Enhancements

Open an issue describing the enhancement and why it would be useful. Since
this is a student project, not every suggestion will be implemented, but
we're happy to discuss ideas.

## Submitting Changes

1. Fork the repository
2. Create a branch for your change (`git checkout -b fix/your-fix-name`)
3. Make your changes, keeping commit messages clear and specific
4. Test locally before submitting (see the README for setup instructions)
5. Open a pull request describing what changed and why

## Code Style

- Backend (Python): keep functions small and documented with short comments
  explaining intent, not just restating the code
- Frontend (TypeScript/React): follow the existing component structure under
  `frontend/app/`
- No strict linter is enforced project-wide, but please keep formatting
  consistent with surrounding code

## Project Structure

See the README for the full architecture overview (backend / classifier /
frontend split, and how they communicate).
