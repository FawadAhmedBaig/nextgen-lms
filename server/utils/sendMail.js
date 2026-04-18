import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail', // Or use Host: smtp.ethereal.email for testing
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Use an "App Password" if using Gmail
    },
  });

  const mailOptions = {
    from: '"NextGen LMS" <noreply@nextgen.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html: options.html (Optional: Use for styled emails)
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;