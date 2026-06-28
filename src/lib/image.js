// Compression d'image côté client (avant envoi à l'assistant vision).
// Réduit à `max` px sur le plus grand côté, ré-encode en JPEG → { dataUrl, base64 }.
// base64 = sans le préfixe data: (format attendu par l'API Claude / la function).
export async function compressImage(file, max = 1024, quality = 0.72) {
  const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL("image/jpeg", quality);
  return { dataUrl: out, base64: out.split(",")[1], mediaType: "image/jpeg" };
}
