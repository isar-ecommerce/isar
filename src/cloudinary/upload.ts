/**
 * যেকোনো সাইজের (খাড়া, আড়াআড়ি বা বড়) ছবিকে স্বয়ংক্রিয়ভাবে ১:১ স্কয়ার (1000x1000px Ultra-HD)
 * পারফেক্ট ফ্রেমে সেন্টারিং ও ক্রিস্টাল ক্লিয়ার কোয়ালিটিতে কনভার্ট করার ইঞ্জিন
 */
const frameImageToSquareHD = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const targetSize = 1000; // স্ট্যান্ডার্ড ১:১ স্কয়ার (Ultra-HD 1000x1000)
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // ১. ব্যাকগ্রাউন্ডে পরিচ্ছন্ন সাদা ক্যানভাস তৈরি করা
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetSize, targetSize);

        // ২. অরিজিনাল রেশিও বজায় রেখে সেন্টারিং ও স্কেলিং হিসাব করা
        const scale = Math.min(targetSize / img.width, targetSize / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const offsetX = (targetSize - drawWidth) / 2;
        const offsetY = (targetSize - drawHeight) / 2;

        // ৩. হাই-কোয়ালিটি স্মুথিং ফিল্টার এনাবল করা
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // ৪. সেন্টারে ছবিটি নিখুঁতভাবে বসানো (কোনো বিকৃতি ছাড়া)
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        // ৫. ০.৯৫ হাই-ডেফিনিশন কোয়ালিটিতে ডেটা রিটার্ন
        const framedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(framedDataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Cloudinary এবং ১:১ স্কয়ার অটো-ফ্রেমড ইমেজ আপলোড ইঞ্জিন
 */
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // ১. ছবিকে আগে ১:১ স্কয়ার আল্ট্রা-এইচডি ফ্রেমে প্রসেস করা
  const framedImageDataUrl = await frameImageToSquareHD(file);

  // ২. যদি ক্লাউডিনারি ক্রেডেনশিয়াল থাকে, তবে ক্লাউডিনারি ক্লাউডে আপলোড করবে
  if (cloudName && uploadPreset && uploadPreset !== 'demo' && cloudName !== 'demo') {
    try {
      const formData = new FormData();
      formData.append('file', framedImageDataUrl);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'isar_products');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.secure_url;
      }
    } catch (apiError) {
      console.warn('Cloudinary upload warning, using 1:1 HD fallback:', apiError);
    }
  }

  // ৩. ফলব্যাক হিসেবে ১:১ স্কয়ার আল্ট্রা-এইচডি ইমেজ রিটার্ন করবে
  return framedImageDataUrl;
};