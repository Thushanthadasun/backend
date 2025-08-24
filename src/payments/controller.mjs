// server/src/payments/controller.mjs
import crypto from "crypto";
import pool from "../../db.mjs";
import dotenv from "dotenv";
dotenv.config();

const isSandbox = (process.env.PAYHERE_MODE || "sandbox") === "sandbox";
const CHECKOUT_URL = isSandbox
  ? "https://sandbox.payhere.lk/pay/checkout"
  : "https://www.payhere.lk/pay/checkout";

const MERCHANT_ID     = process.env.PAYHERE_MERCHANT_ID;
const MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET;
const CURRENCY        = process.env.PAYHERE_CURRENCY || "LKR";

const RETURN_URL = process.env.PAYHERE_RETURN_URL;
const CANCEL_URL = process.env.PAYHERE_CANCEL_URL;
const NOTIFY_URL = process.env.PAYHERE_NOTIFY_URL;

// md5(merchant_id + order_id + amount + currency + md5(secret))
function buildCheckoutHash(orderId, amount) {
  const amt   = Number(amount).toFixed(2);
  const inner = crypto.createHash("md5").update(MERCHANT_SECRET).digest("hex").toUpperCase();
  const raw   = `${MERCHANT_ID}${orderId}${amt}${CURRENCY}${inner}`;
  return crypto.createHash("md5").update(raw).digest("hex").toUpperCase();
}

// md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + md5(secret))
function verifyIpnSig({ merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig }) {
  const amt   = Number(payhere_amount).toFixed(2);
  const inner = crypto.createHash("md5").update(MERCHANT_SECRET).digest("hex").toUpperCase();
  const raw   = `${merchant_id}${order_id}${amt}${payhere_currency}${status_code}${inner}`;
  const local = crypto.createHash("md5").update(raw).digest("hex").toUpperCase();
  return local === md5sig;
}

// POST /api/v1/payments/create
export const createPayment = async (req, res) => {
  try {
    const { reservation_id } = req.body;
    if (!reservation_id) return res.status(400).json({ message: "reservation_id required" });

    // Only use tables/columns we are sure exist (from your logs)
    const q = await pool.query(
      `
      SELECT r.reservation_id,
             st.service_name,
             COALESCE(sr.final_amount, 0)::numeric(12,2) AS amount
      FROM reservations r
      JOIN service_type st       ON r.service_type_id = st.service_type_id
      LEFT JOIN service_records sr ON r.reservation_id = sr.reservation_id
      WHERE r.reservation_id = $1
      LIMIT 1
      `,
      [reservation_id]
    );

    if (q.rowCount === 0) return res.status(404).json({ message: "reservation not found" });

    const row = q.rows[0];
    const amountNum = Number(row.amount || 0);
    if (amountNum <= 0) {
      return res.status(400).json({ message: "Final amount not set for this reservation" });
    }

    // If you later want real customer details, add them here from existing columns only.
    const firstName = "Customer";
    const lastName  = "Service";
    const email     = process.env.EMAIL_USER || "customer@example.com";
    const phone     = "0700000000";

    const orderId = `R${reservation_id}-${Date.now()}`;
    const hash    = buildCheckoutHash(orderId, amountNum);

    return res.json({
      action: CHECKOUT_URL,
      fields: {
        merchant_id: MERCHANT_ID,
        return_url:  RETURN_URL,
        cancel_url:  CANCEL_URL,
        notify_url:  NOTIFY_URL,

        order_id: orderId,
        items: row.service_name,
        currency: CURRENCY,
        amount: amountNum.toFixed(2),

        first_name: firstName,
        last_name:  lastName,
        email,
        phone,
        address: "N/A",
        city:    "N/A",
        country: "Sri Lanka",

        // Keep reservation_id handy for IPN update
        custom_1: String(reservation_id),

        hash
      }
    });
  } catch (e) {
    console.error("createPayment error", e);
    res.status(500).json({ message: "Internal error" });
  }
};

// PayHere -> your server (x-www-form-urlencoded)
export const ipnHandler = async (req, res) => {
  try {
    const b = req.body || {};
    const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig, custom_1 } = b;

    if (!verifyIpnSig({ merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig })) {
      console.warn("IPN signature mismatch", order_id);
      return res.status(400).send("SIG_MISMATCH");
    }

    // Prefer explicit reservation_id from custom_1
    let reservation_id = custom_1;
    if (!reservation_id && /^R(\d+)-/.test(order_id || "")) {
      reservation_id = (order_id.match(/^R(\d+)-/) || [])[1];
    }

    // 2 = success on PayHere
    if (String(status_code) === "2" && reservation_id) {
      await pool.query(
        `UPDATE service_records SET is_paid = true WHERE reservation_id = $1`,
        [reservation_id]
      );
    }

    return res.status(200).send("OK");
  } catch (e) {
    console.error("ipn error", e);
    return res.status(500).send("ERR");
  }
};

export const returnPage = (_req, res) => res.send("<h3>Payment finished. You can close this page.</h3>");
export const cancelPage = (_req, res)  => res.send("<h3>Payment cancelled.</h3>");
