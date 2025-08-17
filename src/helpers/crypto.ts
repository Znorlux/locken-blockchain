import { keccak256, toUtf8Bytes } from "ethers";

/**
 * Función i0 para derivar private key desde signature
 * Basada en la implementación de tus scripts originales
 */
export function i0(signature: string): bigint {
  try {
    // Convertir signature a bytes y aplicar keccak256
    const signatureBytes = toUtf8Bytes(signature);
    const hash = keccak256(signatureBytes);
    
    // Convertir hash a bigint
    const privateKey = BigInt(hash);
    
    return privateKey;
  } catch (error) {
    throw new Error(`Error en i0: ${error.message}`);
  }
}

/**
 * Función para validar firma
 */
export function validateSignature(signature: string): boolean {
  return signature && signature.length >= 64;
}

/**
 * Función para generar mensaje de firma estándar
 */
export function generateSignatureMessage(address: string): string {
  return `eERC\nRegistering user with\n Address:${address.toLowerCase()}`;
}
