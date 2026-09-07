import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Order } from '../types/order';

const notificationsRef = collection(db, 'notifications');

/**
 * ইন্টারনাল হেল্পার ফাংশন: সিকিউর সার্ভারলেস ব্যাকএন্ডের (/api/sms) মাধ্যমে এসএমএস পাঠানো
 */
const triggerServerlessSMS = async (to: string, message: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, message }),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return true;
    }
    console.warn('SMS gateway delivery note:', data.message);
    return false;
  } catch (error) {
    console.warn('SMS gateway network note:', error);
    return false;
  }
};

/**
 * কাস্টমারকে স্বয়ংক্রিয় অর্ডার কনফার্মেশন এসএমএস (SMS) পাঠানোর ফাংশন
 */
export const sendOrderConfirmationSMS = async (
  phone: string,
  orderNumber: string,
  totalAmount: number
): Promise<boolean> => {
  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = `ISAR: Dear Customer, your order #${orderNumber} of Tk.${totalAmount.toLocaleString()} has been confirmed. Thank you for shopping with us!`;

    await triggerServerlessSMS(cleanPhone, message);

    await addDoc(notificationsRef, {
      type: 'order_confirmation_sms',
      recipient: cleanPhone,
      orderNumber,
      message,
      status: 'sent',
      createdAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('Error sending order confirmation SMS:', error);
    return false;
  }
};

/**
 * কুরিয়ারে পাঠানোর পর কাস্টমারকে ট্র্যাকিং কোড সহ SMS পাঠানোর ফাংশন
 */
export const sendCourierTrackingSMS = async (
  phone: string,
  orderNumber: string,
  trackingCode: string,
  courierName: string
): Promise<boolean> => {
  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = `ISAR: Your order #${orderNumber} is on the way via ${courierName}! Tracking Code: ${trackingCode}. Track at: steadfast.com.bd/t/${trackingCode}`;

    await triggerServerlessSMS(cleanPhone, message);

    await addDoc(notificationsRef, {
      type: 'courier_tracking_sms',
      recipient: cleanPhone,
      orderNumber,
      trackingCode,
      courierName,
      message,
      status: 'sent',
      createdAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('Error sending courier tracking SMS:', error);
    return false;
  }
};

/**
 * কাস্টমারকে আসল Nodemailer ইমেইল ইনভয়েস (/api/email) পাঠানোর ফাংশন
 */
export const sendOrderConfirmationEmail = async (order: Order): Promise<boolean> => {
  try {
    // ১. Vercel Serverless Email Proxy কল করা
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'order_confirmation',
        order: {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail || 'customer@gmail.com',
          customerPhone: order.customerPhone,
          shippingAddress: {
            fullAddress: order.shippingAddress.fullAddress,
            upazila: order.shippingAddress.upazila,
            district: order.shippingAddress.district,
            division: order.shippingAddress.division,
          },
          items: order.items.map((item) => ({
            productName: item.productName,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          })),
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          discount: order.discount || 0,
          totalAmount: order.totalAmount,
          paidAmount: order.paidAmount,
          dueAmount: order.dueAmount,
          transactionId: order.transactionId,
        },
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.warn('Email proxy response warning:', result.message);
    }

    // ২. ফায়ারস্টোরে নোটিফিকেশন লগ সংরক্ষণ
    await addDoc(notificationsRef, {
      type: 'email',
      recipient: order.customerEmail || 'customer@gmail.com',
      orderNumber: order.orderNumber,
      subject: `Order Confirmation #${order.orderNumber} - ISAR`,
      status: res.ok ? 'sent' : 'failed',
      createdAt: serverTimestamp(),
    });

    return res.ok;
  } catch (error) {
    console.warn('Email dispatch network warning:', error);
    return false;
  }
};

/**
 * নতুন অর্ডার আসলে অ্যাডমিনকে স্বয়ংক্রিয় অ্যালার্ট পাঠানোর ফাংশন
 */
export const sendAdminOrderAlert = async (order: Order): Promise<boolean> => {
  try {
    await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'admin_alert',
        order,
      }),
    }).catch(() => {});

    await addDoc(notificationsRef, {
      type: 'admin_alert',
      recipient: 'admin@isar.com.bd',
      orderNumber: order.orderNumber,
      message: `New Order Received #${order.orderNumber} from ${order.customerName} (Total: ${order.totalAmount} BDT)`,
      status: 'unread',
      createdAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.warn('Admin alert notification warning:', error);
    return false;
  }
};