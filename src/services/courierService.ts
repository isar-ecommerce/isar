import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Order } from '../types/order';
import { sendCourierTrackingSMS } from './notificationService';

export interface CourierBookingResult {
  success: boolean;
  trackingCode: string;
  consignmentId: string;
  courierName: string;
  message: string;
}

interface SteadfastBackendResponse {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]> | null;
  consignment?: {
    consignment_id: number | string;
    tracking_code: string;
    invoice?: string;
    status?: string;
  };
}

/**
 * স্টেডফাস্ট কুরিয়ারে ১-ক্লিকে রিয়েল-টাইম পার্সেল বুক করার সিকিউর সার্ভিস
 * (১০০% আসল এপিআই কল - কোনো ফেক বা ডামি কোড ছাড়া)
 */
export const sendOrderToCourier = async (
  order: Order,
  courierName: 'Steadfast' | 'Pathao' | 'RedX' = 'Steadfast'
): Promise<CourierBookingResult> => {
  try {
    // ১. কাস্টমারের সম্পূর্ণ ৩-টিয়ার ঠিকানা ও সঠিক COD হিসাব
    const fullAddress = `${order.shippingAddress.fullAddress}, ${order.shippingAddress.upazila}, ${order.shippingAddress.district}, ${order.shippingAddress.division}`;
    const codAmount = order.paymentMethod === 'cod' ? order.totalAmount : 0;

    // ২. আমাদের সিকিউর সার্ভারলেস ব্যাকএন্ডে (/api/steadfast) রিকোয়েস্ট পাঠানো
    const response = await fetch('/api/steadfast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoice: order.orderNumber,
        recipient_name: order.shippingAddress.fullName,
        recipient_phone: order.shippingAddress.phone,
        recipient_address: fullAddress,
        cod_amount: codAmount,
        note: order.shippingAddress.deliveryNotes || `Order #${order.orderNumber} - ISAR Marketplace`,
      }),
    });

    const data = (await response.json()) as SteadfastBackendResponse;

    // ৩. স্টেডফাস্ট থেকে সফল রেসপন্স না আসলে সরাসরি রিয়েল এরর থ্রো করবে (কোনো ফেক আইডি বানাবে না)
    if (!response.ok || !data.success || !data.consignment) {
      const errorDetail = data.errors ? Object.values(data.errors).flat().join(', ') : '';
      const errorMsg = data.message || errorDetail || 'Failed to book parcel on Steadfast. Check API Keys.';
      throw new Error(`Steadfast Error: ${errorMsg}`);
    }

    const consignmentId = String(data.consignment.consignment_id);
    const trackingCode = String(data.consignment.tracking_code);

    // ৪. ফায়ারস্টোর অর্ডারে স্টেডফাস্ট থেকে আসা আসল ট্র্যাকিং কোড ও স্ট্যাটাস সেভ করা
    const orderRef = doc(db, 'orders', order.id);
    await updateDoc(orderRef, {
      status: 'shipped',
      courierName: courierName,
      consignmentId: consignmentId,
      trackingCode: trackingCode,
      trackingUrl: `https://steadfast.com.bd/t/${trackingCode}`,
      shippedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // ৫. কাস্টমারের মোবাইলে স্বয়ংক্রিয়ভাবে আসল ট্র্যাকিং কোড সহ SMS পাঠানো
    try {
      await sendCourierTrackingSMS(
        order.shippingAddress.phone,
        order.orderNumber,
        trackingCode,
        courierName
      );
    } catch (smsError) {
      console.warn('Courier tracking SMS sending note:', smsError);
    }

    return {
      success: true,
      trackingCode,
      consignmentId,
      courierName,
      message: `Order successfully booked with ${courierName}! Tracking: ${trackingCode}`,
    };
  } catch (error: unknown) {
    console.error('Error dispatching order to courier:', error);
    const err = error instanceof Error ? error : new Error('Failed to dispatch order to courier');
    throw err;
  }
};