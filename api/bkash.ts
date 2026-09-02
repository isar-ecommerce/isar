// Vercel Serverless Function: Secure bKash Tokenized Payment Gateway Proxy

declare const process: {
  env: Record<string, string | undefined>;
};

export interface BkashRequestBody {
  action?: 'grant-token' | 'create-payment' | 'execute-payment' | 'query-payment';
  id_token?: string;
  amount?: number | string;
  orderNumber?: string;
  paymentID?: string;
  payerPhone?: string;
}

export interface ApiRequest {
  method?: string;
  body?: BkashRequestBody;
}

export interface ApiResponse {
  status: (code: number) => {
    json: (data: unknown) => void;
  };
}

interface BkashTokenResponse {
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  statusMessage?: string;
}

interface BkashCreateResponse {
  paymentID?: string;
  bkashURL?: string | null;
  statusMessage?: string;
}

interface BkashExecuteResponse {
  paymentID?: string;
  trxID?: string;
  transactionStatus?: string;
  amount?: string | number;
  statusMessage?: string;
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
    // Type-Safe Body Destructuring
    const body: BkashRequestBody = (req.body as BkashRequestBody) || {};
    const { action, id_token, amount, orderNumber, paymentID } = body;

    // ২. সার্ভার এনভায়রনমেন্ট থেকে সিকিউর bKash Credentials লোড করা
    const appKey = typeof process !== 'undefined' ? process.env.BKASH_APP_KEY : undefined;
    const appSecret = typeof process !== 'undefined' ? process.env.BKASH_APP_SECRET : undefined;
    const username = typeof process !== 'undefined' ? process.env.BKASH_USERNAME : undefined;
    const password = typeof process !== 'undefined' ? process.env.BKASH_PASSWORD : undefined;
    const isSandbox = typeof process !== 'undefined' ? process.env.BKASH_IS_SANDBOX !== 'false' : true;

    const baseUrl = isSandbox
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout';

    // ক্রেডেনশিয়াল মিসিং থাকলে ফলব্যাক মেসেজ
    if (!appKey || !appSecret || !username || !password) {
      if (action === 'grant-token') {
        return res.status(200).json({
          success: true,
          id_token: `sandbox_token_${Date.now()}`,
          isMock: true,
          message: 'Running in bKash test simulation mode. Add bKash credentials to .env for live gateway.',
        });
      }

      if (action === 'create-payment') {
        return res.status(200).json({
          success: true,
          paymentID: `PID_${Date.now()}`,
          bkashURL: null,
          isMock: true,
        });
      }

      if (action === 'execute-payment') {
        return res.status(200).json({
          success: true,
          trxID: `TRX${Math.floor(10000000 + Math.random() * 90000000)}`,
          transactionStatus: 'Completed',
          amount: amount || 0,
          isMock: true,
        });
      }
    }

    // ৩. অ্যাকশন অনুযায়ী বিকাশ অফিশিয়াল API কল করা
    switch (action) {
      // ধাপ ক: Grant Token (অ্যাক্সেস টোকেন তৈরি)
      case 'grant-token': {
        const tokenRes = await fetch(`${baseUrl}/token/grant`, {
          method: 'POST',
          headers: {
            username: username || '',
            password: password || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            app_key: appKey,
            app_secret: appSecret,
          }),
        });

        const tokenData = (await tokenRes.json()) as BkashTokenResponse;
        if (tokenRes.ok && tokenData.id_token) {
          return res.status(200).json({
            success: true,
            id_token: tokenData.id_token,
          });
        }

        return res.status(400).json({
          success: false,
          message: tokenData.statusMessage || 'Failed to grant bKash token.',
        });
      }

      // ধাপ খ: Create Payment
      case 'create-payment': {
        if (!id_token || !amount || !orderNumber) {
          return res.status(400).json({
            success: false,
            message: 'Missing required parameters for create-payment (id_token, amount, or orderNumber).',
          });
        }

        const createRes = await fetch(`${baseUrl}/create`, {
          method: 'POST',
          headers: {
            authorization: id_token,
            'x-app-key': appKey || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mode: '0011',
            payerReference: 'ISAR-Customer',
            callbackURL: 'https://isar.vercel.app/api/bkash-callback',
            amount: String(amount),
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: String(orderNumber),
          }),
        });

        const createData = (await createRes.json()) as BkashCreateResponse;
        if (createRes.ok && createData.paymentID) {
          return res.status(200).json({
            success: true,
            paymentID: createData.paymentID,
            bkashURL: createData.bkashURL,
          });
        }

        return res.status(400).json({
          success: false,
          message: createData.statusMessage || 'Failed to initiate bKash payment.',
        });
      }

      // ধাপ গ: Execute Payment (ওটিপি ও পিনের পর পেমেন্ট চূড়ান্ত করা)
      case 'execute-payment': {
        if (!id_token || !paymentID) {
          return res.status(400).json({
            success: false,
            message: 'Missing required parameters for execute-payment (id_token or paymentID).',
          });
        }

        const execRes = await fetch(`${baseUrl}/execute`, {
          method: 'POST',
          headers: {
            authorization: id_token,
            'x-app-key': appKey || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentID }),
        });

        const execData = (await execRes.json()) as BkashExecuteResponse;
        if (execRes.ok && execData.transactionStatus === 'Completed') {
          return res.status(200).json({
            success: true,
            trxID: execData.trxID,
            paymentID: execData.paymentID,
            transactionStatus: execData.transactionStatus,
            amount: execData.amount,
          });
        }

        return res.status(400).json({
          success: false,
          message: execData.statusMessage || 'bKash payment execution failed or was cancelled.',
        });
      }

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action parameter.',
        });
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Internal bKash gateway error.';
    console.error('bKash API Error:', error);
    return res.status(500).json({
      success: false,
      message: errorMsg,
    });
  }
}