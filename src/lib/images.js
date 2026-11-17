import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const uploadDirectory = path.resolve(process.env.PC_PARTS_UPLOAD_DIR || path.join(projectDirectory, 'uploads'));
const managedImagePattern = /^[a-f\d]{32}\.(?:png|jpe?g|webp)$/i;
const declaredTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

function detectImage(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { mime: 'image/png', extension: '.png' };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', extension: '.jpg' };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { mime: 'image/webp', extension: '.webp' };
  }
  return null;
}

const storage = multer.diskStorage({
  destination: async (_req, _file, callback) => {
    try {
      await fs.mkdir(uploadDirectory, { recursive: true });
      callback(null, uploadDirectory);
    } catch (error) {
      callback(error);
    }
  },
  filename: (_req, _file, callback) => callback(null, randomBytes(16).toString('hex'))
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!declaredTypes.has(file.mimetype)) return callback(new Error('Choose a PNG, JPEG, or WebP image.'));
    callback(null, true);
  }
});

export async function removeUploadedFile(file) {
  if (!file?.path) return;
  try {
    const resolved = path.resolve(file.path);
    if (path.dirname(resolved) === uploadDirectory) await fs.unlink(resolved);
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Could not remove an unused uploaded image:', error.message);
  }
}

export function receiveImage(req, res, next) {
  upload.single('image')(req, res, async error => {
    if (error) return next(error);
    if (!req.file) return next();
    try {
      const content = await fs.readFile(req.file.path);
      const detected = detectImage(content);
      if (!detected || detected.mime !== req.file.mimetype) {
        await removeUploadedFile(req.file);
        const invalidImage = new Error('The uploaded content is not a supported image.');
        invalidImage.code = 'INVALID_IMAGE_CONTENT';
        return next(invalidImage);
      }
      const finalName = `${req.file.filename}${detected.extension}`;
      const finalPath = path.join(uploadDirectory, finalName);
      await fs.rename(req.file.path, finalPath);
      req.file.filename = finalName;
      req.file.path = finalPath;
      return next();
    } catch (validationError) {
      await removeUploadedFile(req.file);
      return next(validationError);
    }
  });
}

export function imageSource(value) {
  if (typeof value !== 'string' || !value.trim()) return '/images/image-unavailable.svg';
  const image = value.trim();
  if (managedImagePattern.test(image)) return `/uploads/${image}`;
  if (image.startsWith('images/')) {
    const segments = image.split('/');
    if (segments.some(segment => !segment || segment === '.' || segment === '..')) return '/images/image-unavailable.svg';
    return `/${segments.map(encodeURIComponent).join('/')}`;
  }
  try {
    const url = new URL(image);
    if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return url.toString();
  } catch {}
  return '/images/image-unavailable.svg';
}

export function isManagedImage(value) {
  return typeof value === 'string' && managedImagePattern.test(value);
}

export async function removeImageIfUnused(collections, filename) {
  if (!isManagedImage(filename)) return;
  try {
    const [computers, components] = await Promise.all([
      collections.computers.countDocuments({ image: filename }),
      collections.components.countDocuments({ image: filename })
    ]);
    if (computers + components !== 0) return;
    await removeUploadedFile({ path: path.join(uploadDirectory, filename) });
  } catch (error) {
    console.error('Could not verify whether an uploaded image is still referenced; leaving it in place:', error.message);
  }
}

export async function discardUploadedImageIfUnreferenced(collections, file) {
  if (!file || !isManagedImage(file.filename)) return removeUploadedFile(file);
  try {
    const [computers, components] = await Promise.all([
      collections.computers.countDocuments({ image: file.filename }),
      collections.components.countDocuments({ image: file.filename })
    ]);
    if (computers + components === 0) await removeUploadedFile(file);
  } catch (error) {
    console.error('Could not verify whether an uploaded image was saved; leaving it in place:', error.message);
  }
}

export function serveUploadedImage(req, res, next) {
  const { filename } = req.params;
  if (!isManagedImage(filename)) return res.status(404).end();
  res.set('X-Content-Type-Options', 'nosniff');
  res.sendFile(filename, { root: uploadDirectory }, error => {
    if (error && !res.headersSent) next(error.status === 404 ? undefined : error);
  });
}

export function uploadErrorMessage(error) {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return 'Image files must be 5 MB or smaller.';
  if (error instanceof multer.MulterError) return 'The image could not be uploaded. Please select one image file.';
  if (error?.code === 'INVALID_IMAGE_CONTENT') return error.message;
  if (error) return 'The request could not be processed.';
  return 'The image upload failed.';
}

export function isImageUploadError(error) {
  return error instanceof multer.MulterError || error?.code === 'INVALID_IMAGE_CONTENT' || /Choose a PNG, JPEG, or WebP image\./.test(error?.message || '');
}
