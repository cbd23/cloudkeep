import bcrypt from 'bcryptjs'
import prisma from '../prisma/client.js'

async function signUpGet(req, res) {
    res.render("signUp", {user: req.user})
}

async function signUpPost(req, res) {
    try {
        const { firstName, lastName, country, day, month, year, email, password } = req.body

        const dateOfBirth = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
        const hashedPassword = await bcrypt.hash(password, 10)

        await prisma.user.create({
            data: {
                firstName,
                lastName,
                country,
                dateOfBirth,
                email,
                password: hashedPassword,
            }
        })

        res.redirect('/') // if user was successfully created, redirect to Homepage for now
    } catch (err) {
        console.error('Error creating user:'. err)
        res.status(500).send('Something went wrong.')
    }
}

export const signUpController = {
    signUpGet,
    signUpPost,
}