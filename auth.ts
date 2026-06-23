import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const allowedEmailDomain = "goodstuph.org";

export const { handlers, auth } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          hd: allowedEmailDomain,
          prompt: "select_account"
        }
      }
    })
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return false;

      const googleProfile = profile as { email?: string; email_verified?: boolean };
      return Boolean(
        googleProfile.email_verified && googleProfile.email?.toLowerCase().endsWith(`@${allowedEmailDomain}`)
      );
    }
  },
  pages: {
    error: "/internal"
  }
});
