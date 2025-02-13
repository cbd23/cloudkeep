import { Router } from "express"
import { signInController } from "../controllers/signInController.js"

const signInRouter = Router()

signInRouter.get("/", signInController.signInGet)

export default signInRouter