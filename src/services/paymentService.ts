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
  bkashURL?: string | null;
  message?: string;
}

export interface BkashExecuteResult {
  success: boolean;
  transactionId: string;
  message: string;
}

/**
 * ১. বিকাশ পেমেন্ট শুরু করার ফাংশন (Direct Server-to-Server Create Payment)
 */
export const initiateBkashPayment = async (
  orderNumber: string,
  amount: number
): Promise<BkashInitiateResult> => {
  try {
    const createRes = await fetch('/api/bkash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create-payment',
        amount,
        orderNumber: String(orderNumber).trim(),
      }),
    });

    const createData = await createRes.json();

    if (!createRes.ok || !createData.success || !createData.paymentID) {
      throw new Error(createData.message || 'Failed to initiate bKash payment gateway.');
    }

    return {
      success: true,
      paymentID: createData.paymentID,
      bkashURL: createData.bkashURL || null,
    };
  } catch (error: unknown) {
    console.error('bKash payment initiation error:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      success: false,
      message: err.message || 'Could not connect to bKash gateway.',
    };
  }
};

/**
 * ২. বিকাশ পেমেন্ট ভেরিফাই ও ফাইনাল করার ফাংশন (Execute & Record in Firestore)
 */
export const verifyAndExecuteBkashPayment = async (
  paymentID: string,
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
      }),
    });

    const execData = await execRes.json();

    if (!execRes.ok || !execData.success || !execData.trxID) {
      throw new Error(execData.message || 'bKash payment verification failed or cancelled by user.');
    }

    const trxId = execData.trxID;

    // ফায়ারস্টোরে পেমেন্ট সেভ ও অর্ডারের স্ট্যাটাস 'paid' করা
    await executeBkashPayment(orderId, orderNumber, amount, customerPhone, trxId);

    return {
      success: true,
      transactionId: trxId,
      message: `bKash payment successful! TrxID: ${trxId}`,
    };
  } catch (error: unknown) {
    console.error('bKash payment verification error:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    throw new Error(err.message, { cause: error });
  }
};

/**
 * ৩. ফায়ারস্টোর ডেটাবেসে বিকাশ পেমেন্ট ট্রানজেকশন রেকর্ড ও অর্ডার 'paid' আপডেট
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
  } catch (error: unknown) {
    console.error('bKash payment execution error:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    throw new Error(err.message, { cause: error });
  }
};

/**
 * ৪. নগদ পেমেন্ট রেকর্ড সার্ভিস (ম্যানুয়াল বা গেটওয়ে ট্রানজেকশন)
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
  } catch (error: unknown) {
    console.error('Nagad payment execution error:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    throw new Error(err.message, { cause: error });
  }
};