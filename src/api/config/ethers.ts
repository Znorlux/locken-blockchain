import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

// Configurar proveedor de ethers
const RPC_URL = process.env.RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
export const provider = new ethers.JsonRpcProvider(RPC_URL);

// Configurar ethers con provider
export const ethersWithProvider = {
  ...ethers,
  provider,
  isAddress: ethers.isAddress,
  parseEther: ethers.parseEther,
  formatEther: ethers.formatEther,
  parseUnits: ethers.parseUnits,
  formatUnits: ethers.formatUnits,
  Wallet: ethers.Wallet,
  JsonRpcProvider: ethers.JsonRpcProvider
};

// Función para obtener signers desde variables de entorno
export const getSigners = async () => {
  const privateKeys = [
    process.env.PRIVATE_KEY,
    process.env.PRIVATE_KEY2
  ].filter(Boolean);
  
  return privateKeys.map(pk => new ethers.Wallet(pk!, provider));
};

export default ethersWithProvider;
