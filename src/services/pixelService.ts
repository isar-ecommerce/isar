declare global {
  interface Window {
    fbq?: (action: string, eventName: string, params?: Record<string, unknown>) => void;
  }
}

export interface TrackMetaParams {
  currency?: string;
  value?: number;
  orderNumber?: string;
  contentName?: string;
  phone?: string;
  email?: string;
}

/**
 * ফেসবুক ও ইনস্টাগ্রাম ব্রাউজার পিক্সেল + সার্ভারলেস CAPI ওয়ান-ট্যাপ ট্র্যাকার
 */
export const trackMetaEvent = async (
  eventName: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase',
  params?: TrackMetaParams
): Promise<void> => {
  try {
    // ১. ব্রাউজার পিক্সেল (যদি ব্রাউজারে মেটা স্ক্রিপ্ট লোড থাকে)
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', eventName, {
        currency: params?.currency || 'BDT',
        value: params?.value || 0,
        content_name: params?.contentName,
      });
    }

    // ২. সার্ভারলেস কনভার্সন এপিআই (iOS 14+ ও অ্যাড-ব্লকার বাইপাস)
    await fetch('/api/pixel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName,
        eventSourceUrl: typeof window !== 'undefined' ? window.location.href : '',
        userData: {
          phone: params?.phone,
          email: params?.email,
        },
        customData: {
          currency: params?.currency || 'BDT',
          value: params?.value || 0,
          orderNumber: params?.orderNumber,
          contentName: params?.contentName,
        },
      }),
    }).catch(() => {});
  } catch (err) {
    console.warn('Pixel tracking note:', err);
  }
};