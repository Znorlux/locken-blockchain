import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
// import dotenv from 'dotenv';

// Importar funciones de los scripts
// Comentadas temporalmente hasta configurar los ABIs y hardhat correctamente
// import { registerUser } from './services/userService';
// import { depositTokens } from './services/depositService';
// import { transferTokens } from './services/transferService';
// import { withdrawTokens } from './services/withdrawService';
// import { checkBalance } from './services/balanceService';
// import { getFaucetTokens } from './services/faucetService';

// dotenv.config();

// Configurar proveedor de ethers
const RPC_URL = process.env.RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Configurar ethers globalmente para que funcione similar a hardhat
const ethersWithProvider = {
  ...ethers,
  provider,
  getContractAt: async (contractName: string, address: string, signer?: any) => {
    // Esta función necesitará los ABIs de los contratos
    // Por ahora, creamos un placeholder
    throw new Error('getContractAt necesita implementación específica con ABIs');
  },
  getSigners: async () => {
    // Retornar wallets desde private keys
    const privateKeys = [
      process.env.PRIVATE_KEY,
      process.env.PRIVATE_KEY2
    ].filter(Boolean);
    
    return privateKeys.map(pk => new ethers.Wallet(pk!, provider));
  }
};

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===============================
// ENDPOINTS DE AUTENTICACIÓN
// ===============================

/**
 * POST /api/auth/connect
 * Conectar wallet y verificar dirección
 */
app.post('/api/auth/connect', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección de wallet inválida'
      });
    }

    // Verificar balance de gas
    const balance = await provider.getBalance(address);
    const hasGas = balance > ethers.parseEther('0.001');

    res.json({
      success: true,
      data: {
        address,
        balance: ethers.formatEther(balance),
        hasGas,
        network: 'fuji'
      }
    });
  } catch (error) {
    console.error('Error connecting wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ===============================
// ENDPOINTS DE USUARIO
// ===============================

/**
 * POST /api/user/register
 * Registrar usuario en el sistema de tokens cifrados
 */
app.post('/api/user/register', async (req, res) => {
  try {
    const { address, signature, privateKey } = req.body;
    
    // Opción 1: Registro seguro con address + signature (RECOMENDADO)
    if (address && signature) {
      // Verificar que la dirección sea válida
      if (!ethers.isAddress(address)) {
        return res.status(400).json({
          success: false,
          error: 'Dirección inválida'
        });
      }

      // Verificar la firma del mensaje
      const message = `eERC\nRegistering user with\n Address:${address.toLowerCase()}`;
      try {
        const recoveredAddress = ethers.verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
          return res.status(400).json({
            success: false,
            error: 'Firma inválida'
          });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Error verificando firma'
        });
      }

      console.log(`✅ Firma verificada para: ${address}`);
    }
    // Opción 2: Para desarrollo local (NO RECOMENDADO en producción)
    else if (privateKey) {
      console.log('⚠️  ADVERTENCIA: Usando private key directamente (solo desarrollo)');
    }
    else {
      return res.status(400).json({
        success: false,
        error: 'Se requiere address + signature O private key (solo desarrollo)'
      });
    }

    // const result = await registerUser(privateKey, signature);
    
    // Placeholder hasta configurar los servicios completamente
    const finalAddress = address || 'placeholder_address';
    res.json({
      success: true,
      data: {
        userAddress: finalAddress,
        publicKey: ['0', '0'],
        transactionHash: '0x' + 'a'.repeat(64),
        blockNumber: 12345678,
        isAlreadyRegistered: false,
        registrationMethod: address ? 'signature' : 'privateKey',
        note: 'Función en desarrollo. Configurar ABIs de contratos para funcionalidad completa.'
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Error al registrar usuario'
    });
  }
});

/**
 * GET /api/user/status/:address
 * Verificar si un usuario está registrado
 */
app.get('/api/user/status/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección inválida'
      });
    }

    // Leer información de deployment
    const deploymentPath = path.join(__dirname, '../../deployments/latest-fuji.json');
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    // Por ahora, retornamos un placeholder hasta tener los ABIs
    // const registrar = await ethers.getContractAt('Registrar', deploymentData.contracts.registrar);
    // const isRegistered = await registrar.isUserRegistered(address);
    const isRegistered = false; // Placeholder
    
    let publicKey = null;
    if (isRegistered) {
      // publicKey = await registrar.getUserPublicKey(address);
      publicKey = ["0", "0"]; // Placeholder
    }

    res.json({
      success: true,
      data: {
        address,
        isRegistered,
        publicKey: publicKey ? [publicKey[0].toString(), publicKey[1].toString()] : null
      }
    });
  } catch (error) {
    console.error('Error checking user status:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar estado del usuario'
    });
  }
});

// ===============================
// ENDPOINTS DE TOKENS
// ===============================

/**
 * POST /api/tokens/deposit
 * Realizar depósito de tokens regulares a cifrados
 */
app.post('/api/tokens/deposit', async (req, res) => {
  try {
    const { privateKey, amount } = req.body;
    
    if (!privateKey || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Private key y amount requeridos'
      });
    }

    // const result = await depositTokens(privateKey, amount);
    
    // Placeholder para depósito
    res.json({
      success: true,
      data: {
        userAddress: 'placeholder',
        amount: amount,
        transactionHash: '0x' + 'b'.repeat(64),
        blockNumber: 12345679,
        tokenBalance: { before: '100.0', after: '90.0' },
        encryptedBalance: { before: '5.0', after: '15.0' },
        note: 'Función en desarrollo.'
      }
    });
  } catch (error) {
    console.error('Error depositing tokens:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Error al depositar tokens'
    });
  }
});

/**
 * POST /api/tokens/transfer
 * Transferir tokens cifrados entre usuarios
 */
app.post('/api/tokens/transfer', async (req, res) => {
  try {
    const { senderPrivateKey, receiverAddress, amount } = req.body;
    
    if (!senderPrivateKey || !receiverAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Sender private key, receiver address y amount requeridos'
      });
    }

    // const result = await transferTokens(senderPrivateKey, receiverAddress, amount);
    
    // Placeholder para transferencia
    res.json({
      success: true,
      data: {
        senderAddress: 'placeholder_sender',
        receiverAddress: receiverAddress,
        amount: amount,
        transactionHash: '0x' + 'c'.repeat(64),
        blockNumber: 12345680,
        senderBalance: { before: '15.0', after: '10.0' },
        receiverBalance: { before: '2.0', after: '7.0' },
        note: 'Función en desarrollo.'
      }
    });
  } catch (error) {
    console.error('Error transferring tokens:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Error al transferir tokens'
    });
  }
});

/**
 * POST /api/tokens/withdraw
 * Retirar tokens cifrados a regulares
 */
app.post('/api/tokens/withdraw', async (req, res) => {
  try {
    const { privateKey, amount } = req.body;
    
    if (!privateKey || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Private key y amount requeridos'
      });
    }

    // const result = await withdrawTokens(privateKey, amount);
    
    // Placeholder para retiro
    res.json({
      success: true,
      data: {
        userAddress: 'placeholder',
        amount: amount,
        transactionHash: '0x' + 'd'.repeat(64),
        blockNumber: 12345681,
        publicBalance: { before: '89.5', after: '97.5' },
        encryptedBalance: { before: '10.5', after: '2.5' },
        note: 'Función en desarrollo.'
      }
    });
  } catch (error) {
    console.error('Error withdrawing tokens:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Error al retirar tokens'
    });
  }
});

/**
 * GET /api/tokens/balance/:address
 * Consultar balance cifrado de un usuario
 */
app.get('/api/tokens/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { privateKey } = req.query;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección inválida'
      });
    }

    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: 'Private key requerida para descifrar balance'
      });
    }

    // const result = await checkBalance(address, privateKey as string);
    
    // Placeholder para balance
    res.json({
      success: true,
      data: {
        userAddress: address,
        publicBalance: { amount: '97.5', symbol: 'UNI', decimals: 18 },
        encryptedBalance: { amount: '2.5', isDecrypted: true },
        tokenInfo: { address: '0x9ba4d68eE64ce4c17A2d6D1EA073768217340841', name: 'Uniswap', symbol: 'UNI', decimals: 18 },
        note: 'Función en desarrollo.'
      }
    });
  } catch (error) {
    console.error('Error checking balance:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Error al consultar balance'
    });
  }
});

// ===============================
// ENDPOINTS DE FAUCET
// ===============================

/**
 * POST /api/faucet/request
 * Solicitar tokens del faucet
 */
app.post('/api/faucet/request', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección inválida'
      });
    }

    // const result = await getFaucetTokens(address);
    
    // Placeholder para faucet
    res.json({
      success: true,
      data: {
        userAddress: address,
        tokenAddress: '0x9ba4d68eE64ce4c17A2d6D1EA073768217340841',
        amount: '100.0',
        transactionHash: '0x' + 'e'.repeat(64),
        blockNumber: 12345682,
        balance: { before: '0.0', after: '100.0' },
        note: 'Función en desarrollo.'
      }
    });
  } catch (error) {
    console.error('Error requesting faucet tokens:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Error al solicitar tokens del faucet'
    });
  }
});

// ===============================
// ENDPOINTS DE INFORMACIÓN
// ===============================

/**
 * GET /api/info/contracts
 * Obtener información de contratos desplegados
 */
app.get('/api/info/contracts', async (req, res) => {
  try {
    const deploymentPath = path.join(__dirname, '../../deployments/latest-fuji.json');
    
    if (!fs.existsSync(deploymentPath)) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró información de deployment'
      });
    }

    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    res.json({
      success: true,
      data: {
        contracts: deploymentData.contracts,
        metadata: deploymentData.metadata,
        network: deploymentData.network,
        deploymentTimestamp: deploymentData.deploymentTimestamp
      }
    });
  } catch (error) {
    console.error('Error getting contract info:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener información de contratos'
    });
  }
});

/**
 * GET /api/health
 * Health check del servidor
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

// Middleware de manejo de errores
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Locken Blockchain API Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 Endpoints disponibles:`);
  console.log(`   POST /api/auth/connect`);
  console.log(`   POST /api/user/register`);
  console.log(`   GET  /api/user/status/:address`);
  console.log(`   POST /api/tokens/deposit`);
  console.log(`   POST /api/tokens/transfer`);
  console.log(`   POST /api/tokens/withdraw`);
  console.log(`   GET  /api/tokens/balance/:address`);
  console.log(`   POST /api/faucet/request`);
  console.log(`   GET  /api/info/contracts`);
});

export default app;
