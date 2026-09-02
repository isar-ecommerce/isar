// Vercel Serverless Function: Secure Bangladeshi SMS Gateway Proxy (Greenweb & BulkSMSBD)

declare const process: {
  env: Record<string, string | undefined>;
};

export interface SmsRequestBody {
  to?: string;
  message?: string;
}

export interface ApiRequest {
  method?: string;
  body?: SmsRequestBody;
}

export interface ApiResponse {
  status: (code: number) => {
    json: (data: unknown) => void;
  };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // ১. শুধুমাত্র POST রিকোয়েস্ট গ্রহণ করবে
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Only POST requests are accepted.',
    });
  }

  try {
    const body: SmsRequestBody = (req.body as SmsRequestBody) || {};
    const { to, message } = body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: "to" (phone number) and "message".',
      });
    }

    // ২. ফোন নম্বর ভ্যালিডেশন ও ১১-ডিজিট ফরম্যাটিং
    const cleanDigits = to.replace(/[^0-9]/g, '');
    let formattedPhone = cleanDigits;

    if (cleanDigits.startsWith('880')) {
      formattedPhone = cleanDigits.slice(2); // 01XXXXXXXXX
    } else if (cleanDigits.startsWith('88')) {
      formattedPhone = cleanDigits.slice(2);
    }

    if (formattedPhone.length !== 11 || !formattedPhone.startsWith('01')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Bangladeshi phone number. Must be 11 digits starting with 01.',
      });
    }

    // ৩. এনভায়রনমেন্ট থেকে সিকিউর SMS API Token লোড করা
    const greenwebToken = typeof process !== 'undefined' ? (process.env.GREENWEB_TOKEN || process.env.SMS_API_TOKEN) : undefined;
    const bulkSmsApiKey = typeof process !== 'undefined' ? process.env.BULKSMSBD_API_KEY : undefined;
    const bulkSmsSenderId = typeof process !== 'undefined' ? (process.env.BULKSMSBD_SENDER_ID || '8809612443880') : '8809612443880';

    // টোকেন কনফিগার করা না থাকলে সেফ টেস্ট সিমুলেশন
    if (!greenwebToken && !bulkSmsApiKey) {
      console.log(`[SMS Simulation to ${formattedPhone}]: ${message}`);
      return res.status(200).json({
        success: true,
        isMock: true,
        recipient: formattedPhone,
        message: 'SMS simulated successfully. Add GREENWEB_TOKEN or BULKSMSBD_API_KEY in .env for live carrier delivery.',
      });
    }

    // ৪. Greenweb SMS Gateway কল করা (যদি Greenweb Token থাকে)
    if (greenwebToken) {
      const greenwebUrl = `https://api.greenweb.com.bd/api.php?token=${encodeURIComponent(greenwebToken)}&to=${encodeURIComponent(formattedPhone)}&message=${encodeURIComponent(message)}`;

      const gwResponse = await fetch(greenwebUrl, { method: 'GET' });
      const gwResult = await gwResponse.text();

      if (gwResponse.ok && !gwResult.toLowerCase().includes('error')) {
        return res.status(200).json({
          success: true,
          provider: 'Greenweb',
          recipient: formattedPhone,
          response: gwResult,
        });
      } else {
        return res.status(400).json({
          success: false,
          provider: 'Greenweb',
          message: gwResult || 'Failed to send SMS via Greenweb.',
        });
      }
    }

    // ৫. BulkSMSBD Gateway কল করা (যদি BulkSMSBD API Key থাকে)
    if (bulkSmsApiKey) {
      const bulkSmsUrl = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(bulkSmsApiKey)}&type=text&number=${encodeURIComponent(formattedPhone)}&senderid=${encodeURIComponent(bulkSmsSenderId)}&message=${encodeURIComponent(message)}`;

      const bResponse = await fetch(bulkSmsUrl, { method: 'GET' });
      const bResult = (await bResponse.json()) as { response_code?: number; success_message?: string; error_message?: string };

      if (bResponse.ok && (bResult.response_code === 202 || bResult.success_message)) {
        return res.status(200).json({
          success: true,
          provider: 'BulkSMSBD',
          recipient: formattedPhone,
          response: bResult,
        });
      } else {
        return res.status(400).json({
          success: false,
          provider: 'BulkSMSBD',
          message: bResult.error_message || 'Failed to send SMS via BulkSMSBD.',
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: 'No active SMS provider could be resolved.',
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Internal SMS gateway error.';
    console.error('SMS Gateway API Error:', error);
    return res.status(500).json({
      success: false,
      message: errorMsg,
    });
  }
}