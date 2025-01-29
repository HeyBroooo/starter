import axios from 'axios';

export default async function({ req, res, context }) {
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
      context.error('WhatsApp access token is missing');
      return res.json({
        success: false,
        message: "Server configuration error: Missing WhatsApp access token",
      }, 500);
    }

    // Get WhatsApp Phone Number ID from environment variables
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!phoneNumberId) {
      context.error('WhatsApp Phone Number ID is missing');
      return res.json({
        success: false,
        message: "Server configuration error: Missing WhatsApp Phone Number ID",
      }, 500);
    }

    // WhatsApp Business API endpoint (updated to v17.0)
    const whatsappApiUrl = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;

    // Log the API request details
    context.log('Sending WhatsApp message', {
      url: whatsappApiUrl,
      to: formattedPhone,
      template: 'otp'
    });

    // Construct the message payload
    const messagePayload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: "otp",
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

    // Log success
    context.log('OTP sent successfully', {
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
    // Log error details
    context.error('Failed to send OTP', {
      error: error.message,
      stack: error.stack,
      response: error.response?.data
    });

    // Determine appropriate error message and status code
    let errorMessage = "Failed to send OTP";
    let statusCode = 500;

    if (error.response?.data?.error) {
      errorMessage = `WhatsApp API Error: ${error.response.data.error.message}`;
      statusCode = error.response.status;
    }

    return res.json({
      success: false,
      message: errorMessage
    }, statusCode);
  }
}