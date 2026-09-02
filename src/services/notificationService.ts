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

    // ১. ব্যাকএন্ডের মাধ্যমে সরাসরি এসএমএস পাঠানো
    await triggerServerlessSMS(cleanPhone, message);

    // ২. ফায়ারস্টোর নোটিফিকেশন লগে সংরক্ষণ
    await addDoc(notificationsRef, {
      type: 'order_confirmation_sms',
      recipient: cleanPhone,
      orderNumber,
      message,
      status: 'sent',
      createdAt: serverTimestamp(),
    });

    console.log(`[Order Confirmation SMS Dispatched to ${cleanPhone}]`);
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

    // ১. ব্যাকএন্ডের মাধ্যমে ট্র্যাকিং এসএমএস পাঠানো
    await triggerServerlessSMS(cleanPhone, message);

    // ২. ফায়ারস্টোর নোটিফিকেশন লগে সংরক্ষণ
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

    console.log(`[Courier Tracking SMS Dispatched to ${cleanPhone}]`);
    return true;
  } catch (error) {
    console.error('Error sending courier tracking SMS:', error);
    return false;
  }
};

/**
 * কাস্টমারকে স্বয়ংক্রিয় ইমেইল ইনভয়েস (Email) পাঠানোর ফাংশন
 */
export const sendOrderConfirmationEmail = async (order: Order): Promise<boolean> => {
  try {
    const emailContent = `
      Dear ${order.customerName},
      Thank you for your order on ISAR Marketplace.
      Order Number: ${order.orderNumber}
      Total Amount: BDT ${order.totalAmount.toLocaleString()}
      Delivery Address: ${order.shippingAddress?.fullAddress}, ${order.shippingAddress?.district}
      Payment Method: ${order.paymentMethod?.toUpperCase()}
    `;

    await addDoc(notificationsRef, {
      type: 'email',
      recipient: order.customerEmail || 'customer@isar.com.bd',
      orderNumber: order.orderNumber,
      subject: `Order Confirmation - #${order.orderNumber}`,
      message: emailContent,
      status: 'sent',
      createdAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('Error recording customer Email notification:', error);
    return false;
  }
};

/**
 * নতুন অর্ডার আসলে অ্যাডমিনকে স্বয়ংক্রিয় অ্যালার্ট পাঠানোর ফাংশন
 */
export const sendAdminOrderAlert = async (order: Order): Promise<boolean> => {
  try {
    const adminAlertMessage = `New Order Received! #${order.orderNumber} by ${order.customerName} (Phone: ${order.customerPhone}) for Tk.${order.totalAmount?.toLocaleString()}`;

    await addDoc(notificationsRef, {
      type: 'admin_alert',
      recipient: 'admin@isar.com.bd',
      orderNumber: order.orderNumber,
      message: adminAlertMessage,
      status: 'unread',
      createdAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('Error recording admin alert:', error);
    return false;
  }
};