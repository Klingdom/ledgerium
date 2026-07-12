import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { findUserByEmailForLogin } from '@/lib/auth-user-lookup';
import { checkAuthRateLimit, AUTH_RATE_LIMITS } from '@/lib/rate-limit/auth-buckets';

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
        const ip =
          request?.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
        const rl = checkAuthRateLimit(`login:${ip}`, Date.now(), AUTH_RATE_LIMITS.login);
        if (!rl.allowed) return null;

        const user = await findUserByEmailForLogin(rawEmail);
        if (!user) return null;

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          isAdmin: user.isAdmin,
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
        token.isAdmin = user.isAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin ?? false;
      }
      return session;
    },
  },
});

export const handlers = nextAuth.handlers;
export const auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
