import { Resend } from 'resend';

// Appwrite function handler
export default async function ({ req, res, log, error }) {
  // Environment variables for Resend API key
  const resendApiKey = process.env.APPWRITE_FUNCTION_RESEND_API_KEY;

  if (!resendApiKey) {
    error('Resend API key is not set in the environment variables.');
    return res.json(
      { success: false, message: 'Server configuration error.' },
      500
    );
  }

  // Extract email from request body
  const { email } = req.body || {};

  if (!email) {
    return res.json(
      { success: false, message: 'Recipient email is required.' },
      400
    );
  }

  try {
    // Create a Resend client instance
    const resend = new Resend(resendApiKey);

    // Define email payload
    const emailPayload = {
      from: 'Your App <no-reply@devmohit.engineer>', // Replace with your verified sender
      to: email,
      subject: 'Welcome to Our App!',
      html: `
        <h1>Welcome to Our App!</h1>
        <p>Thank you for signing up! We’re excited to have you on board.</p>
        <p>Feel free to reach out if you have any questions.</p>
      `,
    };

    // Send the email using Resend
    const response = await resend.emails.send(emailPayload);

    log(`Email sent successfully: ${response.id}`);

    return res.json({
      success: true,
      message: 'Welcome email sent successfully.',
      emailId: response.id, // Include email ID for debugging
    });
  } catch (err) {
    error('Error sending email: ' + err.message);
    return res.json(
      { success: false, message: 'Failed to send email.', error: err.message },
      500
    );
  }
}
