import { BigNumberish, shortString } from "starknet";

export const stringToFelt = (v: string): BigNumberish =>
  v ? shortString.encodeShortString(v) : "0x0";

export const feltToString = (v: BigNumberish): string => {
  return BigInt(v) > 0n ? shortString.decodeShortString(bigintToHex(v)) : "";
};

export const bigintToHex = (v: BigNumberish): `0x${string}` =>
  !v ? "0x0" : `0x${BigInt(v).toString(16)}`;

export function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}

export function ellipseAddress(address: string, start: number, end: number) {
  return `${address.slice(0, start)}...${address.slice(-end)}`.toUpperCase();
}

export const getShortNamespace = (namespace: string) => {
  let parts = namespace.split('_');
  let short = parts[0] + parts.slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  return short;
}

export function getMenuLeftOffset() {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const windowAspect = windowWidth / windowHeight;
  const imageAspect = 16 / 9;

  let imageWidth, imageHeight, leftOffset;
  if (windowAspect > imageAspect) {
    // Window is wider than 16:9
    imageHeight = windowHeight;
    imageWidth = imageHeight * imageAspect;
    leftOffset = (windowWidth - imageWidth) / 2;
  } else {
    // Window is taller than 16:9
    imageWidth = windowWidth;
    imageHeight = imageWidth / imageAspect;
    leftOffset = 0;
  }
  return leftOffset;
}

export function beastNameSize(name: string) {
  if (name.length > 30) {
    return '12px';
  } else if (name.length > 28) {
    return '13px';
  } else if (name.length > 26) {
    return '14px';
  } else if (name.length > 24) {
    return '15px';
  } else {
    return '16px';
  }
}

export function decodeHexByteArray(byteArray: string[]): string {
  // Skip the first byte if it's a length prefix (like 0x1a6)
  // Start from index 1 to get the actual data
  const dataBytes = byteArray.slice(1);
  
  // Convert hex byte array to string
  const hexString = dataBytes.map((byte: string) => {
    // Remove '0x' prefix and ensure 2 characters
    const cleanByte = byte.replace('0x', '').padStart(2, '0');
    return cleanByte;
  }).join('');
  
  // Convert hex to string using browser-compatible method
  const decodedString = hexString.match(/.{1,2}/g)?.map((byte: string) => 
    String.fromCharCode(parseInt(byte, 16))
  ).join('') || '';
  
  return decodedString;
}

export function extractImageFromTokenURI(tokenURI: string): string | null {
  try {
    // Check if it's a data URI
    if (tokenURI.startsWith('data:application/json;base64,')) {
      // Extract the base64 part
      const base64Data = tokenURI.replace('data:application/json;base64,', '');
      
      // Clean the base64 string - remove any invalid characters
      const cleanBase64 = base64Data.replace(/[^A-Za-z0-9+/=]/g, '');
      
      // Add padding if needed
      const paddedBase64 = cleanBase64 + '='.repeat((4 - cleanBase64.length % 4) % 4);
      
      // Decode base64 to string
      const jsonString = atob(paddedBase64);
      // Parse the JSON
      const metadata = JSON.parse(jsonString);
      // Return the image field
      return metadata.image || null;
    }
    return tokenURI; // Return as-is if not a data URI
  } catch (error) {
    console.error('Error extracting image from token URI:', error);
    return null;
  }
}