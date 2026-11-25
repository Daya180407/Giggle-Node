/**
 * Seeded admin account.
 * `passwordHash` is precomputed (PBKDF2-SHA256, 100k iterations — Workers' maximum) so Worker
 * startup never hashes; the migration only copies it into old data snapshots.
 * Change the password from /admin/settings after the first sign-in.
 */
export const SEED_ACCOUNTS = [
  {
    email: "admin@gigglenode.com",
    name: "GiggleNode Admin",
    password: "admin12345",
    passwordHash: "pbkdf2$100000$Jd5RERy7ZYPNiZKB0ntFzg==$Uq8Sl12AotBVgjtYqqm3uEjsRZjfb62K5hLkvGECn4M=",
    role: "admin" as const,
  },
];
