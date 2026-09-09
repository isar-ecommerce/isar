import nodemailer from 'nodemailer';

declare const process: {
  env: Record<string, string | undefined>;
};

export interface OrderItemPayload {
  productName: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface EmailRequestBody {
  type?: 'order_confirmation' | 'admin_alert' | 'abandoned_cart_reminder';
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: OrderItemPayload[];
  totalAmount?: number;
  order?: {
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

  const body: EmailRequestBody = (req.body || {}) as EmailRequestBody;
  const { type, order } = body;

  const smtpUser = process.env.SMTP_USER?.trim() || 'isar.store.bd@gmail.com';
  // পাসওয়ার্ড থেকে স্বয়ংক্রিয়ভাবে সমস্ত স্পেস মুছে ফেলা হলো
  const smtpPass = (process.env.SMTP_PASS?.trim() || '').replace(/\s+/g, '');

  // ==========================================
  // ১. Abandoned Cart রিমাইন্ডার ইমেইল টেমপ্লেট
  // ==========================================
  if (type === 'abandoned_cart_reminder') {
    const recipient = body.customerEmail?.trim();
    if (!recipient) {
      return res.status(400).json({ success: false, message: 'Recipient email is required.' });
    }

    const customerName = body.customerName || 'Valued Customer';
    const items: OrderItemPayload[] = body.items || [];
    const totalAmount = body.totalAmount || 0;

    const itemsHtml = items.map((item: OrderItemPayload) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 8px; font-size: 13px; color: #1e293b; font-weight: 600;">${item.productName}</td>
        <td style="padding: 10px 8px; font-size: 13px; color: #64748b; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 8px; font-size: 13px; color: #1e293b; text-align: right; font-family: monospace; font-weight: 700;">৳${(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `).join('');

    const reminderHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Complete Your Order - ISAR</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background: #0f172a; padding: 28px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 900;">ISAR MARKETPLACE</h1>
            <p style="color: #94a3b8; margin: 4px 0 0; font-size: 12px;">You Left Items in Your Cart</p>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 14px; color: #334155;">Dear <strong>${customerName}</strong>,<br>You were just one step away! Your selected items are waiting in your ISAR cart.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="border-bottom: 2px solid #e2e8f0; text-align: left;">
                  <th style="padding: 8px; font-size: 11px; color: #64748b;">ITEM</th>
                  <th style="padding: 8px; font-size: 11px; color: #64748b; text-align: center;">QTY</th>
                  <th style="padding: 8px; font-size: 11px; color: #64748b; text-align: right;">PRICE</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <div style="text-align: center; margin: 28px 0;">
              <a href="https://isar-8pek.vercel.app/checkout" style="background: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: 800; text-decoration: none; display: inline-block; font-size: 14px;">Complete Order with Cash on Delivery (৳${totalAmount.toLocaleString()})</a>
            </div>
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">Zero Advance Payment required. Pay 100% when your parcel arrives!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // ১ নম্বর অগ্রাধিকার: Gmail SMTP
    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: { user: smtpUser, pass: smtpPass },
          tls: { rejectUnauthorized: false },
        });

        await transporter.sendMail({
          from: `"ISAR Store" <${smtpUser}>`,
          to: recipient,
          subject: `Did you forget your items? Complete order now - ISAR`,
          html: reminderHtml,
        });

        return res.status(200).json({ success: true, message: 'Reminder email delivered via Gmail.' });
      } catch (smtpErr: unknown) {
        const errorMsg = smtpErr instanceof Error ? smtpErr.message : String(smtpErr);
        console.error('SMTP Reminder Error:', errorMsg);
        return res.status(500).json({ success: false, message: `Email failed: ${errorMsg}` });
      }
    }

    return res.status(500).json({ success: false, message: 'SMTP credentials missing.' });
  }

  // ==========================================
  // ২. সাধারণ অর্ডার ক্যাশ মেমো / ইনভয়েস
  // ==========================================
  if (!order || !order.orderNumber) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request: order details are missing.',
    });
  }

  const recipient = type === 'admin_alert' 
    ? (process.env.ADMIN_EMAIL?.trim() || smtpUser)
    : (order.customerEmail?.trim() || smtpUser);

  const itemsHtml = order.items.map((item: OrderItemPayload) => `
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
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // ১ নম্বর অগ্রাধিকার: Gmail SMTP SSL (Port 465)
  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      await transporter.sendMail({
        from: `"ISAR Orders" <${smtpUser}>`,
        to: recipient,
        subject: `Order Confirmation #${order.orderNumber} - ISAR`,
        html: emailHtml,
      });

      return res.status(200).json({ success: true, message: 'Invoice delivered via Gmail SMTP.' });
    } catch (smtpErr: unknown) {
      const errorMsg = smtpErr instanceof Error ? smtpErr.message : String(smtpErr);
      console.error('SMTP Error:', errorMsg);
      return res.status(500).json({ success: false, message: `Email failed: ${errorMsg}` });
    }
  }

  return res.status(500).json({
    success: false,
    message: 'No active email credentials found in environment variables.',
  });
}