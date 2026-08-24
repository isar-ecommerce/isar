/**
 * আসল ক্যামেরার ছবিকে ১০০% লসলেস (Lossless Original Quality) ডেটা ফরম্যাটে পড়ার ফাংশন
 * (কোনো প্রকার ব্লার বা পিক্সেল ড্রপ ছাড়াই ক্রিস্টাল ক্লিয়ার কোয়ালিটি নিশ্চিত করে)
 */
const readOriginalFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read original image file'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Cloudinary এবং ফুল-রেজোলিউশন অরিজিনাল ইমেজ আপলোড ইঞ্জিন
 */
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // ১. যদি ক্লাউডিনারি ক্রেডেনশিয়াল কনফিগার করা থাকে, তবে ক্লাউডিনারি ক্লাউডে ডিরেক্ট ফুল-কোয়ালিটি আপলোড করবে
  if (cloudName && uploadPreset && uploadPreset !== 'demo' && cloudName !== 'demo') {
    try {
      const formData = new FormData();
      formData.append('file', file);
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
      console.warn('Cloudinary direct upload warning, using lossless original fallback:', apiError);
    }
  }

  // ২. ক্লাউডিনারি প্রি-সেট ছাড়া টেস্ট করার সময় সম্পূর্ণ ১০০% অরিজিনাল ক্যামেরা শার্প ইমেজ রিটার্ন করবে
  return await readOriginalFileAsDataUrl(file);
};