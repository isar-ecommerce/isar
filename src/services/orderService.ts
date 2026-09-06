import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
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
 * Steadfast Official Dynamic Delivery Fee Calculator
 * Dhaka City: 70 BDT base (up to 1kg), +20 BDT per additional kg
 * Dhaka Suburbs (Savar, Gazipur, Keraniganj, Narayanganj): 100 BDT base, +20 BDT per additional kg
 * Outside Dhaka: 130 BDT base, +25 BDT per additional kg
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
 * Create Order in Firestore with Complete Financial Accounting
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
            ? `Order confirmed with advance payment of ${finalPaidAmount} BDT. Due COD: ${finalDueAmount} BDT`
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
 * Fetch User Orders Safely (Zero-Index Crash Protection)
 */
export const getUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    // কোনো কম্পোজিট ইনডেক্স ছাড়াই সরাসরি ইউজারের সব অর্ডার লোড
    const q = query(ordersRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as unknown as Order[];

    // মেমোরিতে নিরাপদে নতুন থেকে পুরোনো তারিখে সাজানো
    return list.sort((a, b) => {
      const getTime = (val: unknown): number => {
        if (!val) return 0;
        if (val instanceof Date) return val.getTime();
        if (typeof val === 'object' && val !== null && 'toDate' in (val as Record<string, unknown>)) {
          return ((val as { toDate: () => Date }).toDate()).getTime();
        }
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return new Date(val).getTime();
        return 0;
      };
      return getTime(b.createdAt) - getTime(a.createdAt);
    });
  } catch (error) {
    console.error("Error fetching user orders safely:", error);
    throw error;
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
  } catch (error) {
    console.error("Error fetching order by id:", error);
    throw error;
  }
};

/**
 * Cancel Order
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