import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Configurar proveedor de ethers
const RPC_URL = process.env.RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
const provider = new ethers.JsonRpcProvider(RPC_URL);

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
// ENDPOINTS BÁSICOS
// ===============================

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
      version: '1.0.0',
      network: 'fuji'
    }
  });
});

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
 * GET /api/user/status/:address
 * Verificar si un usuario está registrado (versión simplificada)
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

    // Por ahora, retornamos datos de ejemplo
    // En el futuro, aquí conectarías con el contrato Registrar
    res.json({
      success: true,
      data: {
        address,
        isRegistered: false, // Placeholder
        publicKey: null,
        note: 'Esta es una respuesta de ejemplo. Necesita implementación completa con ABIs de contratos.'
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

/**
 * POST /api/tokens/simulate-deposit
 * Simular depósito (endpoint de ejemplo)
 */
app.post('/api/tokens/simulate-deposit', async (req, res) => {
  try {
    const { address, amount } = req.body;
    
    if (!address || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Address y amount requeridos'
      });
    }

    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Dirección inválida'
      });
    }

    // Simular respuesta de depósito
    res.json({
      success: true,
      data: {
        userAddress: address,
        amount: amount,
        transactionHash: '0x' + 'a'.repeat(64), // Hash simulado
        blockNumber: 12345678,
        note: 'Esta es una simulación. La implementación real requiere contratos desplegados.'
      }
    });
  } catch (error) {
    console.error('Error simulating deposit:', error);
    res.status(500).json({
      success: false,
      error: 'Error al simular depósito'
    });
  }
});

/**
 * GET /api/network/info
 * Información de la red
 */
app.get('/api/network/info', async (req, res) => {
  try {
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    
    res.json({
      success: true,
      data: {
        chainId: network.chainId.toString(),
        name: network.name,
        blockNumber: blockNumber,
        rpcUrl: RPC_URL
      }
    });
  } catch (error) {
    console.error('Error getting network info:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener información de red'
    });
  }
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
  console.log(`🚀 Locken Blockchain API Server (Simple) running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 Endpoints disponibles:`);
  console.log(`   GET  /api/health`);
  console.log(`   POST /api/auth/connect`);
  console.log(`   GET  /api/user/status/:address`);
  console.log(`   GET  /api/info/contracts`);
  console.log(`   POST /api/tokens/simulate-deposit`);
  console.log(`   GET  /api/network/info`);
  console.log(`\n💡 Este es un servidor simplificado para empezar.`);
  console.log(`   Para funcionalidad completa, configura los ABIs de contratos.`);
});

export default app;
