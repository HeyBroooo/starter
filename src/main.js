import { post } from "axios";

export default async function (req, res) {
  try {
    // Parse the payload from the request body
    const payload = JSON.parse(req.body || "{}");

    // Extract phone number from the payload
    const { phoneNumber } = payload;

    // Validate phone number
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required.",
      });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Access environment variables
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({
        success: false,
        message: "WhatsApp access token is missing in environment variables.",
      });
    }

    // WhatsApp API URL
    const whatsappApiUrl = "https://graph.facebook.com/v21.0/535724639627729/messages";

    // Construct the payload for sending the OTP
    const templatePayload = {
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "template",
      template: {
        name: "otp", // Replace with your actual WhatsApp template name
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: otp, // The dynamically generated OTP
              },
            ],
          },
        ],
      },
    };

    // Send the OTP via WhatsApp API
    const response = await post(whatsappApiUrl, templatePayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    // Return success response
    return res.json({
      success: true,
      message: "OTP sent successfully!",
      data: response.data,
    });
  } catch (error) {
    // Log error details for debugging
    console.error("Error sending OTP:", error);

    // Return error response with proper status code
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP.",
      error: error.response ? error.response.data : error.message,
    });
  }
};
