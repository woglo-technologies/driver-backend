const axios = require('axios');

/**
 * Send WhatsApp OTP via MSG91
 * @param {string} phone - Recipient phone number with country code (e.g., 91XXXXXXXXXX)
 * @param {string} otp - The 6-digit OTP code
 */
const sendWhatsAppOtp = async (phone, otp) => {
  const authKey = process.env.MSG91_EMAIL_AUTHKEY;
  const templateName = process.env.MSG91_WHATSAPP_TEMPLATE_NAME;
  const senderNumber = process.env.MSG91_WHATSAPP_NUMBER;
  const languageCode = process.env.MSG91_WHATSAPP_LANGUAGE || 'en';

  const data = JSON.stringify({
    integrated_number: senderNumber,
    content_type: 'template',
    payload: {
      to: phone,
      messaging_product: 'whatsapp',
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: otp }
            ]
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              { type: 'text', text: otp }
            ]
          }
        ]
      }
    }
  });

  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/',
    headers: {
      'authkey': authKey,
      'Content-Type': 'application/json'
    },
    data: data
  };

  try {
    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error('MSG91 WhatsApp API Error:', error.response ? error.response.data : error.message);
    throw new Error('Failed to send WhatsApp OTP');
  }
};

/**
 * Send Email OTP via MSG91
 * @param {string} email - Recipient email address
 * @param {string} otp - The 6-digit OTP code
 */
const sendEmailOtp = async (email, otp) => {
  const authKey = process.env.MSG91_EMAIL_AUTHKEY;
  const templateId = process.env.MSG91_EMAIL_TEMPLATE_ID;

  const data = JSON.stringify({
    to: [{ email: email }],
    from: { email: 'no-reply@woglo.com' }, // Replace with your verified sender
    domain: 'woglo.com', // Replace with your verified domain
    template_id: templateId,
    variables: {
      OTP: otp
    }
  });

  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api.msg91.com/api/v5/email/send',
    headers: {
      'authkey': authKey,
      'Content-Type': 'application/json'
    },
    data: data
  };

  try {
    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error('MSG91 Email API Error:', error.response ? error.response.data : error.message);
    throw new Error('Failed to send Email OTP');
  }
};

module.exports = { sendWhatsAppOtp, sendEmailOtp };
