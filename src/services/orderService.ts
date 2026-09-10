import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { 
  Order, 
  ShippingAddress, 
  OrderItem, 
  PaymentMethod, 
  PaymentStatus, 
  DeliveryZone 
} from '../types/order';
import type { CartItem } from '../store/cartStore';

const ordersRef = collection(db, 'orders');

/**
 * ফায়ারস্টোরে undefined ফিল্ড যাওয়া চিরতরে বন্ধ করতে ক্লিন-ফিল্টার
 */
const sanitizeForFirestore = <T>(data: T): T => {
  if (data === undefined) return null as unknown as T;
  if (data === null || typeof data !== 'object') return data;
  if (data instanceof Date) return data;
  if (Array.isArray(data)) {
    return data.map(sanitizeForFirestore) as unknown as T;
  }

  const cleanObject: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as unknown as Record<string, unknown>)) {
    if (value !== undefined) {
      cleanObject[key] = sanitizeForFirestore(value);
    }
  }
  return cleanObject as T;
};

/**
 * Steadfast Official Dynamic Delivery Fee Calculator (#21)
 */
export const calculateDynamicDeliveryFee = (
  district: string,
  upazila: string,
  totalWeightInKg: number = 0.5
): { fee: number; zone: DeliveryZone } => {
  const normalizedDistrict = (district || '').trim().toLowerCase();
  const normalizedUpazila = (upazila || '').trim().toLowerCase();

  const subUrbanAreas = ['savar', 'gazipur', 'keraniganj', 'narayanganj', 'dhamrai'];
  const isSubUrban = subUrbanAreas.some(area => 
    normalizedDistrict.includes(area) || normalizedUpazila.includes(area)
  );

  const effectiveWeight = Math.max(totalWeightInKg, 0.5);
  // ওজনের দশমিক মান পরবর্তী কেজিতে রাউন্ড করা
  const extraWeight = Math.max(0, Math.ceil(effectiveWeight - 1));

  if (normalizedDistrict === 'dhaka' && !isSubUrban) {
    return {
      fee: 70 + extraWeight * 20,
      zone: 'inside_dhaka'
    };
  } else if (isSubUrban) {
    return {
      fee: 100 + extraWeight * 20,
      zone: 'dhaka_suburbs'
    };
  } else {
    return {
      fee: 130 + extraWeight * 25,
      zone: 'outside_dhaka'
    };
  }
};

export interface CreateOrderParams {
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  cartItems: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount?: number;
  couponCode?: string;
  couponId?: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
  dueAmount?: number;
  paymentId?: string;
  transactionId?: string;
  totalWeight?: number;
  deliveryZone?: DeliveryZone;
  // নতুন রিয়েল প্যারামিটারসমূহ
  isGiftWrap?: boolean;
  giftMessage?: string;
  deviceInfo?: string;
}

/**
 * অর্ডার তৈরি, ডুপ্লিকেট ব্লকার এবং স্টক কাটার ইঞ্জিন
 */
export const createOrder = async (params: CreateOrderParams): Promise<Order> => {
  try {
    const cleanPhone = params.customerPhone.replace(/[^0-9]/g, '');

    // ১. 🚨 ডুপ্লিকেট অর্ডার ব্লকার (#18): একই ফোন থেকে ২ মিনিটের মধ্যে ডাবল অর্ডার চেক
    try {
      const recentQuery = query(
        ordersRef, 
        where('customerPhone', '==', cleanPhone),
        where('status', '==', 'pending')
      );
      const recentSnap = await getDocs(recentQuery);
      
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      const isDuplicate = recentSnap.docs.some((d) => {
        const data = d.data();
        let createdMs = 0;
        if (data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt) {
          createdMs = data.createdAt.toDate().getTime();
        }
        return createdMs > twoMinutesAgo;
      });

      if (isDuplicate) {
        throw new Error('Duplicate Order Detected: আপনি এইমাত্র একটি অর্ডার করেছেন। কিছুক্ষণ অপেক্ষা করুন অথবা প্রয়োজনে আমাদের কল করুন।');
      }
    } catch (dupErr) {
      if (dupErr instanceof Error && dupErr.message.includes('Duplicate Order')) {
        throw dupErr;
      }
    }

    const orderDocRef = doc(ordersRef);
    const orderId = orderDocRef.id;
    const orderNumber = `ISAR-${Math.floor(100000 + Math.random() * 900000)}`;

    let calculatedWeight = 0;
    const orderItems: OrderItem[] = (params.cartItems || []).map((item) => {
      const itemWeight = (item.product as { weightInKg?: number })?.weightInKg || 0.5;
      calculatedWeight += itemWeight * (item.quantity || 1);

      return {
        productId: item.product.id || '',
        productName: item.product.name || 'Product',
        price: Number(item.product.price) || 0,
        quantity: item.quantity || 1,
        image: item.product.images?.[0] || '',
        weightInKg: itemWeight,
        selectedVariantId: item.selectedVariantId || '',
        sellerId: item.product.sellerId || 'admin',
      };
    });

    const finalWeight = params.totalWeight && params.totalWeight > 0 
      ? params.totalWeight 
      : Math.max(calculatedWeight, 0.5);

    const giftFee = params.isGiftWrap ? 100 : 0;
    const finalTotal = Number(params.totalAmount) + giftFee;

    const finalPaymentStatus: PaymentStatus = 'pending';
    const finalPaidAmount = 0;
    const finalDueAmount = finalTotal;

    const now = serverTimestamp();

    const rawAddress = (params.shippingAddress || {}) as unknown as Record<string, unknown>;
    const cleanShippingAddress = {
      fullName: String(rawAddress.fullName || params.customerName || '').trim(),
      email: String(rawAddress.email || params.customerEmail || '').trim(),
      phone: cleanPhone,
      alternatePhone: String(rawAddress.alternatePhone || '').trim(),
      division: String(rawAddress.division || '').trim(),
      district: String(rawAddress.district || '').trim(),
      thana: String(rawAddress.thana || rawAddress.upazila || '').trim(),
      upazila: String(rawAddress.upazila || rawAddress.thana || '').trim(),
      fullAddress: String(rawAddress.fullAddress || '').trim(),
      deliveryNotes: String(rawAddress.deliveryNotes || '').trim(),
    };

    const rawOrderData: Record<string, unknown> = {
      id: orderId,
      orderNumber,
      userId: params.userId || 'guest-user',
      customerName: cleanShippingAddress.fullName,
      customerEmail: cleanShippingAddress.email,
      customerPhone: cleanPhone,
      shippingAddress: cleanShippingAddress,
      deliveryZone: params.deliveryZone || 'inside_dhaka',
      items: orderItems,
      totalWeight: Number(finalWeight.toFixed(2)),
      subtotal: Number(params.subtotal) || 0,
      deliveryFee: Number(params.deliveryFee) || 0,
      discount: Number(params.discount) || 0,
      couponCode: params.couponCode || null,
      couponId: params.couponId || null,
      totalAmount: finalTotal,
      paidAmount: finalPaidAmount,
      dueAmount: finalDueAmount,
      paymentMethod: 'cod',
      paymentStatus: finalPaymentStatus,
      status: 'pending',
      // নতুন স্মার্ট ফিল্ডসমূহ
      isGiftWrap: Boolean(params.isGiftWrap),
      giftWrapFee: giftFee,
      giftMessage: params.giftMessage?.trim() || null,
      deviceInfo: params.deviceInfo || 'Unknown Device',
      statusHistory: [
        {
          status: 'pending',
          updatedAt: new Date().toISOString(),
          note: `Order placed via Cash on Delivery. Total due: ${finalDueAmount} BDT.${params.isGiftWrap ? ' (Gift Wrap Added)' : ''}`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const sanitizedOrderData = sanitizeForFirestore(rawOrderData) as Record<string, unknown>;

    // ফায়ারস্টোরে অর্ডার সংরক্ষণ
    await setDoc(orderDocRef, sanitizedOrderData);

    // প্রোডাক্ট স্টক থেকে মাইনাস করা
    for (const item of orderItems) {
      if (item.productId) {
        try {
          const productRef = doc(db, 'products', item.productId);
          await updateDoc(productRef, {
            stock: increment(-item.quantity),
            updatedAt: serverTimestamp(),
          });
        } catch (stockErr) {
          console.warn(`Could not decrement stock for product ${item.productId}:`, stockErr);
        }
      }
    }

    return {
      ...sanitizedOrderData,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Order;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Error creating order in Firestore';
    console.error("[OrderService] Error creating order:", errorMsg);
    throw new Error(errorMsg, { cause: error });
  }
};

/**
 * ⏰ অর্ডার এডিট উইন্ডো (#20): ১০ মিনিটের মধ্যে কাস্টমারের ঠিকানা ও ফোন নম্বর সংশোধন
 */
export const updateOrderCustomerAddress = async (
  orderId: string, 
  updatedAddress: { fullName: string; phone: string; fullAddress: string; upazila: string; district: string; division: string; deliveryNotes?: string }
): Promise<void> => {
  try {
    const docRef = doc(db, 'orders', orderId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      throw new Error('Order not found');
    }

    const orderData = snap.data();
    if (orderData.status !== 'pending') {
      throw new Error('Order is already in processing. Address cannot be modified.');
    }

    await updateDoc(docRef, {
      customerName: updatedAddress.fullName.trim(),
      customerPhone: updatedAddress.phone.trim(),
      'shippingAddress.fullName': updatedAddress.fullName.trim(),
      'shippingAddress.phone': updatedAddress.phone.trim(),
      'shippingAddress.fullAddress': updatedAddress.fullAddress.trim(),
      'shippingAddress.upazila': updatedAddress.upazila.trim(),
      'shippingAddress.district': updatedAddress.district.trim(),
      'shippingAddress.division': updatedAddress.division.trim(),
      'shippingAddress.deliveryNotes': updatedAddress.deliveryNotes?.trim() || '',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update order address';
    throw new Error(msg, { cause: error });
  }
};

/**
 * Fetch User Orders Safely
 */
export const getUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    const q = query(ordersRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as unknown as Order[];

    return list.sort((a, b) => {
      const getTime = (val: unknown): number => {
        if (!val) return 0;
        if (val instanceof Date) return val.getTime();
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return new Date(val).getTime();
        if (typeof val === 'object' && val !== null && 'toDate' in val) {
          return ((val as { toDate: () => Date }).toDate()).getTime();
        }
        return 0;
      };
      return getTime(b.createdAt) - getTime(a.createdAt);
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Error fetching user orders';
    console.error("[OrderService] Error fetching user orders:", errorMsg);
    throw new Error(errorMsg, { cause: error });
  }
};

/**
 * Fetch Order Details by ID
 */
export const getOrderById = async (orderId: string): Promise<Order | null> => {
  try {
    const docRef = doc(db, 'orders', orderId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as unknown as Order;
    }
    return null;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Error fetching order by id';
    console.error("[OrderService] Error fetching order by id:", errorMsg);
    throw new Error(errorMsg, { cause: error });
  }
};

/**
 * অটোমেটিক রিটার্ন স্টক রি-ইঞ্জেকশন (#26)
 */
export const cancelOrder = async (orderId: string, reason?: string): Promise<void> => {
  try {
    const docRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(docRef);

    if (orderSnap.exists()) {
      const orderData = orderSnap.data() as Order;

      await updateDoc(docRef, {
        status: 'cancelled',
        cancelReason: reason || 'Cancelled by customer',
        updatedAt: serverTimestamp(),
      });

      // আইটেমগুলোর স্টক স্বয়ংক্রিয়ভাবে ইনভেন্টরিতে রি-ইঞ্জেক্ট করা (+quantity)
      if (orderData.items && Array.isArray(orderData.items)) {
        for (const item of orderData.items) {
          if (item.productId) {
            try {
              const productRef = doc(db, 'products', item.productId);
              await updateDoc(productRef, {
                stock: increment(item.quantity),
                updatedAt: serverTimestamp(),
              });
            } catch (restockErr) {
              console.warn(`Could not restock product ${item.productId}:`, restockErr);
            }
          }
        }
      }
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Error cancelling order';
    console.error("[OrderService] Error cancelling order:", errorMsg);
    throw new Error(errorMsg, { cause: error });
  }
};