// default imports
import express from 'express'
import session from 'express-session'
import { fileURLToPath } from 'url'
import path from 'path'
import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'
import prisma from './prisma/client.js'
import { PrismaSessionStore } from '@quixo3/prisma-session-store'
import bcrypt from 'bcryptjs'

// import routers
import indexRouter from "./routes/indexRouter.js"
import signInRouter from "./routes/signInRouter.js"
import signUpRouter from "./routes/signUpRouter.js"

// define __filename & __dirname for ejs setup using ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// init express app
const app = express()

// ejs setup
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "ejs")

// config app for serving static assets (like CSS files)
const assetsPath = path.join(__dirname, "public")
app.use(express.static(assetsPath))

// init a session (set to expire after 1 year)
app.use(session({
    secret: "mouse",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 365 * 24 * 60 * 60 * 1000
    },
    store: new PrismaSessionStore(
      prisma,
      {
        checkPeriod: 2 * 60 * 1000,
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined
      }
    )
}))

// init passport
app.use(passport.initialize())

// invoke passport session in order for the login to persist
app.use(passport.session())

// use urlencoded for POST requests
app.use(express.urlencoded({ extended: true }))


// use the Local Strategy to authenticate users
passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await prisma.user.findUnique({
            where: { email }
          })
  
          if (!user) {
            console.log('Incorrect email address!')
            return done(null, false, { message: 'Incorrect email address!' })
          }
  
          const match = await bcrypt.compare(password, user.password)

          if (!match) {
            console.log('Wrong password!')
            return done(null, false, { message: 'Wrong password!' })
          }
  
          return done(null, user)
        } catch (err) {
          return done(err)
        }
      }
    )
)

passport.serializeUser((user, done) => {
    done(null, user.id) // stores user.id in the session
})

passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: id }
      })

      done(null, user) // attaches user to req.user
    } catch(err) {
      done(err)
    }
})

// authenticate users on sign-in
app.post(
    "/sign-in",
    (req, res, next) => {
      next()
    },
    passport.authenticate("local", {
      successRedirect: "/",
      failureRedirect: "/sign-in"
    })
  )

// log out users
app.get("/sign-out", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err)
      }
      res.redirect("/")
    })
})

// get access to the 'currentUser' variable in all of the views
app.use((req, res, next) => {
    
    res.locals.currentUser = req.user

    // log user's id + email in the console when logged
    if (req.user) {
        console.log(req.user.id, req.user.email)
    } else console.log('user not logged')
    next()
})

// assign routers
app.use("/sign-up", signUpRouter)
app.use("/sign-in", signInRouter)
app.use("/", indexRouter)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`server is running on PORT:${PORT}`)
})