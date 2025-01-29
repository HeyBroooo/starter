import axios from 'axios';

export default async function({ req, res }) {
  try {
    const payload = req.body;
    
    // Extract and validate phone number
    const { phoneNumber } = payload;
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.json({
        success: false,
        message: "Valid phone number is required"
      }, 400);
    }

    // Format Indian phone number
    let formattedPhone = phoneNumber.replace(/\s+/g, '').replace(/^0+/, '');
    if (formattedPhone.startsWith('+91')) {
      formattedPhone = formattedPhone.substring(3);
    }
    
    // Validate Indian mobile number
    const indianPhoneRegex = /^[6-9]\d{9}$/;
    if (!indianPhoneRegex.test(formattedPhone)) {
      return res.json({
        success: false,
        message: "Please enter a valid 10-digit Indian mobile number"
      }, 400);
    }

    formattedPhone = `+91${formattedPhone}`;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Get time-based greeting
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good morning";
      if (hour < 17) return "Good afternoon";
      return "Good evening";
    };

    // Format OTP message with greeting
    const greeting = getGreeting();
    const otpMessage = `${greeting}! Your OTP is ${otp}. This code will expire in 10 minutes. Please do not share this OTP with anyone.`;

    // Get environment variables
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      const missingVar = !accessToken ? 'WHATSAPP_ACCESS_TOKEN' : 'WHATSAPP_PHONE_NUMBER_ID';
      console.error(`Missing environment variable: ${missingVar}`);
      return res.json({
        success: false,
        message: `Server configuration error: Missing ${missingVar}`
      }, 500);
    }

    // WhatsApp API endpoint
    const whatsappApiUrl = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;

    // Construct message payload for direct message
    const messagePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "text",
      text: {
        preview_url: false,
        body: otpMessage
      }
    };

    // Log attempt
    console.log('Attempting to send WhatsApp message', {
      to: formattedPhone,
      messageType: 'direct'
    });

    // Send message
    const response = await axios({
      method: 'POST',
      url: whatsappApiUrl,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: messagePayload,
      timeout: 10000 // 10 second timeout
    });

    // Verify response
    if (!response.data || !response.data.messages || !response.data.messages[0]) {
      throw new Error('Invalid response from WhatsApp API');
    }

    // Log success
    console.log('OTP sent successfully', {
      phoneNumber: formattedPhone,
      messageId: response.data.messages[0].id
    });

    // Return success
    return res.json({
      success: true,
      message: "OTP sent successfully",
      data: {
        messageId: response.data.messages[0].id
      }
    }, 200);

  } catch (error) {
    // Enhanced error logging
    console.error('Failed to send OTP', {
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status
    });

    // Better error handling with specific messages
    let errorMessage = "Failed to send OTP";
    let statusCode = 500;

    if (error.code === 'ECONNABORTED') {
      errorMessage = "Request timed out while sending OTP";
      statusCode = 408;
    } else if (error.response?.data?.error) {
      errorMessage = `WhatsApp API Error: ${error.response.data.error.message}`;
      statusCode = error.response.status;
    } else if (!error.response) {
      errorMessage = "Network error while sending OTP";
      statusCode = 503;
    }

    return res.json({
      success: false,
      message: errorMessage
    }, statusCode);
  }
}