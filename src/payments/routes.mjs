import express from "express";
import { Router } from "express";
import { createPayment, ipnHandler, returnPage, cancelPage } from "./controller.mjs";

const router = Router();

// From your app → JSON
router.post("/create", express.json(), createPayment);

// From PayHere → x-www-form-urlencoded
router.post("/ipn", express.urlencoded({ extended: true }), ipnHandler);

// Optional landing pages
router.get("/return", returnPage);
router.get("/cancel", cancelPage);

export default router;
