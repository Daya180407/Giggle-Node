/**
 * Seeded demo accounts.
 * `passwordHash` is precomputed (PBKDF2-SHA256, 100k iterations — Workers' maximum) so Worker
 * startup never hashes; the migration only copies it into old data snapshots.
 * Plain passwords are documented in README (dev/demo only — replace with Supabase Auth in production).
 */
export const DEMO_ACCOUNTS = [
  {
    email: "demo@giglenode.com",
    name: "Demo Reviewer",
    password: "demo12345",
    passwordHash: "pbkdf2$100000$XNyZSJcMLirCRWXb6wLmkg==$Qt09Y6Ul1ZY4m6pu6+Bj3WZGF35tVv8RDTfs+31CH5Q=",
    role: "user" as const,
  },
  {
    email: "admin@giglenode.com",
    name: "GigleNode Admin",
    password: "admin12345",
    passwordHash: "pbkdf2$100000$Jd5RERy7ZYPNiZKB0ntFzg==$Uq8Sl12AotBVgjtYqqm3uEjsRZjfb62K5hLkvGECn4M=",
    role: "admin" as const,
  },
];
