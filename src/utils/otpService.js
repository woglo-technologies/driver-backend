const axios = require("axios");

async function sendOtpViaMsg91(phone, otp) {
  // Mobile needs to involve country code (e.g. 91xxxxxxxxxx). User should pass it formatted.
  // Msg91 expects numbers without '+', so we remove non-digits.
  let cleanPhone = String(phone).replace(/\D/g, "");

  // If a raw 10 digit Indian number is sent, auto-append "91" so MSG91 doesn't
  // misinterpret the first few digits as a blocked country code (like Qatar's 974).
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }

  // msg91 single-message WhatsApp endpoint (supports standard components array format)
  const url = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/";

  const payload = {
    integrated_number: process.env.MSG91_WHATSAPP_NUMBER,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      to: cleanPhone,
      type: "template",
      template: {
        name: process.env.MSG91_WHATSAPP_TEMPLATE_NAME,
        language: {
          code: process.env.MSG91_WHATSAPP_LANGUAGE || "en_US"
        },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: process.env.MSG91_PARAM_1 || "accessing" },
              { type: "text", text: process.env.MSG91_PARAM_2 || "Woglo" },
              { type: "text", text: process.env.MSG91_PARAM_3 || "your device" },
              { type: "text", text: otp },
              { type: "text", text: process.env.MSG91_PARAM_5 || "Woglo Support" }
            ]
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [
              { type: "text", text: otp }
            ]
          }
        ]
      }
    }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        authkey: process.env.MSG91_EMAIL_AUTHKEY,
        "Content-Type": "application/json"
      }
    });
    console.log("MSG91 WhatsApp Success:", response.data);
    return response.data;
  } catch (err) {
    console.error("MSG91 WhatsApp Error:", err.response?.data || err.message);
    throw new Error("Failed to send WhatsApp OTP");
  }
}

async function sendResetEmailViaMsg91(email, token) {
  const resetLink = `${process.env.FRONTEND_RESET_URL}?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  const payload = {
    recipients: [
      {
        to: [{ email }],
        variables: {
          reset_link: resetLink,
          email,
        },
      },
    ],
    from: {
      email: process.env.MSG91_EMAIL_FROM,
      name: process.env.MSG91_EMAIL_FROM_NAME || "Woglo",
    },
    domain: process.env.MSG91_EMAIL_DOMAIN,
    template_id: process.env.MSG91_EMAIL_TEMPLATE_ID,
  };

  try {
    const response = await axios.post(
      "https://api.msg91.com/api/v5/email/send",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          authkey: process.env.MSG91_EMAIL_AUTHKEY,
        },
      }
    );
    console.log("MSG91 Reset Email Success:", response.data);
    return response.data;
  } catch (err) {
    console.error("MSG91 Reset Email Error:", err.response?.data || err.message);
    throw new Error("Failed to send reset email");
  }
}

async function sendSignupEmailViaMsg91(email, otp) {
  const payload = {
    recipients: [
      {
        to: [{ email }],
        variables: {
          otp: otp,
          email: email,
        },
      },
    ],
    from: {
      email: process.env.MSG91_EMAIL_FROM,
      name: process.env.MSG91_EMAIL_FROM_NAME || "Woglo",
    },
    domain: process.env.MSG91_EMAIL_DOMAIN,
    template_id: process.env.MSG91_EMAIL_SIGNUP_TEMPLATE_ID || process.env.MSG91_EMAIL_TEMPLATE_ID,
  };

  try {
    const response = await axios.post(
      "https://api.msg91.com/api/v5/email/send",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          authkey: process.env.MSG91_EMAIL_AUTHKEY,
        },
      }
    );
    console.log("MSG91 Signup Email Success:", response.data);
    return response.data;
  } catch (err) {
    console.error("MSG91 Signup Email Error:", err.response?.data || err.message);
    throw new Error("Failed to send signup email");
  }
}

module.exports = {
  sendResetEmailViaMsg91,
  sendSignupEmailViaMsg91,
  sendOtpViaMsg91,
};
