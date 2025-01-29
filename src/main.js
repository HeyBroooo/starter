import twilio from 'twilio';

export default async function({ req, res }) {
  try {
    const payload = req.body;
    
    const { phoneNumber } = payload;
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.json({
        success: false,
        message: "Valid phone number is required"
      }, 400);
    }

    let formattedPhone = phoneNumber.replace(/\s+/g, '').replace(/^0+/, '');
    if (formattedPhone.startsWith('+91')) {
      formattedPhone = formattedPhone.substring(3);
    }
    
    const indianPhoneRegex = /^[6-9]\d{9}$/;
    if (!indianPhoneRegex.test(formattedPhone)) {
      return res.json({
        success: false,
        message: "Please enter a valid 10-digit Indian mobile number"
      }, 400);
    }

    formattedPhone = `+91${formattedPhone}`;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good morning";
      if (hour < 17) return "Good afternoon";
      return "Good evening";
    };

    const greeting = getGreeting();
    const otpMessage = `${greeting}! Your OTP is ${otp}. This code will expire in 10 minutes. Please do not share this OTP with anyone.`;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      const missingVar = !accountSid ? 'TWILIO_ACCOUNT_SID' : 
                        !authToken ? 'TWILIO_AUTH_TOKEN' : 
                        'TWILIO_PHONE_NUMBER';
      console.error(`Missing environment variable: ${missingVar}`);
      return res.json({
        success: false,
        message: `Server configuration error: Missing ${missingVar}`
      }, 500);
    }

    const client = twilio(accountSid, authToken);

    console.log('Attempting to send SMS', {
      to: formattedPhone,
      from: twilioPhone
    });

    const message = await client.messages.create({
      body: otpMessage,
      from: twilioPhone,
      to: formattedPhone
    });

    console.log('OTP sent successfully', {
      phoneNumber: formattedPhone,
      messageId: message.sid
    });

    return res.json({
      success: true,
      message: "OTP sent successfully",
      data: {
        messageId: message.sid
      }
    }, 200);

  } catch (error) {
    console.error('Failed to send OTP', {
      error: error.message,
      stack: error.stack,
      code: error.code
    });

    let errorMessage = "Failed to send OTP";
    let statusCode = 500;

    if (error.code) {
      switch (error.code) {
        case 20003:
          errorMessage = "Authentication failed with Twilio";
          statusCode = 401;
          break;
        case 21211: 
          errorMessage = "Invalid phone number format";
          statusCode = 400;
          break;
        case 21608: 
          errorMessage = "Service temporarily unavailable";
          statusCode = 503;
          break;
        case 21614:
          errorMessage = "The provided number is not a mobile number";
          statusCode = 400;
          break;
        default:
          errorMessage = `Twilio Error: ${error.message}`;
          statusCode = error.status || 500;
      }
    }

    return res.json({
      success: false,
      message: errorMessage
    }, statusCode);
  }
}