const axios = require("axios");

module.exports = async function (req, res) {
  try {
    // Parse the incoming request body
    const payload = JSON.parse(req.body || "{}");

    // Extract the phone number from the payload
    const { phoneNumber } = payload;

    // Validate the phone number
    if (!phoneNumber) {
      return res.json({
        success: false,
        message: "Phone number is required.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    console.log("accessToken", accessToken);

    const whatsappApiUrl = "https://graph.facebook.com/v21.0/535724639627729/messages";

    const templatePayload = {
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "template",
      template: {
        name: "otp", // Replace with the actual template name from your WhatsApp account
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

          const response = await axios.post(whatsappApiUrl, templatePayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    return res.json({
      success: true,
      message: "OTP sent successfully!",
      otp: otp, // Optionally return the OTP for logging or testing (remove in production)
      data: response.data,
    });
  } catch (error) {
    // Handle errors
    console.error("Error sending OTP:", error);
    return res.json({
      success: false,
      message: "Failed to send OTP.",
      error: error.response ? error.response.data : error.message,
    });
  }
};
