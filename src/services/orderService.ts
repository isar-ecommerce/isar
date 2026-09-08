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
 * Steadfast Official Dynamic Delivery Fee Calculator
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
}

/**
 * অর্ডার তৈরি এবং স্টক সমন্বয়
 */
export const createOrder = async (params: CreateOrderParams): Promise<Order> => {
  try {
    const orderDocRef = doc(ordersRef);
    const orderId = orderDocRef.id;
    const orderNumber = `ISAR-${Math.floor(100000 + Math.random() * 900000)}`;

    let calculatedWeight = 0;
    const orderItems: OrderItem[] = (params.cartItems || []).map((item) => {
      const itemWeight = 0.5;
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

    let finalPaymentStatus: PaymentStatus = params.paymentStatus || 'pending';
    let finalPaidAmount = Number(params.paidAmount) || 0;
    let finalDueAmount = Number(params.dueAmount);

    if (isNaN(finalDueAmount)) {
      if (params.paymentMethod === 'cod') {
        finalPaymentStatus = 'pending';
        finalPaidAmount = 0;
        finalDueAmount = Number(params.totalAmount) || 0;
      } else {
        finalPaymentStatus = 'paid';
        finalPaidAmount = Number(params.totalAmount) || 0;
        finalDueAmount = 0;
      }
    }

    const now = serverTimestamp();

    // safe address: alternatePhone ও alternativePhone দুটোরই undefined দূর করা হলো
    const rawAddress = (params.shippingAddress || {}) as unknown as Record<string, unknown>;
    const cleanShippingAddress = {
      fullName: String(rawAddress.fullName || params.customerName || '').trim(),
      email: String(rawAddress.email || params.customerEmail || '').trim(),
      phone: String(rawAddress.phone || params.customerPhone || '').trim(),
      alternatePhone: String(rawAddress.alternatePhone || rawAddress.alternativePhone || '').trim(),
      alternativePhone: String(rawAddress.alternativePhone || rawAddress.alternatePhone || '').trim(),
      division: String(rawAddress.division || '').trim(),
      district: String(rawAddress.district || '').trim(),
      thana: String(rawAddress.thana || rawAddress.upazila || '').trim(),
      fullAddress: String(rawAddress.fullAddress || rawAddress.streetAddress || '').trim(),
      deliveryNotes: String(rawAddress.deliveryNotes || '').trim(),
    };

    const rawOrderData: Record<string, unknown> = {
      id: orderId,
      orderNumber,
      userId: params.userId || 'guest',
      customerName: params.customerName || cleanShippingAddress.fullName,
      customerEmail: params.customerEmail || cleanShippingAddress.email,
      customerPhone: params.customerPhone || cleanShippingAddress.phone,
      shippingAddress: cleanShippingAddress,
      deliveryZone: params.deliveryZone || 'inside_dhaka',
      items: orderItems,
      totalWeight: Number(finalWeight.toFixed(2)),
      subtotal: Number(params.subtotal) || 0,
      deliveryFee: Number(params.deliveryFee) || 0,
      discount: Number(params.discount) || 0,
      couponCode: params.couponCode || null,
      couponId: params.couponId || null,
      totalAmount: Number(params.totalAmount) || 0,
      paidAmount: finalPaidAmount,
      dueAmount: finalDueAmount,
      paymentMethod: params.paymentMethod || 'cod',
      paymentStatus: finalPaymentStatus,
      paymentId: params.paymentId || null,
      transactionId: params.transactionId || null,
      status: 'pending',
      statusHistory: [
        {
          status: 'pending',
          updatedAt: new Date().toISOString(),
          note: params.paymentMethod === 'cod' 
            ? `Order placed via Cash on Delivery. Total due: ${finalDueAmount} BDT.`
            : `Order confirmed with full bKash payment: ${finalPaidAmount} BDT.`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    // ফায়ারস্টোরের জন্য সব undefined ফিল্ড ফিল্টার করা
    const sanitizedOrderData = sanitizeForFirestore(rawOrderData) as Record<string, unknown>;

    // ১. ফায়ারস্টোরে অর্ডার সংরক্ষণ
    await setDoc(orderDocRef, sanitizedOrderData);

    // ২. প্রোডাক্ট স্টক কমানো
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
    console.error("[OrderService] Error creating order in Firestore:", errorMsg);
    throw new Error(errorMsg, { cause: error });
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
    console.error("[OrderService] Error fetching user orders safely:", errorMsg);
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
 * অর্ডার বাতিল এবং স্টক রি-স্টক ইঞ্জিন
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