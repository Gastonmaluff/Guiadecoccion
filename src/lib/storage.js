import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";
import { slugify } from "./utils";

function safeFileName(file) {
  const name = file?.name || "imagen";
  const extension = name.includes(".") ? name.split(".").pop() : "jpg";
  const base = slugify(name.replace(/\.[^.]+$/, "")) || "evidencia";
  return `${base}.${extension}`;
}

export async function uploadLotStepPhotos({ lotId, stepId, files, userId }) {
  const uploads = [];

  for (const file of files) {
    const fileName = `${Date.now()}-${safeFileName(file)}`;
    const path = `lots/${lotId}/steps/${stepId}/${userId}-${fileName}`;
    const storageRef = ref(storage, path);
    const result = await uploadBytes(storageRef, file, {
      contentType: file.type || "image/jpeg",
    });
    const downloadUrl = await getDownloadURL(result.ref);

    uploads.push({
      name: file.name,
      path,
      downloadUrl,
      uploadedAt: new Date().toISOString(),
      size: file.size || 0,
      type: file.type || "image/jpeg",
    });
  }

  return uploads;
}

export async function uploadRecipeReferencePhoto({ recipeId, stepId, file }) {
  const fileName = `${Date.now()}-${safeFileName(file)}`;
  const path = `recipes/${recipeId}/reference/${stepId}/${fileName}`;
  const storageRef = ref(storage, path);
  const result = await uploadBytes(storageRef, file, {
    contentType: file.type || "image/jpeg",
  });
  const downloadUrl = await getDownloadURL(result.ref);

  return { path, downloadUrl, name: file.name };
}
