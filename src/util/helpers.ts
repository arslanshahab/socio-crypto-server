export const getBase64FileExtension = (image: string) => {
  if (image === '') throw new Error('invalid image uploaded');
  return image.split(':')[1].split(';')[0];
}