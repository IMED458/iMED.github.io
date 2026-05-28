const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const cloudinaryEnabled = Boolean(cloudName && uploadPreset);

export async function uploadImageDataUrlToCloudinary(dataUrl: string, folder = 'gbmn-manuscripts') {
  if (!cloudinaryEnabled || !dataUrl.startsWith('data:image/')) return dataUrl;
  const form = new FormData();
  form.append('file', dataUrl);
  form.append('upload_preset', uploadPreset);
  form.append('folder', folder);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) throw new Error('Cloudinary image upload failed.');
  const data = await response.json();
  return data.secure_url as string;
}
