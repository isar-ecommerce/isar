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
 * কুরিয়ার ম্যান কাস্টমারের কাছ থেকে কত টাকা তুলবে তা নির্ভুলভাবে বের করার লজিক
 */
const calculateAccurateCOD = (order: Order): number => {
  // যদি বিকাশে ফুল পেইড থাকে তবে কুরিয়ার কালেকশন হবে ০ টাকা
  if (order.paymentStatus === 'paid' || order.paymentMethod === 'bkash') {
    return 0;
  }
  // ক্যাশ অন ডেলিভারি হলে কাস্টমারের পুরো বকেয়া টাকাই কুরিয়ার ম্যান তুলবে
  if (typeof order.dueAmount === 'number') {
    return Math.max(0, order.dueAmount);
  }
  return Math.max(0, order.totalAmount || 0);
};

/**
 * স্টেডফাস্ট কুরিয়ারে ১-ক্লিকে আসল পার্সেল বুকিং সার্ভিস
 */
export const sendOrderToCourier = async (
  order: Order,
  courierName: 'Steadfast' | 'Pathao' | 'RedX' = 'Steadfast'
): Promise<CourierBookingResult> => {
  try {
    const fullAddress = `${order.shippingAddress.fullAddress}, ${order.shippingAddress.upazila}, ${order.shippingAddress.district}, ${order.shippingAddress.division}`;
    const codAmount = calculateAccurateCOD(order);

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
        note: order.shippingAddress.deliveryNotes || `Order #${order.orderNumber} - ISAR (Collect: ${codAmount} BDT)`,
      }),
    });

    const data = (await response.json()) as SteadfastBackendResponse;

    if (!response.ok || !data.success || !data.consignment) {
      const errorDetail = data.errors ? Object.values(data.errors).flat().join(', ') : '';
      const errorMsg = data.message || errorDetail || 'Failed to book parcel on Steadfast.';
      throw new Error(`Steadfast Error: ${errorMsg}`);
    }

    const consignmentId = String(data.consignment.consignment_id);
    const trackingCode = String(data.consignment.tracking_code);

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

    try {
      await sendCourierTrackingSMS(
        order.shippingAddress.phone,
        order.orderNumber,
        trackingCode,
        courierName
      );
    } catch (smsError) {
      console.warn('Courier tracking SMS note:', smsError);
    }

    return {
      success: true,
      trackingCode,
      consignmentId,
      courierName,
      message: `Order successfully booked with ${courierName}! Tracking: ${trackingCode} (COD: ${codAmount} BDT)`,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to dispatch order to courier';
    console.error('Error dispatching order to courier:', errorMsg);
    throw new Error(errorMsg, { cause: error });
  }
};