import { Router } from "express"
import { signUpController } from "../controllers/signUpController.js"

const signUpRouter = Router()

signUpRouter.get("/", signUpController.signUpGet)
signUpRouter.post("/", signUpController.signUpPost)

export default signUpRouter