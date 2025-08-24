import { Router } from "express";
import { adminLogin } from "./controller.mjs";

//User functions here

const adminRouter = Router();

adminRouter.post("/login", adminLogin);


//register


export default adminRouter;
