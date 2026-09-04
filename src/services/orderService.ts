import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  updateDoc
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
 * স্টেডফাস্ট কুরিয়ারের অফিশিয়াল রেট অনুযায়ী স্বয়ংক্রিয় ডায়নামিক ডেলিভারি চার্জ ক্যালকুলেটর
 * ঢাকা সিটি: ৬০ টাকা (প্রথম ১ কেজি), অতিরিক্ত প্রতি কেজিতে +২০ টাকা
 * ঢাকা উপশহর (সাভার, গাজীপুর, কেরানীগঞ্জ, নারায়ণগঞ্জ): ১০০ টাকা (প্রথম ১ কেজি), অতিরিক্ত প্রতি কেজিতে +২০ টাকা
 * ঢাকার বাইরে: ১৩০ টাকা (প্রথম ১ কেজি), অতিরিক্ত প্রতি কেজিতে +২৫ টাকা
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
      fee: 60 + extraWeight * 20,
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
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  paidAmount?: number;           // বিকাশে অগ্রিম দেওয়া টাকা
  dueAmount?: number;            // কুরিয়ার ম্যান কাস্টমারের থেকে ক্যাশ নেবে
  paymentId?: string;            // বিকাশ পেমেন্ট আইডি
  transactionId?: string;        // বিকাশ ট্রানজেকশন আইডি (trxID)
  totalWeight?: number;          // মোট পার্সেল ওজন (কেজিতে)
  deliveryZone?: DeliveryZone;   // ডেলিভারি জোন
}

/**
 * ফায়ারস্টোরে নিখুঁত অগ্রিম পেমেন্ট ও ডেলিভারি হিসাবসহ নতুন অর্ডার তৈরির ফাংশন
 */
export const createOrder = async (params: CreateOrderParams): Promise<Order> => {
  try {
    const orderDocRef = doc(ordersRef);
    const orderId = orderDocRef.id;
    const orderNumber = `ISAR-${Math.floor(100000 + Math.random() * 900000)}`;

    // পণ্যের ওজন সহ অর্ডার আইটেম প্রসেসিং
    let calculatedWeight = 0;
    const orderItems: OrderItem[] = params.cartItems.map((item) => {
      const itemWeight = 0.5; // ডিফল্ট প্রতি আইটেমে ০.৫ কেজি
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

    // পেমেন্ট স্ট্যাটাস ও টাকার নিখুঁত ব্যালেন্সিং
    let finalPaymentStatus: PaymentStatus = params.paymentStatus || 'pending';
    let finalPaidAmount = Number(params.paidAmount) || 0;
    let finalDueAmount = Number(params.dueAmount);

    if (isNaN(finalDueAmount)) {
      if (params.paymentMethod === 'cod') {
        if (finalPaidAmount > 0 && finalPaidAmount < params.totalAmount) {
          finalPaymentStatus = 'partial_paid';
          finalDueAmount = Math.max(0, params.totalAmount - finalPaidAmount);
        } else if (finalPaidAmount >= params.totalAmount) {
          finalPaymentStatus = 'paid';
          finalDueAmount = 0;
        } else {
          finalPaymentStatus = 'pending';
          finalDueAmount = params.totalAmount;
        }
      } else {
        // ফুল অনলাইন পেমেন্ট (bKash/Nagad/Card)
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
          note: finalPaidAmount > 0 
            ? `Order confirmed with advance payment of ৳${finalPaidAmount}. Due COD: ৳${finalDueAmount}`
            : 'Order placed successfully (Pending Payment).',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(orderDocRef, newOrderData);

    return {
      ...newOrderData,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Order;
  } catch (error) {
    console.error("Error creating order in Firestore:", error);
    throw error;
  }
};

/**
 * ইউজারের পূর্ববর্তী সব অর্ডার ফেচ করার ফাংশন
 */
export const getUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    const q = query(ordersRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as unknown as Order[];
  } catch (error) {
    console.error("Error fetching user orders:", error);
    throw error;
  }
};

/**
 * অর্ডার আইডি দিয়ে বিস্তারিত তথ্য পাওয়ার ফাংশন
 */
export const getOrderById = async (orderId: string): Promise<Order | null> => {
  try {
    const docRef = doc(db, 'orders', orderId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as unknown as Order;
    }
    return null;
  } catch (error) {
    console.error("Error fetching order by id:", error);
    throw error;
  }
};

/**
 * অর্ডার ক্যান্সেল করার ফাংশন
 */
export const cancelOrder = async (orderId: string, reason?: string): Promise<void> => {
  try {
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, {
      status: 'cancelled',
      cancelReason: reason || 'Cancelled by customer',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    throw error;
  }
};