import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { findUserByEmailForLogin } from '@/lib/auth-user-lookup';
import { checkAuthRateLimit, AUTH_RATE_LIMITS } from '@/lib/rate-limit/auth-buckets';
import { getClientIp } from '@/lib/client-ip';
import { reserveLoginAttempt, recordLoginSuccess } from '@/lib/rate-limit/account-throttle';

/**
 * Real bcrypt hash at cost 12 — the same cost signup and reset-password use
 * (`hash(password, 12)`) — of a random throwaway string whose plaintext was
 * discarded. Used only to spend an equal compare when no real hash exists; the
 * compare result is never trusted (see authorize). If the app's hashing cost
 * changes, regenerate this at the same cost.
 */
const DUMMY_PASSWORD_HASH = '$2a$12$DD0qcW8cRRHVLAMMN.FoY.d56U24JBYsvj4shQuYss9CAw.OjLVTe';

/** A stored value bcrypt will actually spend work on (malformed ones return instantly). */
function isUsableBcryptHash(h: unknown): h is string {
  return typeof h === 'string' && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(h);
}

const nextAuth = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        const rawEmail = credentials.email as string;
        const password = credentials.password as string;

        // Brute-force throttling: 10 attempts per IP per 15 minutes. Deny
        // (return null) rather than throw so the standard NextAuth
        // invalid-credentials redirect/error flow is unchanged and no
        // rate-limit-specific state is disclosed to a scripted attacker.
        // `request` typing/availability can vary across NextAuth call sites
        // (e.g. some internal invocations), so every access is optional-
        // chained and falls back to 'unknown' — this must never crash login.
        // See client-ip.ts for why the default behavior (first XFF entry) is
        // unchanged and how to make it un-spoofable (backlog row #225).
        const ip = getClientIp(request);
        const rl = checkAuthRateLimit(`login:${ip}`, Date.now(), AUTH_RATE_LIMITS.login);
        if (!rl.allowed) return null;

        // Per-ACCOUNT throttle (rows #289, #291), independent of IP:
        // X-Forwarded-For rotation defeats the per-IP limit above. The
        // attempt is RESERVED (counted as a pending failure) synchronously
        // before the awaited bcrypt compare, so parallel requests cannot all
        // slip through a check-then-record gap; success clears it. Refusal is
        // `return null`, identical to a wrong password, for existing and
        // non-existing addresses alike (no enumeration oracle). Refused
        // attempts are not counted (no escalation past the cap).
        if (!reserveLoginAttempt(rawEmail, Date.now()).allowed) return null;

        const user = await findUserByEmailForLogin(rawEmail);

        // Timing oracle (row #290 item 2): every input that reaches this point
        // does exactly ONE bcrypt compare at cost 12, whether or not the
        // account exists or has a usable hash. Skipping the compare for an
        // unknown address would make "not registered" measurably faster. When
        // there is no usable stored hash we compare against DUMMY_PASSWORD_HASH
        // and discard the result: `isValid` can only be true when a real user
        // with a real hash matched.
        const storedHash = user && isUsableBcryptHash(user.passwordHash) ? user.passwordHash : null;
        const compareResult = await compare(password, storedHash ?? DUMMY_PASSWORD_HASH);
        const isValid = storedHash !== null && user !== null && compareResult === true;
        if (!isValid || !user) return null;
        recordLoginSuccess(rawEmail);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    // Demo-F2 (iter 087 / TEAM-P03.10): configurable session TTL via env var.
    // Set NEXTAUTH_SESSION_MAXAGE=<seconds> to shorten for demo period (e.g. 3600 = 1 hour).
    // Default: 604800 = 7 days.
    maxAge: parseInt(process.env.NEXTAUTH_SESSION_MAXAGE ?? '604800', 10),
  },
  pages: {
    signIn: '/login',
    newUser: '/signup',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

export const handlers = nextAuth.handlers;
export const auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
