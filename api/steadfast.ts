// Vercel Serverless Function: Modern Standard Fetch for Steadfast Dispatch

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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Only POST requests are accepted.',
    });
  }

  try {
    const { 
      invoice, 
      recipient_name, 
      recipient_phone, 
      recipient_address, 
      cod_amount, 
      note 
    } = req.body || {};

    // ১. Vercel Environment Variables থেকে সিকিউর Key রিড করা
    const apiKey = (process.env.STEADFAST_API_KEY || '').trim();
    const secretKey = (process.env.STEADFAST_SECRET_KEY || '').trim();

    if (!apiKey || !secretKey) {
      return res.status(400).json({
        success: false,
        message: 'Steadfast API Key or Secret Key is missing in Vercel Environment Variables.',
      });
    }

    // ২. ফিল্ড ভ্যালিডেশন
    if (!invoice || !recipient_name || !recipient_phone || !recipient_address) {
      return res.status(400).json({
        success: false,
        message: 'Missing required order details (invoice, name, phone, or address).',
      });
    }

    // ১১ ডিজিটের ফোন নম্বর ফরম্যাটিং
    const cleanPhone = recipient_phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('880') 
      ? cleanPhone.slice(2) 
      : cleanPhone.startsWith('88') 
      ? cleanPhone.slice(2) 
      : cleanPhone;

    // ৩. স্টেডফাস্ট অফিশিয়াল কোর API কল (Packzy Gateway)
    const response = await fetch('https://portal.packzy.com/api/v1/create_order', {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        invoice: String(invoice).trim(),
        recipient_name: String(recipient_name).trim(),
        recipient_phone: formattedPhone,
        recipient_address: String(recipient_address).trim(),
        cod_amount: Number(cod_amount) || 0,
        note: note ? String(note).trim() : 'Handle with care - ISAR Marketplace',
      }),
    });

    const data = await response.json();

    // ৪. রেসপন্স হ্যান্ডলিং
    if (response.ok && data.status === 200 && data.consignment) {
      return res.status(200).json({
        success: true,
        message: 'Order successfully created on Steadfast Courier!',
        consignment: data.consignment,
      });
    } else {
      const errorMsg = data.message || (data.errors ? Object.values(data.errors).flat().join(', ') : 'Steadfast order creation failed.');
      return res.status(response.status || 400).json({
        success: false,
        message: errorMsg,
      });
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Internal server error while connecting to Steadfast.';
    console.error('Steadfast API error:', error);
    return res.status(500).json({
      success: false,
      message: errorMsg,
    });
  }
}