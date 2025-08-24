import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Email sender function
export const sendEmail = async (to, subject, text) => {
    try {
        // Create a transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, // Your email
                pass: process.env.EMAIL_PASS  // Your email password or App Password
            }
        });

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            html: text
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.response);
        return { success: true, message: "Email sent successfully!" };
    } catch (error) {
        console.error("Email Error:", error);
        return { success: false, message: "Failed to send email", error };
    }
};