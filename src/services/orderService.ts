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
  discount: number;
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
 * অর্ডার তৈরি এবং সাথে সাথে ইনভেন্টরি থেকে স্বয়ংক্রিয় স্টক কাটার ইঞ্জিন
 */
export const createOrder = async (params: CreateOrderParams): Promise<Order> => {
  try {
    const orderDocRef = doc(ordersRef);
    const orderId = orderDocRef.id;
    const orderNumber = `ISAR-${Math.floor(100000 + Math.random() * 900000)}`;

    let calculatedWeight = 0;
    const orderItems: OrderItem[] = params.cartItems.map((item) => {
      const itemWeight = 0.5;
      calculatedWeight += itemWeight * item.quantity;

      return {
        productId: item.product.id,
        productName: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        image: item.product.images?.[0] || '',
        weightInKg: itemWeight,
        selectedVariantId: item.selectedVariantId || '',
        sellerId: item.product.sellerId || 'admin',
      };
    });

    const finalWeight = params.totalWeight && params.totalWeight > 0 
      ? params.totalWeight 
      : Math.max(calculatedWeight, 0.5);

    // ২ মেথড পেমেন্ট হিসাব: COD তে পেইড ০, বাকি total। বিকাশে পেইড total, বাকি ০।
    let finalPaymentStatus: PaymentStatus = params.paymentStatus || 'pending';
    let finalPaidAmount = Number(params.paidAmount) || 0;
    let finalDueAmount = Number(params.dueAmount);

    if (isNaN(finalDueAmount)) {
      if (params.paymentMethod === 'cod') {
        finalPaymentStatus = 'pending';
        finalPaidAmount = 0;
        finalDueAmount = params.totalAmount;
      } else {
        finalPaymentStatus = 'paid';
        finalPaidAmount = params.totalAmount;
        finalDueAmount = 0;
      }
    }

    const now = serverTimestamp();

    const newOrderData: Record<string, unknown> = {
      id: orderId,
      orderNumber,
      userId: params.userId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      shippingAddress: params.shippingAddress,
      deliveryZone: params.deliveryZone || 'inside_dhaka',
      items: orderItems,
      totalWeight: Number(finalWeight.toFixed(2)),
      subtotal: params.subtotal,
      deliveryFee: params.deliveryFee,
      discount: params.discount,
      couponCode: params.couponCode || null,
      totalAmount: params.totalAmount,
      paidAmount: finalPaidAmount,
      dueAmount: finalDueAmount,
      paymentMethod: params.paymentMethod,
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

    // ১. ফায়ারস্টোরে অর্ডার সংরক্ষণ
    await setDoc(orderDocRef, newOrderData);

    // ২. ফায়ারস্টোরের আসল প্রোডাক্ট স্টক থেকে পরিমাণ মাইনাস করা
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
      ...newOrderData,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Order;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Error creating order in Firestore';
    console.error("Error creating order in Firestore:", errorMsg);
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
    console.error("Error fetching user orders safely:", errorMsg);
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
    console.error("Error fetching order by id:", errorMsg);
    throw new Error(errorMsg, { cause: error });
  }
};

/**
 * অর্ডার ক্যান্সেল হলে স্টক আবার স্টোরে ফেরত দেওয়া (Auto-Restock)
 */
export const cancelOrder = async (orderId: string, reason?: string): Promise<void> => {
  try {
    const docRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(docRef);

    if (orderSnap.exists()) {
      const orderData = orderSnap.data() as Order;

      // ১. অর্ডার স্ট্যাটাস 'cancelled' করা
      await updateDoc(docRef, {
        status: 'cancelled',
        cancelReason: reason || 'Cancelled by customer',
        updatedAt: serverTimestamp(),
      });

      // ২. আইটেমগুলোর স্টক ফেরত দেওয়া (+quantity)
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
    console.error("Error cancelling order:", errorMsg);
    throw new Error(errorMsg, { cause: error });
  }
};