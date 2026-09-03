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

    // ১. Vercel Environment Variables থেকে সিকিউর Key রিড ও ট্রিম করা
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

    // ৩. অফিশিয়াল Steadfast API V1 পেলোড
    const steadfastPayload = {
      invoice: String(invoice).trim(),
      recipient_name: String(recipient_name).trim(),
      recipient_phone: formattedPhone,
      recipient_address: String(recipient_address).trim(),
      cod_amount: Number(cod_amount) || 0,
      note: note ? String(note).trim() : 'Handle with care - ISAR Marketplace',
    };

    const headers: Record<string, string> = {
      'Api-Key': apiKey,
      'Secret-Key': secretKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // ৪. সরাসরি Steadfast সেন্ট্রাল API সার্ভারে কল
    const response = await fetch('https://portal.steadfast.com.bd/api/v1/create_order', {
      method: 'POST',
      headers,
      body: JSON.stringify(steadfastPayload),
    });

    const rawText = await response.text();

    // ৫. টেক্সট রেসপন্স হ্যান্ডলিং (যেমন: অ্যাকাউন্ট ইন-অ্যাক্টিভ মেসেজ)
    if (rawText.toLowerCase().includes('account is not active') || rawText.toLowerCase().includes('account is')) {
      return res.status(400).json({
        success: false,
        message: 'আপনার Steadfast অ্যাকাউন্টটি এখনো অ্যাক্টিভ হয়নি। Steadfast সাপোর্টে যোগাযোগ করে অ্যাক্টিভেশন নিশ্চিত করুন।',
      });
    }

    // ৬. JSON রেসপন্স পার্সিং
    let data: SteadfastApiResponse = {};
    try {
      data = JSON.parse(rawText) as SteadfastApiResponse;
    } catch {
      return res.status(response.status || 400).json({
        success: false,
        message: rawText || 'Invalid response received from Steadfast.',
      });
    }

    // সফল পার্সেল বুকিং রেসপন্স
    if (response.ok && data.status === 200 && data.consignment) {
      return res.status(200).json({
        success: true,
        message: 'Order successfully created on Steadfast Courier!',
        consignment: data.consignment,
      });
    }

    // কোনো এরর দিলে
    const errorDetail = data.errors ? Object.values(data.errors).flat().join(', ') : '';
    return res.status(response.status || 400).json({
      success: false,
      message: data.message || errorDetail || 'Steadfast order booking rejected.',
      errors: data.errors || null,
    });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Internal server error while connecting to Steadfast.';
    return res.status(500).json({
      success: false,
      message: errorMsg,
    });
  }
}