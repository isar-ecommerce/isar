// Vercel Serverless Function: 100% Real Steadfast Courier Dispatch

declare const process: {
  env: Record<string, string | undefined>;
};

export interface SteadfastRequestBody {
  invoice?: string;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_address?: string;
  cod_amount?: number;
  note?: string;
  apiKey?: string;
  secretKey?: string;
}

export interface ApiRequest {
  method?: string;
  body?: SteadfastRequestBody;
}

export interface ApiResponse {
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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Only POST requests are accepted.',
    });
  }

  try {
    const body: SteadfastRequestBody = (req.body as SteadfastRequestBody) || {};
    const { 
      invoice, 
      recipient_name, 
      recipient_phone, 
      recipient_address, 
      cod_amount, 
      note,
      apiKey: customApiKey,
      secretKey: customSecretKey
    } = body;

    // ১. Vercel Environment থেকে API Key ও Secret Key রিড ও ট্রিম করা
    const rawApiKey = (typeof process !== 'undefined' ? process.env.STEADFAST_API_KEY : undefined) || customApiKey;
    const rawSecretKey = (typeof process !== 'undefined' ? process.env.STEADFAST_SECRET_KEY : undefined) || customSecretKey;

    const apiKey = rawApiKey ? rawApiKey.trim() : '';
    const secretKey = rawSecretKey ? rawSecretKey.trim() : '';

    if (!apiKey || !secretKey) {
      return res.status(400).json({
        success: false,
        message: 'Steadfast API Key or Secret Key is missing in Vercel Environment Variables.',
      });
    }

    // ২. রিকোয়ার্ড ফিল্ড ভ্যালিডেশন
    if (!invoice || !recipient_name || !recipient_phone || !recipient_address) {
      return res.status(400).json({
        success: false,
        message: 'Missing required order details (invoice, name, phone, or address).',
      });
    }

    // ১১ ডিজিটের সঠিক ফোন নম্বর
    const cleanPhone = recipient_phone.replace(/[^0-9]/g, '');
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith('880')) {
      formattedPhone = cleanPhone.slice(2);
    } else if (cleanPhone.startsWith('88')) {
      formattedPhone = cleanPhone.slice(2);
    }

    // ৩. স্টেডফাস্ট অফিশিয়াল API পেলোড
    const steadfastPayload = {
      invoice: String(invoice).trim(),
      recipient_name: String(recipient_name).trim(),
      recipient_phone: formattedPhone,
      recipient_address: String(recipient_address).trim(),
      cod_amount: Number(cod_amount) || 0,
      note: note ? String(note).trim() : 'Handle with care - ISAR Marketplace',
    };

    const headers = {
      'Api-Key': apiKey,
      'Secret-Key': secretKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'ISAR-Marketplace-Serverless/1.0',
    };

    // ৪. সরাসরি Steadfast-এর কোর API সার্ভারে কল (packzy.com)
    const endpoints = [
      'https://portal.packzy.com/api/v1/create_order',
      'https://portal.steadfast.com.bd/api/v1/create_order'
    ];

    let lastError = '';

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(steadfastPayload),
        });

        const rawText = await response.text();
        let data: SteadfastApiResponse = {};

        try {
          data = JSON.parse(rawText) as SteadfastApiResponse;
        } catch {
          lastError = `Invalid response from ${url}`;
          continue;
        }

        // সফল রেসপন্স
        if (response.ok && data.status === 200 && data.consignment) {
          return res.status(200).json({
            success: true,
            message: 'Order successfully created on Steadfast Courier!',
            consignment: data.consignment,
          });
        }

        // যদি স্টেডফাস্ট থেকে কোনো ভ্যালিডেশন এরর দেয় (যেমন: ফোন বা ব্যালেন্স)
        if (data.message || data.errors) {
          const detail = data.errors ? Object.values(data.errors).flat().join(', ') : '';
          return res.status(response.status || 400).json({
            success: false,
            message: data.message || detail || 'Steadfast order booking rejected.',
            errors: data.errors || null,
          });
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    return res.status(500).json({
      success: false,
      message: `Steadfast connection error: ${lastError}`,
    });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Internal server error while connecting to Steadfast.';
    return res.status(500).json({
      success: false,
      message: errorMsg,
    });
  }
}