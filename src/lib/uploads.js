export const MAX_VIDEO_MINUTES = 15;
export const MAX_VIDEO_SECONDS = MAX_VIDEO_MINUTES * 60;

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export async function imageFileToDataUrl(file) {
  if (!file) return "";
  if (!file.type?.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 3 * 1024 * 1024) throw new Error("Images must be 3 MB or smaller.");
  return readFileAsDataUrl(file);
}

export function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(0);
    if (!file.type?.startsWith("video/")) return reject(new Error("Please choose a video file."));

    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(Number(video.duration || 0));
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the video length. Please choose a different file."));
    };
    video.src = objectUrl;
  });
}

export async function validateVideoFile(file) {
  if (!file) throw new Error("Choose a video file first.");
  const durationSeconds = await getVideoDuration(file);
  if (durationSeconds > MAX_VIDEO_SECONDS) {
    throw new Error(`Videos must be ${MAX_VIDEO_MINUTES} minutes or shorter. Please trim your clip and upload again.`);
  }
  return durationSeconds;
}

export async function documentFileToDataUrl(file, kind = "file") {
  if (!file) return "";
  const allowed = kind === "audio" ? file.type?.startsWith("audio/") : file.type === "application/pdf";
  if (!allowed) throw new Error(kind === "audio" ? "Please choose an audio recording." : "Please choose a PDF file.");
  if (file.size > 3 * 1024 * 1024) throw new Error("Files must be 3 MB or smaller.");
  return readFileAsDataUrl(file);
}
