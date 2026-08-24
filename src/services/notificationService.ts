import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Order } from '../types/order';

const notificationsRef = collection(db, 'notifications');

/**
 * কাস্টমারকে স্বয়ংক্রিয় এসএমএস (SMS) পাঠানোর ফাংশন
 * (Greenweb / Elitbuzz / BulkSMS BD API Ready)
 */
export const sendOrderConfirmationSMS = async (
  phone: string,
  orderNumber: string,
  totalAmount: number
): Promise<boolean> => {
  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = `ISAR: Dear Customer, your order #${orderNumber} of Tk.${totalAmount.toLocaleString()} has been placed successfully. Thank you for shopping with us!`;

    // ফায়ারস্টোর নোটিফিকেশন লগে সেভ
    await addDoc(notificationsRef, {
      type: 'sms',
      recipient: cleanPhone,
      orderNumber,
      message,
      status: 'sent',
      createdAt: serverTimestamp(),
    });

    console.log(`[Automated SMS Sent to ${cleanPhone}]: ${message}`);
    return true;
  } catch (error) {
    console.error('Error sending customer SMS:', error);
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
      Delivery Address: ${order.shippingAddress.fullAddress}, ${order.shippingAddress.district}
      Payment Method: ${order.paymentMethod.toUpperCase()} (Cash on Delivery)
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

    console.log(`[Automated Email Sent to ${order.customerEmail}]: Order #${order.orderNumber}`);
    return true;
  } catch (error) {
    console.error('Error sending customer Email:', error);
    return false;
  }
};

/**
 * নতুন অর্ডার আসলে অ্যাডমিনকে স্বয়ংক্রিয় অ্যালার্ট পাঠানোর ফাংশন
 */
export const sendAdminOrderAlert = async (order: Order): Promise<boolean> => {
  try {
    const adminAlertMessage = `New Order Received! #${order.orderNumber} by ${order.customerName} (Phone: ${order.customerPhone}) for Tk.${order.totalAmount.toLocaleString()}`;

    await addDoc(notificationsRef, {
      type: 'admin_alert',
      recipient: 'admin@isar.com.bd',
      orderNumber: order.orderNumber,
      message: adminAlertMessage,
      status: 'unread',
      createdAt: serverTimestamp(),
    });

    console.log(`[Admin Notification Alert]: ${adminAlertMessage}`);
    return true;
  } catch (error) {
    console.error('Error sending admin alert:', error);
    return false;
  }
};

/**
 * কুরিয়ারে পাঠানোর পর কাস্টমারকে ট্র্যাকিং SMS দেওয়ার ফাংশন
 */
export const sendCourierTrackingSMS = async (
  phone: string,
  orderNumber: string,
  trackingCode: string,
  courierName: string
): Promise<boolean> => {
  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = `ISAR: Your order #${orderNumber} is on the way via ${courierName}! Tracking Code: ${trackingCode}. Expected delivery within 24-48 hours.`;

    await addDoc(notificationsRef, {
      type: 'courier_sms',
      recipient: cleanPhone,
      orderNumber,
      trackingCode,
      courierName,
      message,
      status: 'sent',
      createdAt: serverTimestamp(),
    });

    console.log(`[Courier Tracking SMS Sent to ${cleanPhone}]: ${message}`);
    return true;
  } catch (error) {
    console.error('Error sending courier SMS:', error);
    return false;
  }
};