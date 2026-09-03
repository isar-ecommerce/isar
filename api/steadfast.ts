// Vercel Serverless Function: Production-Ready Secure Steadfast Courier Dispatch

declare const process: {
  env: Record<string, string | undefined>;
};

interface SteadfastRequestBody {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
}

interface ApiRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: SteadfastRequestBody;
}

interface ApiResponse {
  status: (code: number) => {
    json: (data: unknown) => void;
  };
}

interface SteadfastConsignment {
  consignment_id: number | string;
  invoice: string;
  tracking_code: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  status: string;
}

interface SteadfastApiResponse {
  status?: number;
  message?: string;
  errors?: Record<string, string[]> | null;
  consignment?: SteadfastConsignment;
}

// ফোন নম্বর পরিষ্কার ও সঠিক BD ফরম্যাটে রূপান্তর
function formatBdPhoneNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  const match = digits.match(/^(?:880|88)?(01[3-9]\d{8})$/);
  return match ? match[1] : null;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // ১. মেথড যাচাই
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Only POST requests are accepted.',
    });
  }

  // ২. সিকিউরিটি অডিট: শুধুমাত্র প্রসেস এনভায়রনমেন্ট থেকে কি রিড করা
  const apiKey = process.env.STEADFAST_API_KEY?.trim();
  const secretKey = process.env.STEADFAST_SECRET_KEY?.trim();

  if (!apiKey || !secretKey) {
    return res.status(500).json({
      success: false,
      message: 'Server Configuration Error: Steadfast credentials are missing in environment variables.',
    });
  }

  try {
    const body: SteadfastRequestBody = req.body || ({} as SteadfastRequestBody);
    const { invoice, recipient_name, recipient_phone, recipient_address, cod_amount, note } = body;

    // ৩. ফিল্ড ভ্যালিডেশন
    if (!invoice || !recipient_name || !recipient_phone || !recipient_address) {
      return res.status(400).json({
        success: false,
        message: 'Missing required order details (invoice, name, phone, or address).',
      });
    }

    // ৪. বাংলাদেশি ১১ ডিজিট ফোন নম্বর কঠোরভাবে যাচাই
    const validPhone = formatBdPhoneNumber(recipient_phone);
    if (!validPhone) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Bangladeshi phone number. Must be 11 digits starting with 013-019.',
      });
    }

    // ৫. অফিশিয়াল Steadfast API V1 পেলোড
    const steadfastPayload = {
      invoice: String(invoice).trim(),
      recipient_name: String(recipient_name).trim(),
      recipient_phone: validPhone,
      recipient_address: String(recipient_address).trim(),
      cod_amount: Math.max(0, Number(cod_amount) || 0),
      note: note ? String(note).trim() : 'Handle with care',
    };

    const headers: Record<string, string> = {
      'Api-Key': apiKey,
      'Secret-Key': secretKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'ISAR-Marketplace-Production/1.0',
    };

    // ৬. প্রাইমারি ও ব্যাকআপ ডোমেন
    const endpoints = [
      'https://portal.steadfast.com.bd/api/v1/create_order',
      'https://portal.packzy.com/api/v1/create_order',
    ];

    let lastError = '';

    for (const url of endpoints) {
      // ৮ সেকেন্ডের টাইমআউট কন্ট্রোলার (Vercel যেন হ্যাং না হয়)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(steadfastPayload),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const rawText = await response.text();

        // অ্যাকাউন্ট অ্যাক্টিভেশন সংক্রান্ত মেসেজ
        if (rawText.toLowerCase().includes('account is not active')) {
          return res.status(403).json({
            success: false,
            message: 'Steadfast Response: আপনার মার্চেন্ট অ্যাকাউন্টটি এখনো সক্রিয় হয়নি। Steadfast কাস্টমার কেয়ারে যোগাযোগ করুন।',
          });
        }

        let data: SteadfastApiResponse;
        try {
          data = JSON.parse(rawText) as SteadfastApiResponse;
        } catch {
          lastError = `Invalid non-JSON response from ${url}`;
          continue;
        }

        // সফল বুকিং
        if (response.ok && data.status === 200 && data.consignment) {
          return res.status(200).json({
            success: true,
            message: 'Order successfully created on Steadfast Courier!',
            consignment: data.consignment,
          });
        }

        // যদি স্টেডফাস্ট কোনো ভ্যালিডেশন এরর দেয়
        if (response.status >= 400 && response.status < 500) {
          const detail = data.errors ? Object.values(data.errors).flat().join(', ') : '';
          return res.status(response.status).json({
            success: false,
            message: data.message || detail || 'Steadfast order booking rejected.',
          });
        }

        lastError = data.message || `HTTP ${response.status} from ${url}`;
      } catch (err: unknown) {
        clearTimeout(timeout);
        const error = err as Error;
        lastError = error.name === 'AbortError' ? `Timeout after 8s from ${url}` : error.message;
      }
    }

    return res.status(502).json({
      success: false,
      message: `Failed to communicate with Steadfast servers. Last error: ${lastError}`,
    });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Internal server error while connecting to Steadfast.';
    return res.status(500).json({
      success: false,
      message: errorMsg,
    });
  }
}