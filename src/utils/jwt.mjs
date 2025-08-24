import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const tokenGen = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: "1h" });
};

export const tokenGenLogin = (payload, rememberMe) => {
  return jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: rememberMe ? '7d' : '1d' });
};


export const decodeToken = (token) => {
  return jwt.decode(token);
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (error) {
    console.log(error);
    return null;
  }
};
