import { Platform } from 'react-native';
import { File } from 'expo-file-system';

/**
 * Reading a local file, on both platforms.
 *
 * Native goes through expo-file-system's `File`, which streams from disk.
 * `fetch('file://…')` also appears to work in Expo but loads the whole thing
 * through the network stack and falls over on larger files.
 *
 * Web has no such thing as a file path — the camera hands back a `blob:` or
 * `data:` URL — so there it goes through fetch and FileReader, which is the
 * only route the browser offers.
 */

export async function readAsBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read the image.'));
      reader.onload = () => {
        const result = String(reader.result);
        // FileReader gives `data:image/jpeg;base64,XXXX`; only the payload is wanted.
        resolve(result.slice(result.indexOf(',') + 1));
      };
      reader.readAsDataURL(blob);
    });
  }

  return await new File(uri).base64();
}

export async function readAsBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return new Uint8Array(await blob.arrayBuffer());
  }
  return await new File(uri).bytes();
}

/** Size in bytes, or null when it cannot be determined (web blob URLs). */
export async function fileSize(uri: string): Promise<number | null> {
  try {
    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob();
      return blob.size;
    }
    return new File(uri).size ?? null;
  } catch {
    return null;
  }
}

/**
 * base64 → bytes, without assuming a global `atob`.
 *
 * Hermes and the web both happen to provide one today, but this runs on the
 * path that saves a QR image to someone's photos and a silent absence there
 * would look like the save simply not working. Twelve lines is cheaper than
 * finding that out from a customer.
 */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array((clean.length * 3) >> 2);

  let buffer = 0;
  let bits = 0;
  let out = 0;

  for (let i = 0; i < clean.length; i++) {
    buffer = (buffer << 6) | B64.indexOf(clean[i]);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[out++] = (buffer >> bits) & 0xff;
    }
  }
  return bytes.subarray(0, out);
}
