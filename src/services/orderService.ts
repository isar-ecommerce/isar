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
import type { Order, ShippingAddress, OrderItem, PaymentMethod } from '../types/order';
import type { CartItem } from '../store/cartStore';

const ordersRef = collection(db, 'orders');

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
}

/**
 * ফায়ারস্টোরে নতুন অর্ডার তৈরি করার ফাংশন
 */
export const createOrder = async (params: CreateOrderParams): Promise<Order> => {
  try {
    const orderDocRef = doc(ordersRef);
    const orderId = orderDocRef.id;
    const orderNumber = `ISAR-${Math.floor(100000 + Math.random() * 900000)}`;

    const orderItems: OrderItem[] = params.cartItems.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      image: item.product.images[0] || '',
      selectedVariantId: item.selectedVariantId || '',
      sellerId: item.product.sellerId || 'admin',
    }));

    const now = serverTimestamp();

    const newOrderData = {
      id: orderId,
      orderNumber,
      userId: params.userId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      shippingAddress: params.shippingAddress,
      items: orderItems,
      subtotal: params.subtotal,
      deliveryFee: params.deliveryFee,
      discount: params.discount,
      couponCode: params.couponCode || null,
      totalAmount: params.totalAmount,
      paymentMethod: params.paymentMethod,
      paymentStatus: params.paymentMethod === 'cod' ? 'pending' : 'paid',
      status: 'pending' as const,
      statusHistory: [
        {
          status: 'pending' as const,
          updatedAt: new Date().toISOString(),
          note: 'Order placed successfully.',
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
    } as Order;
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
};

/**
 * একজন নির্দিষ্ট ইউজারের সব অর্ডার পাওয়ার ফাংশন
 */
export const getUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    const q = query(ordersRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Order[];
  } catch (error) {
    console.error("Error fetching user orders:", error);
    throw error;
  }
};

/**
 * আইডি দিয়ে একটি নির্দিষ্ট অর্ডারের বিস্তারিত তথ্য পাওয়ার ফাংশন
 */
export const getOrderById = async (orderId: string): Promise<Order | null> => {
  try {
    const docRef = doc(db, 'orders', orderId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Order;
    }
    return null;
  } catch (error) {
    console.error("Error fetching order by id:", error);
    throw error;
  }
};

/**
 * ইউজার দ্বারা অর্ডার ক্যান্সেল করার ফাংশন
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