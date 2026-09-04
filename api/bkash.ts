// Vercel Serverless Function: Production-Ready Secure bKash Tokenized Gateway Proxy

declare const process: {
  env: Record<string, string | undefined>;
};

export interface BkashRequestBody {
  action?: 'create-payment' | 'execute-payment' | 'query-payment';
  amount?: number | string;
  orderNumber?: string;
  paymentID?: string;
  callbackURL?: string;
}

export interface ApiRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
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
  statusCode?: string;
}

interface BkashCreateResponse {
  statusCode?: string;
  statusMessage?: string;
  paymentID?: string;
  bkashURL?: string;
}

interface BkashExecuteResponse {
  statusCode?: string;
  statusMessage?: string;
  paymentID?: string;
  trxID?: string;
  transactionStatus?: string;
  amount?: string;
  currency?: string;
  intent?: string;
  merchantInvoiceNumber?: string;
}

interface BkashQueryResponse {
  statusCode?: string;
  statusMessage?: string;
  paymentID?: string;
  trxID?: string;
  transactionStatus?: string;
  amount?: string;
}

// ইন-মেমোরি টোকেন ক্যাশিং
let cachedToken: string | null = null;
let tokenExpiryTime: number = 0;

async function getBkashToken(baseUrl: string, appKey: string, appSecret: string, username: string, password: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiryTime) {
    return cachedToken;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(`${baseUrl}/token/grant`, {
      method: 'POST',
      headers: {
        username: username,
        password: password,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_key: appKey,
        app_secret: appSecret,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = (await res.json()) as BkashTokenResponse;

    if (!res.ok || !data.id_token) {
      throw new Error(data.statusMessage || 'bKash Authentication Failed (Token Grant Rejected)');
    }

    cachedToken = data.id_token;
    tokenExpiryTime = now + 3000 * 1000;
    return cachedToken;
  } catch (err: unknown) {
    clearTimeout(timeout);
    const errorMsg = err instanceof Error ? err.message : String(err);
    // ESLint fix: ক্যাচ করা 'err' হুবহু cause হিসেবে দেওয়া হয়েছে
    throw new Error(`bKash Token Error: ${errorMsg}`, { cause: err });
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Only POST requests are accepted.',
    });
  }

  // ১. Vercel Environment Variables থেকে সিক্রেট কি লোড
  const appKey = process.env.BKASH_APP_KEY?.trim();
  const appSecret = process.env.BKASH_APP_SECRET?.trim();
  const username = process.env.BKASH_USERNAME?.trim();
  const password = process.env.BKASH_PASSWORD?.trim();
  const isSandbox = process.env.BKASH_IS_SANDBOX !== 'false';

  if (!appKey || !appSecret || !username || !password) {
    return res.status(500).json({
      success: false,
      message: 'Server Configuration Error: bKash merchant credentials are not set in environment variables.',
    });
  }

  const baseUrl = isSandbox
    ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout'
    : 'https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout';

  try {
    const body: BkashRequestBody = req.body || {};
    const { action, amount, orderNumber, paymentID, callbackURL } = body;

    // সার্ভার সাইডে অটোমেটিক টোকেন সংগ্রহ
    const idToken = await getBkashToken(baseUrl, appKey, appSecret, username, password);

    // ডাইনামিক কলব্যাক URL
    const host = req.headers?.host || 'isar-8pek.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const finalCallbackUrl = callbackURL || `${protocol}://${host}/checkout?bkash_callback=true`;

    switch (action) {
      case 'create-payment': {
        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0 || !orderNumber) {
          return res.status(400).json({
            success: false,
            message: 'Invalid amount or orderNumber for creating bKash payment.',
          });
        }

        const createRes = await fetch(`${baseUrl}/create`, {
          method: 'POST',
          headers: {
            authorization: idToken,
            'x-app-key': appKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mode: '0011',
            payerReference: 'ISAR-Customer',
            callbackURL: finalCallbackUrl,
            amount: parsedAmount.toFixed(2),
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: String(orderNumber).trim(),
          }),
        });

        const createData = (await createRes.json()) as BkashCreateResponse;

        if (createRes.ok && createData.statusCode === '0000' && createData.paymentID) {
          return res.status(200).json({
            success: true,
            paymentID: createData.paymentID,
            bkashURL: createData.bkashURL,
          });
        }

        return res.status(400).json({
          success: false,
          message: createData.statusMessage || 'Failed to initiate bKash payment with gateway.',
        });
      }

      case 'execute-payment': {
        if (!paymentID) {
          return res.status(400).json({
            success: false,
            message: 'Missing paymentID for executing bKash payment.',
          });
        }

        const execRes = await fetch(`${baseUrl}/execute`, {
          method: 'POST',
          headers: {
            authorization: idToken,
            'x-app-key': appKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paymentID }),
        });

        const execData = (await execRes.json()) as BkashExecuteResponse;

        if (execRes.ok && execData.statusCode === '0000' && execData.transactionStatus === 'Completed') {
          return res.status(200).json({
            success: true,
            trxID: execData.trxID,
            paymentID: execData.paymentID,
            transactionStatus: execData.transactionStatus,
            amount: execData.amount,
            merchantInvoiceNumber: execData.merchantInvoiceNumber,
          });
        }

        return res.status(400).json({
          success: false,
          message: execData.statusMessage || 'bKash payment execution failed or cancelled by user.',
        });
      }

      case 'query-payment': {
        if (!paymentID) {
          return res.status(400).json({
            success: false,
            message: 'Missing paymentID for querying payment status.',
          });
        }

        const queryRes = await fetch(`${baseUrl}/payment/search/${paymentID}`, {
          method: 'GET',
          headers: {
            authorization: idToken,
            'x-app-key': appKey,
            'Content-Type': 'application/json',
          },
        });

        const queryData = (await queryRes.json()) as BkashQueryResponse;

        if (queryRes.ok && queryData.statusCode === '0000') {
          return res.status(200).json({
            success: true,
            status: queryData.transactionStatus,
            trxID: queryData.trxID,
            amount: queryData.amount,
          });
        }

        return res.status(400).json({
          success: false,
          message: queryData.statusMessage || 'Unable to query bKash payment.',
        });
      }

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Supported actions: create-payment, execute-payment, query-payment.',
        });
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Internal bKash Gateway Proxy Error.';
    console.error('bKash Handler Error:', errorMsg);
    return res.status(500).json({
      success: false,
      message: errorMsg,
    });
  }
}