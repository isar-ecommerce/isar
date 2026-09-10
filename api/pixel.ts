declare const process: {
  env: Record<string, string | undefined>;
};

export interface PixelRequestBody {
  eventName?: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase';
  eventSourceUrl?: string;
  userData?: {
    phone?: string;
    email?: string;
  };
  customData?: {
    currency?: string;
    value?: number;
    orderNumber?: string;
    contentName?: string;
  };
}

export interface ApiRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: PixelRequestBody;
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
      message: 'Method not allowed. Only POST is accepted.',
    });
  }

  const pixelId = process.env.META_PIXEL_ID?.trim();
  const accessToken = process.env.META_ACCESS_TOKEN?.trim();

  // যদি ভ্যারিয়েবল সেট না থাকে তবে সেফ টেস্ট মোড
  if (!pixelId || !accessToken) {
    return res.status(200).json({
      success: true,
      isSimulated: true,
      message: 'Meta Pixel credentials not configured in env yet. Event safely logged.',
    });
  }

  const body: PixelRequestBody = req.body || {};
  const currentTimestamp = Math.floor(Date.now() / 1000);

  const payload = {
    data: [
      {
        event_name: body.eventName || 'PageView',
        event_time: currentTimestamp,
        action_source: 'website',
        event_source_url: body.eventSourceUrl || 'https://isar-8pek.vercel.app',
        user_data: {
          ph: body.userData?.phone ? [body.userData.phone.replace(/[^0-9]/g, '')] : undefined,
          em: body.userData?.email ? [body.userData.email.trim().toLowerCase()] : undefined,
          client_ip_address: req.headers?.['x-forwarded-for'] || undefined,
          client_user_agent: req.headers?.['user-agent'] || undefined,
        },
        custom_data: {
          currency: body.customData?.currency || 'BDT',
          value: body.customData?.value || 0,
          order_id: body.customData?.orderNumber || undefined,
          content_name: body.customData?.contentName || undefined,
        },
      },
    ],
  };

  try {
    const metaResponse = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const data = await metaResponse.json();
    return res.status(metaResponse.ok ? 200 : 400).json({
      success: metaResponse.ok,
      data,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Meta CAPI request failed';
    return res.status(500).json({
      success: false,
      message: errorMsg,
    });
  }
}