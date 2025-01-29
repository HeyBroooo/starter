import axios from 'axios';

export default async function({ req, res, log }) {
  try {
    // Parse the request body
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // Extract and validate phone number
    const { phoneNumber } = payload;
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.json({
        success: false,
        message: "Valid phone number is required.",
      }, 400);
    }

    // Format Indian phone number
    let formattedPhone = phoneNumber.replace(/\s+/g, '').replace(/^0+/, '');
    
    // Remove any existing country code if present
    if (formattedPhone.startsWith('+91')) {
      formattedPhone = formattedPhone.substring(3);
    }
    
    // Validate Indian mobile number (10 digits)
    const indianPhoneRegex = /^[6-9]\d{9}$/;
    if (!indianPhoneRegex.test(formattedPhone)) {
      return res.json({
        success: false,
        message: "Please enter a valid 10-digit Indian mobile number",
      }, 400);
    }

    // Add +91 prefix
    formattedPhone = `+91${formattedPhone}`;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Get WhatsApp access token from environment variables
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!accessToken) {
      log.error('WhatsApp access token is missing');
      return res.json({
        success: false,
        message: "Server configuration error: Missing WhatsApp access token",
      }, 500);
    }

    // WhatsApp Business API endpoint
    const whatsappApiUrl = `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    // Construct the message payload with proper template structure
    const messagePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "template",
      template: {
        name: "verification_code",  // Make sure this matches your template name exactly
        language: {
          code: "en"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: otp
              }
            ]
          }
        ]
      }
    };

    // Send request to WhatsApp Business API
    const response = await axios({
      method: 'POST',
      url: whatsappApiUrl,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: messagePayload
    });

    // Store OTP for verification (you might want to use a database or cache)
    // This is just an example - implement secure storage in production
    log.info('OTP generated:', {
      phoneNumber: formattedPhone,
      otp: otp
    });

    // Return success response
    return res.json({
      success: true,
      message: "OTP sent successfully",
      data: {
        messageId: response.data.messages?.[0]?.id
      }
    }, 200);

  } catch (error) {
    // Log detailed error for debugging
    log.error('Failed to send OTP', {
      error: error.message,
      stack: error.stack
    });

    // Determine appropriate error message and status code
    let errorMessage = "Failed to send OTP";
    let statusCode = 500;

    if (error.response?.data?.error) {
      errorMessage = error.response.data.error.message;
      statusCode = error.response.status;
    }

    return res.json({
      success: false,
      message: errorMessage
    }, statusCode);
  }
}