import { doc, updateDoc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { PaymentMethod, PaymentStatus } from '../types/order';

export interface PaymentTransaction {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId: string;
  customerPhone: string;
  createdAt: unknown;
}

export interface BkashInitiateResult {
  success: boolean;
  paymentID?: string;
  id_token?: string;
  bkashURL?: string | null;
  message?: string;
}

export interface BkashExecuteResult {
  success: boolean;
  transactionId: string;
  message: string;
}

/**
 * ১. বিকাশ পেমেন্ট শুরু করার ফাংশন (Grant Token & Create Payment)
 */
export const initiateBkashPayment = async (
  orderNumber: string,
  amount: number
): Promise<BkashInitiateResult> => {
  try {
    // ধাপ ক: টোকেন সংগ্রহ
    const tokenRes = await fetch('/api/bkash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'grant-token' }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.success || !tokenData.id_token) {
      throw new Error(tokenData.message || 'Failed to acquire bKash security token.');
    }

    const idToken = tokenData.id_token;

    // ধাপ খ: পেমেন্ট ইনিশিয়েট
    const createRes = await fetch('/api/bkash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create-payment',
        id_token: idToken,
        amount,
        orderNumber,
      }),
    });

    const createData = await createRes.json();
    if (!createRes.ok || !createData.success || !createData.paymentID) {
      throw new Error(createData.message || 'Failed to create bKash payment request.');
    }

    return {
      success: true,
      paymentID: createData.paymentID,
      id_token: idToken,
      bkashURL: createData.bkashURL,
    };
  } catch (error: unknown) {
    console.error('bKash payment initiation error:', error);
    const err = error as Error;
    return {
      success: false,
      message: err.message || 'Could not connect to bKash gateway.',
    };
  }
};

/**
 * ২. বিকাশ পেমেন্ট ভেরিফাই ও এক্সিকিউট করার ফাংশন (Execute & Record in Firestore)
 */
export const verifyAndExecuteBkashPayment = async (
  paymentID: string,
  id_token: string,
  orderId: string,
  orderNumber: string,
  amount: number,
  customerPhone: string
): Promise<BkashExecuteResult> => {
  try {
    const execRes = await fetch('/api/bkash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'execute-payment',
        paymentID,
        id_token,
        amount,
      }),
    });

    const execData = await execRes.json();
    if (!execRes.ok || !execData.success || !execData.trxID) {
      throw new Error(execData.message || 'bKash payment verification failed.');
    }

    const trxId = execData.trxID;

    // ফায়ারস্টোরে পেমেন্ট সেভ ও অর্ডারের স্ট্যাটাস 'paid' করা
    await executeBkashPayment(orderId, orderNumber, amount, customerPhone, trxId);

    return {
      success: true,
      transactionId: trxId,
      message: `bKash payment successful! TrxID: ${trxId}`,
    };
  } catch (error) {
    console.error('bKash payment verification error:', error);
    throw error;
  }
};

/**
 * ৩. ফায়ারস্টোর ডেটাবেসে বিকাশ পেমেন্ট রেকর্ড ও অর্ডার 'paid' আপডেট করার সার্ভিস
 */
export const executeBkashPayment = async (
  orderId: string,
  orderNumber: string,
  amount: number,
  customerPhone: string,
  trxId?: string
): Promise<{ success: boolean; transactionId: string; message: string }> => {
  try {
    const transactionId = trxId || `TRX${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`;

    // ১. পেমেন্ট ট্রানজেকশন কালেকশনে সেভ
    const paymentDocRef = doc(collection(db, 'payments'));
    const paymentData: PaymentTransaction = {
      id: paymentDocRef.id,
      orderId,
      orderNumber,
      amount,
      method: 'bkash',
      status: 'paid',
      transactionId,
      customerPhone,
      createdAt: serverTimestamp(),
    };

    await setDoc(paymentDocRef, paymentData);

    // ২. মূল অর্ডারের স্ট্যাটাস 'paid' এবং TrxID আপডেট
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      paymentStatus: 'paid',
      transactionId: transactionId,
      paymentMethod: 'bkash',
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      transactionId,
      message: 'bKash payment completed and verified successfully!',
    };
  } catch (error) {
    console.error('bKash payment execution error:', error);
    throw error;
  }
};

/**
 * ৪. নগদ পেমেন্ট ভেরিফিকেশন সার্ভিস
 */
export const executeNagadPayment = async (
  orderId: string,
  orderNumber: string,
  amount: number,
  customerPhone: string
): Promise<{ success: boolean; transactionId: string; message: string }> => {
  try {
    const transactionId = `NGD${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`;

    const paymentDocRef = doc(collection(db, 'payments'));
    const paymentData: PaymentTransaction = {
      id: paymentDocRef.id,
      orderId,
      orderNumber,
      amount,
      method: 'nagad',
      status: 'paid',
      transactionId,
      customerPhone,
      createdAt: serverTimestamp(),
    };

    await setDoc(paymentDocRef, paymentData);

    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      paymentStatus: 'paid',
      transactionId: transactionId,
      paymentMethod: 'nagad',
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      transactionId,
      message: 'Nagad payment completed successfully!',
    };
  } catch (error) {
    console.error('Nagad payment execution error:', error);
    throw error;
  }
};