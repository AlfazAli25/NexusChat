import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send email
export const sendEmail = async (options) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email error:', error);
    throw error;
  }
};

// Password reset email template
export const getPasswordResetEmail = (name, resetUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #0a0a0f;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 16px; padding: 40px; text-align: center;">
          
          <!-- Logo -->
          <div style="margin-bottom: 30px;">
            <h1 style="color: #ffffff; font-size: 28px; margin: 0;">
              <span style="background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">NexusChat</span>
            </h1>
          </div>
          
          <!-- Content -->
          <h2 style="color: #ffffff; font-size: 24px; margin-bottom: 16px;">Reset Your Password</h2>
          <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin-bottom: 8px;">
            Hi ${name},
          </p>
          <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            We received a request to reset your password. Click the button below to create a new password.
          </p>
          
          <!-- Button -->
          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin-bottom: 30px;">
            Reset Password
          </a>
          
          <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin-top: 30px;">
            This link will expire in 10 minutes. If you didn't request a password reset, you can safely ignore this email.
          </p>
          
          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
            <p style="color: #52525b; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} NexusChat. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};
