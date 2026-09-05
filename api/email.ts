import nodemailer from 'nodemailer';

declare const process: {
  env: Record<string, string | undefined>;
};

interface OrderItemPayload {
  productName: string;
  price: number;
  quantity: number;
  image?: string;
}

interface EmailRequestBody {
  type: 'order_confirmation' | 'admin_alert';
  order: {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: {
      fullAddress: string;
      upazila: string;
      district: string;
      division: string;
    };
    items: OrderItemPayload[];
    subtotal: number;
    deliveryFee: number;
    discount?: number;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    transactionId?: string;
    createdAt?: string;
  };
}

export interface ApiRequest {
  method?: string;
  body?: EmailRequestBody;
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
      message: 'Method Not Allowed. Only POST is accepted.',
    });
  }

  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || smtpUser;

  if (!smtpUser || !smtpPass) {
    return res.status(500).json({
      success: false,
      message: 'SMTP credentials (SMTP_USER / SMTP_PASS) not configured in environment.',
    });
  }

  const { order, type } = req.body || {};

  if (!order || !order.orderNumber) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request: order details are missing.',
    });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const itemsHtml = order.items.map((item) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 12px 8px; font-size: 13px; color: #1e293b; font-weight: 600;">${item.productName}</td>
      <td style="padding: 12px 8px; font-size: 13px; color: #64748b; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px 8px; font-size: 13px; color: #1e293b; text-align: right; font-family: monospace; font-weight: 700;">৳${(item.price * item.quantity).toLocaleString()}</td>
    </tr>
  `).join('');

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Order Invoice - ISAR</title></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: #0f172a; padding: 28px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 900;">ISAR MARKETPLACE</h1>
          <p style="color: #94a3b8; margin: 4px 0 0; font-size: 12px;">Order Invoice & Confirmation</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 14px; color: #334155;">Dear <strong>${order.customerName}</strong>,<br>Thank you for your order!</p>
          <div style="background: #f1f5f9; border-radius: 12px; padding: 14px; margin-bottom: 20px;">
            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Tracking Order ID:</span>
            <span style="font-size: 15px; color: #0f172a; font-weight: 900; font-family: monospace; display: block;">${order.orderNumber}</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left;">
                <th style="padding: 8px; font-size: 11px; color: #64748b;">ITEM</th>
                <th style="padding: 8px; font-size: 11px; color: #64748b; text-align: center;">QTY</th>
                <th style="padding: 8px; font-size: 11px; color: #64748b; text-align: right;">PRICE</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 4px;"><span>Subtotal:</span><span style="font-weight: 700;">৳${order.subtotal.toLocaleString()}</span></div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 4px;"><span>Delivery Fee:</span><span style="font-weight: 700;">৳${order.deliveryFee.toLocaleString()}</span></div>
            <div style="display: flex; justify-content: space-between; font-size: 15px; color: #0f172a; font-weight: 900; padding-top: 8px; border-top: 1px dashed #cbd5e1;"><span>Total:</span><span>৳${order.totalAmount.toLocaleString()}</span></div>
            <div style="background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 12px; padding: 12px; margin-top: 14px;">
              <div style="display: flex; justify-content: space-between; font-size: 12px; color: #db2777; font-weight: 800;"><span>Advance Paid (bKash):</span><span>৳${order.paidAmount.toLocaleString()}</span></div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: #0f172a; font-weight: 900; margin-top: 4px;"><span>Due on Delivery (Cash):</span><span>৳${order.dueAmount.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const recipient = type === 'admin_alert' ? adminEmail : order.customerEmail;
    await transporter.sendMail({
      from: `"ISAR Orders" <${smtpUser}>`,
      to: recipient,
      subject: `Order Confirmation #${order.orderNumber} - ISAR`,
      html: emailHtml,
    });
    return res.status(200).json({ success: true, message: 'Invoice delivered.' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, message: errorMsg });
  }
}