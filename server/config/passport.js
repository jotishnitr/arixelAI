const passport = require("passport")
const { Strategy: GoogleStrategy } = require("passport-google-oauth20")
const User = require("../models/UserModel")
const crypto = require("crypto")
require('dotenv/config')

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: '/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await User.findOne({ email: profile.emails[0].value })
                if (user) {
                    done(null, user)
                }
                else {
                    const userId = crypto.randomUUID()
                    user = await User.create({
                        userId,
                        name: profile.displayName,
                        email: profile.emails[0].value,
                    })
                    done(null, user)
                }
            }
            catch (err) {
                done(err, null)
            }
        }
    )
)

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id)
        done(null, user || false)
    }
    catch (err) {
        done(err, null)
    }
});