export const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  || "BIdjxl_ZpPEGEfe3itNQoyIYGoYRNHAe_Uf82R-uNK5I136XHEVK_3qPaI6-ODvB7KBhuZdST9abYF13oMMb78g";

export function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}
