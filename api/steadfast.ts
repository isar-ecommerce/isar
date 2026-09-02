// Vercel Serverless Function: Secure Steadfast Courier Dispatch Proxy

// Node.js process.env গ্লোবাল টাইপ ডিক্লেয়ারেশন (Vite এরর সমাধানের জন্য)
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
  // ১. শুধুমাত্র POST রিকোয়েস্ট গ্রহণ করবে
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Only POST requests are accepted.',
    });
  }

  try {
    const body = req.body || {};
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

    // ২. সিকিউর Environment Variable অথবা রিকোয়েস্ট থেকে Key রিড করা
    const envApiKey = typeof process !== 'undefined' ? process.env.STEADFAST_API_KEY : undefined;
    const envSecretKey = typeof process !== 'undefined' ? process.env.STEADFAST_SECRET_KEY : undefined;

    const apiKey = envApiKey || customApiKey;
    const secretKey = envSecretKey || customSecretKey;

    if (!apiKey || !secretKey) {
      return res.status(400).json({
        success: false,
        message: 'Steadfast API Key or Secret Key is not configured. Please add them in Admin Settings or Vercel Environment Variables.',
      });
    }

    // ৩. ফিল্ড ভ্যালিডেশন
    if (!invoice || !recipient_name || !recipient_phone || !recipient_address) {
      return res.status(400).json({
        success: false,
        message: 'Missing required order details (invoice, name, phone, or address).',
      });
    }

    // ফোন নম্বর ফরম্যাটিং (১১ ডিজিট নিশ্চিত করা)
    const cleanPhone = recipient_phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('88') ? cleanPhone.slice(2) : cleanPhone;

    if (formattedPhone.length < 11) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipient phone number. Must be a valid 11-digit Bangladeshi mobile number.',
      });
    }

    // ৪. স্টেডফাস্ট অফিশিয়াল API পেলোড
    const steadfastPayload = {
      invoice: String(invoice).trim(),
      recipient_name: String(recipient_name).trim(),
      recipient_phone: formattedPhone,
      recipient_address: String(recipient_address).trim(),
      cod_amount: Number(cod_amount) || 0,
      note: note ? String(note).trim() : 'Handle with care - ISAR Marketplace',
    };

    // ৫. স্টেডফাস্ট সেন্ট্রাল সার্ভারে সিকিউর রিকোয়েস্ট পাঠানো
    const response = await fetch('https://portal.steadfast.com.bd/api/v1/create_order', {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(steadfastPayload),
    });

    const data = (await response.json()) as SteadfastApiResponse;

    // ৬. রেসপন্স হ্যান্ডলিং
    if (response.ok && data.status === 200 && data.consignment) {
      return res.status(200).json({
        success: true,
        message: 'Order successfully created on Steadfast Courier!',
        consignment: data.consignment,
      });
    } else {
      return res.status(response.status || 400).json({
        success: false,
        message: data.message || 'Failed to create order on Steadfast.',
        errors: data.errors || null,
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error while connecting to Steadfast.';
    console.error('Steadfast serverless API error:', error);
    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
}