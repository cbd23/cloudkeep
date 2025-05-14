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
import multer from 'multer'
import fs from 'fs'
import fsPromises from 'fs/promises'
import tinify from 'tinify'
import { v4 as uuidv4 } from 'uuid'

// import routers
import indexRouter from "./routes/indexRouter.js"
import signInRouter from "./routes/signInRouter.js"
import signUpRouter from "./routes/signUpRouter.js"

// define __filename & __dirname for ejs setup using ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

tinify.key = process.env.TINIFY_API_KEY

// init express app
const app = express()

// ejs setup
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "ejs")

// create absolute path to 'uploads' - required for file uploading config with multer
const uploadPath = path.join(__dirname, 'uploads')

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

// config multer & define upload's destination
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath)
}

// define the allowed file types for upload, for both images & docs
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const allowedDocTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]
  
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const timestamp = Date.now()
    const ext = path.extname(file.originalname)
    const name = path.basename(file.originalname, ext)
    cb(null, `${name}-${timestamp}${ext}`)
  }
})

// file filter for allowed MIME types
const fileFilter = (req, file, cb) => {
  const isAllowed = [...allowedImageTypes, ...allowedDocTypes].includes(file.mimetype)
  if (isAllowed) cb(null, true)
  else cb(new Error('Unsupported file type'), false)
}
  
// multer middleware
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
})

app.post('/api/upload', upload.single('file'), async (req, res) => {
  const file = req.file
  const isImage = allowedImageTypes.includes(file.mimetype)
  const isDocument = allowedDocTypes.includes(file.mimetype)

  try {
    if (!file) {
      return res.status(400).send('No file uploaded')
    }

    // limit documents to be uploaded to max 5MB
    if (isDocument && file.size > 5 * 1024 * 1024) {
      fs.unlinkSync(file.path)
      return res.status(400).send('Document files must be 5MB or less')
    }

    if (isImage) {
      // Compress with TinyPNG
      tinify.key = process.env.TINIFY_API_KEY
      const source = tinify.fromFile(file.path)
      const compressedPath = path.join(uploadPath, 'compressed-' + file.filename)
      await source.toFile(compressedPath)
      fs.unlinkSync(file.path) // remove original image, since only the compressed will be stored
      return res.send('Image uploaded and compressed successfully!')
    } else {
      // for documents: just save it! (since it's uploaded we know it isn't bigger than 5MB)
      return res.send('Document uploaded successfully!')
    }
  } catch (err) {
    console.error(err)
    return res.status(500).send('Error processing file')
  }
})

// assign routers
app.use("/sign-up", signUpRouter)
app.use("/sign-in", signInRouter)
app.use("/", indexRouter)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`server is running on PORT:${PORT}`)
})