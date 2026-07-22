import client from "./client.js";

/** Telecharge un fichier protege par JWT (l'API ne peut pas etre appelee
 * via un simple lien <a href> puisqu'il faut l'en-tete Authorization). */
export async function downloadFile(url, filename) {
  const response = await client.get(url, { responseType: "blob" });
  const objectUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}
