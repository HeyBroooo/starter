import axios from 'axios';

// Appwrite function for sending OTP via WhatsApp
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

    // Format phone number (remove spaces and ensure it starts with country code)
    const formattedPhone = phoneNumber.replace(/\s+/g, '');
    if (!formattedPhone.startsWith('+')) {
      return res.json({
        success: false,
        message: "Phone number must include country code (e.g., +1234567890)",
      }, 400);
    }

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

    // Construct the message payload
    const messagePayload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: "otp", // Your template name as configured in WhatsApp Business
        language: {
          code: "en_US"
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

    // Log success for monitoring
    log.info('OTP sent successfully', {
      phoneNumber: formattedPhone,
      messageId: response.data.messages?.[0]?.id
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
    console.error('Failed to send OTP', {
      error: error.message,
      stack: error.stack
    });
    

    // Determine appropriate error message and status code
    let errorMessage = "Failed to send OTP";
    let statusCode = 500;

    if (error.response) {
      // Handle WhatsApp API errors
      errorMessage = error.response.data?.error?.message || errorMessage;
      statusCode = error.response.status;
    }

    return res.json({
      success: false,
      message: errorMessage
    }, statusCode);
  }
}