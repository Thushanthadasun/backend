import bcrypt from "bcrypt";
import pool from "../../db.mjs";
import { tokenGenLogin } from "../utils/jwt.mjs";

// Admin login controller
export const adminLogin = async (req, res) => {
    try {
      const { email, password, rememberMe } = req.body;
      
      const checkAdmin = await pool.query(
        "SELECT * FROM admins WHERE email = $1 AND status = $2",
        [email, "1"]
      );
      
      if (checkAdmin.rows.length === 0) {
        return res.status(400).send({ message: "Invalid admin credentials" });
      }
  
      const admin = checkAdmin.rows[0];
      const passwordMatch = await bcrypt.compare(password, admin.password);
      
      if (!passwordMatch) {
        return res.status(400).send({ message: "Invalid credentials" });
      }
  
      const token = tokenGenLogin({ adminID: admin.admin_id, email: admin.email }, rememberMe);
      const cookieExpiration = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  
      res.cookie("admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: cookieExpiration,
        path: "/",
      });
  
      if (rememberMe) {
        res.cookie("rememberAdmin", email, {
          maxAge: 30 * 24 * 60 * 60 * 1000,
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
        });
      }
      
      else {
        res.clearCookie("rememberAdmin");
      }
  
      res.status(200).send({ token, admin: admin.admin_id });
    }  catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
      }
  };