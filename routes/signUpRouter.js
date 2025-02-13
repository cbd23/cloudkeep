import { Router } from "express"
import { signUpController } from "../controllers/signUpController.js"

const signUpRouter = Router()

signUpRouter.get("/", signUpController.signUpGet)

export default signUpRouter