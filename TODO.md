# TODO - KeyVoid refresh token fix

- [x] Locate backend refresh token handler and refresh cookie configuration.
- [x] Fix refresh cookie `path` so browser sends it on `/api/auth/refresh` (change from `/api/auth` to `/`).
- [ ] Restart backend and verify login refresh flow succeeds.
- [ ] (If still failing) inspect browser devtools Network request headers/cookies for `/api/auth/refresh` to confirm cookie is included.

