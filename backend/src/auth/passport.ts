import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../index';

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0].value;
          if (!email) {
            return done(new Error('No email found from Google'), undefined);
          }

          let user = await prisma.user.findUnique({ where: { email } });

          if (!user) {
            // Check domain for default role
            const domain = email.split('@')[1];
            const role = domain === 'northbkk.ac.th' ? 'Member' : 'Guest';

            user = await prisma.user.create({
              data: {
                email,
                displayName: profile.displayName,
                avatarUrl: profile.photos?.[0].value,
                systemRole: role,
              },
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );
} else {
  console.warn("WARNING: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set. Google Auth is disabled.");
}
