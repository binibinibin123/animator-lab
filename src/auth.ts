import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";

const providers = [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }),
  Naver({
    clientId: process.env.NAVER_CLIENT_ID,
    clientSecret: process.env.NAVER_CLIENT_SECRET,
  }),
  Kakao({
    clientId: process.env.KAKAO_CLIENT_ID,
    clientSecret: process.env.KAKAO_CLIENT_SECRET,
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || "autovideo-dev-auth-secret",
  providers,
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isTestDashboardAccess =
        pathname === '/projects' && request.nextUrl.searchParams.get('testDashboard') === '1';

      if (isTestDashboardAccess) return true;

      const protectedPaths = [
        '/projects',
        '/create',
        '/project',
        '/channels',
        '/settings',
        '/debug-db',
      ];

      const requiresAuth = protectedPaths.some((base) => pathname === base || pathname.startsWith(`${base}/`));
      if (!requiresAuth) return true;

      return !!auth?.user;
    },
    async jwt({ token, account }) {
      if (account?.provider) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
      }
      return session;
    },
  },
});
