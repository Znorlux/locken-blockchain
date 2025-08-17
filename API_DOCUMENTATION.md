# 🚀 Locken Blockchain API Documentation

Esta API REST te permite conectar tu frontend con las funcionalidades de tokens cifrados de Locken Blockchain.

## 📋 Configuración

### 1. Instalar dependencias
```bash
npm install
```

### 2. Iniciar el servidor API
```bash
# Modo desarrollo (con watch)
npm run api:dev

# Modo producción
npm run api:start
```

El servidor se ejecutará en `http://localhost:3001` por defecto.

## 🔗 Endpoints Disponibles

### 🔐 Autenticación

#### `POST /api/auth/connect`
Conectar wallet y verificar dirección.

**Request:**
```json
{
  "address": "0x1234567890123456789012345678901234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x1234567890123456789012345678901234567890",
    "balance": "1.5",
    "hasGas": true,
    "network": "fuji"
  }
}
```

### 👤 Usuario

#### `POST /api/user/register`
Registrar usuario en el sistema de tokens cifrados.

**Request:**
```json
{
  "privateKey": "0x1234567890123456789012345678901234567890123456789012345678901234",
  "signature": "0xabc123..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userAddress": "0x1234567890123456789012345678901234567890",
    "publicKey": ["123456789", "987654321"],
    "transactionHash": "0xabc123...",
    "blockNumber": 123456,
    "isAlreadyRegistered": false
  }
}
```

#### `GET /api/user/status/:address`
Verificar si un usuario está registrado.

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x1234567890123456789012345678901234567890",
    "isRegistered": true,
    "publicKey": ["123456789", "987654321"]
  }
}
```

### 💰 Tokens

#### `POST /api/tokens/deposit`
Realizar depósito de tokens regulares a cifrados.

**Request:**
```json
{
  "privateKey": "0x1234567890123456789012345678901234567890123456789012345678901234",
  "amount": "10.5"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userAddress": "0x1234567890123456789012345678901234567890",
    "amount": "10.5",
    "transactionHash": "0xabc123...",
    "blockNumber": 123456,
    "tokenBalance": {
      "before": "100.0",
      "after": "89.5"
    },
    "encryptedBalance": {
      "before": "5.0",
      "after": "15.5"
    }
  }
}
```

#### `POST /api/tokens/transfer`
Transferir tokens cifrados entre usuarios.

**Request:**
```json
{
  "senderPrivateKey": "0x1234567890123456789012345678901234567890123456789012345678901234",
  "receiverAddress": "0x9876543210987654321098765432109876543210",
  "amount": "5.0"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "senderAddress": "0x1234567890123456789012345678901234567890",
    "receiverAddress": "0x9876543210987654321098765432109876543210",
    "amount": "5.0",
    "transactionHash": "0xabc123...",
    "blockNumber": 123456,
    "senderBalance": {
      "before": "15.5",
      "after": "10.5"
    },
    "receiverBalance": {
      "before": "2.0",
      "after": "7.0"
    }
  }
}
```

#### `POST /api/tokens/withdraw`
Retirar tokens cifrados a regulares.

**Request:**
```json
{
  "privateKey": "0x1234567890123456789012345678901234567890123456789012345678901234",
  "amount": "8.0"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userAddress": "0x1234567890123456789012345678901234567890",
    "amount": "8.0",
    "transactionHash": "0xabc123...",
    "blockNumber": 123456,
    "publicBalance": {
      "before": "89.5",
      "after": "97.5"
    },
    "encryptedBalance": {
      "before": "10.5",
      "after": "2.5"
    }
  }
}
```

#### `GET /api/tokens/balance/:address?privateKey=0x123...`
Consultar balance cifrado de un usuario.

**Response:**
```json
{
  "success": true,
  "data": {
    "userAddress": "0x1234567890123456789012345678901234567890",
    "publicBalance": {
      "amount": "97.5",
      "symbol": "UNI",
      "decimals": 18
    },
    "encryptedBalance": {
      "amount": "2.5",
      "isDecrypted": true
    },
    "tokenInfo": {
      "address": "0x9ba4d68eE64ce4c17A2d6D1EA073768217340841",
      "name": "Uniswap",
      "symbol": "UNI",
      "decimals": 18
    }
  }
}
```

### 🚰 Faucet

#### `POST /api/faucet/request`
Solicitar tokens del faucet.

**Request:**
```json
{
  "address": "0x1234567890123456789012345678901234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userAddress": "0x1234567890123456789012345678901234567890",
    "tokenAddress": "0x9ba4d68eE64ce4c17A2d6D1EA073768217340841",
    "amount": "100.0",
    "transactionHash": "0xabc123...",
    "blockNumber": 123456,
    "balance": {
      "before": "0.0",
      "after": "100.0"
    }
  }
}
```

### ℹ️ Información

#### `GET /api/info/contracts`
Obtener información de contratos desplegados.

**Response:**
```json
{
  "success": true,
  "data": {
    "contracts": {
      "registrar": "0x1234...",
      "encryptedERC": "0x5678...",
      "testERC20": "0x9abc..."
    },
    "metadata": {
      "erc20Name": "Uniswap",
      "erc20Symbol": "UNI",
      "totalSupply": "1000000000.0"
    },
    "network": "fuji",
    "deploymentTimestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### `GET /api/health`
Health check del servidor.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0"
  }
}
```

## 🌐 Integración con Frontend

### Ejemplo con React + Axios

```tsx
// services/api.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// services/blockchain.ts
export class BlockchainService {
  
  // Conectar wallet
  async connectWallet(address: string) {
    const response = await api.post('/auth/connect', { address });
    return response.data;
  }

  // Registrar usuario
  async registerUser(privateKey: string, signature?: string) {
    const response = await api.post('/user/register', {
      privateKey,
      signature
    });
    return response.data;
  }

  // Verificar estado del usuario
  async getUserStatus(address: string) {
    const response = await api.get(`/user/status/${address}`);
    return response.data;
  }

  // Depositar tokens
  async depositTokens(privateKey: string, amount: string) {
    const response = await api.post('/tokens/deposit', {
      privateKey,
      amount
    });
    return response.data;
  }

  // Transferir tokens
  async transferTokens(senderPrivateKey: string, receiverAddress: string, amount: string) {
    const response = await api.post('/tokens/transfer', {
      senderPrivateKey,
      receiverAddress,
      amount
    });
    return response.data;
  }

  // Retirar tokens
  async withdrawTokens(privateKey: string, amount: string) {
    const response = await api.post('/tokens/withdraw', {
      privateKey,
      amount
    });
    return response.data;
  }

  // Consultar balance
  async getBalance(address: string, privateKey: string) {
    const response = await api.get(`/tokens/balance/${address}?privateKey=${privateKey}`);
    return response.data;
  }

  // Solicitar tokens del faucet
  async requestFaucetTokens(address: string) {
    const response = await api.post('/faucet/request', { address });
    return response.data;
  }

  // Obtener información de contratos
  async getContractInfo() {
    const response = await api.get('/info/contracts');
    return response.data;
  }
}

export const blockchainService = new BlockchainService();
```

### Ejemplo de Componente React

```tsx
// components/WalletDashboard.tsx
import React, { useState, useEffect } from 'react';
import { blockchainService } from '../services/blockchain';

export const WalletDashboard: React.FC = () => {
  const [address, setAddress] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    try {
      setLoading(true);
      // Aquí conectarías con MetaMask o tu wallet preferido
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const userAddress = accounts[0];
      
      // Verificar conexión con la API
      const result = await blockchainService.connectWallet(userAddress);
      setAddress(userAddress);
      
      // Verificar si está registrado
      const status = await blockchainService.getUserStatus(userAddress);
      setIsRegistered(status.data.isRegistered);
      
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async () => {
    try {
      setLoading(true);
      // Obtener private key (esto deberías manejarlo de forma segura)
      const privateKey = 'tu_private_key_aqui';
      
      const result = await blockchainService.registerUser(privateKey);
      setIsRegistered(true);
      
    } catch (error) {
      console.error('Error registering user:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBalance = async () => {
    try {
      setLoading(true);
      const privateKey = 'tu_private_key_aqui';
      
      const result = await blockchainService.getBalance(address, privateKey);
      setBalance(result.data);
      
    } catch (error) {
      console.error('Error getting balance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Locken Blockchain Dashboard</h1>
      
      {!address ? (
        <button 
          onClick={connectWallet}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {loading ? 'Conectando...' : 'Conectar Wallet'}
        </button>
      ) : (
        <div>
          <p className="mb-2">Wallet: {address}</p>
          <p className="mb-4">
            Estado: {isRegistered ? '✅ Registrado' : '❌ No registrado'}
          </p>
          
          {!isRegistered && (
            <button 
              onClick={registerUser}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded mr-2"
            >
              {loading ? 'Registrando...' : 'Registrar Usuario'}
            </button>
          )}
          
          {isRegistered && (
            <button 
              onClick={getBalance}
              disabled={loading}
              className="bg-purple-500 text-white px-4 py-2 rounded"
            >
              {loading ? 'Consultando...' : 'Ver Balance'}
            </button>
          )}
          
          {balance && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h3 className="font-bold">Balance:</h3>
              <p>Público: {balance.publicBalance.amount} {balance.publicBalance.symbol}</p>
              <p>Cifrado: {balance.encryptedBalance.amount} tokens</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

## 🔧 Variables de Entorno

Crear archivo `.env`:

```bash
# Puerto del servidor API
API_PORT=3001

# Red de Hardhat
HARDHAT_NETWORK=fuji

# Private keys (para operaciones del servidor)
PRIVATE_KEY=tu_private_key_aqui
PRIVATE_KEY2=tu_segunda_private_key_aqui

# CORS configuration
CORS_ORIGIN=http://localhost:3000
```

## 🚀 Comandos de Ejecución

```bash
# Instalar dependencias
npm install

# Ejecutar contratos deployment (prerequisito)
npm run deploy:basic
npm run deploy:converter

# Iniciar API en desarrollo
npm run api:dev

# Iniciar API en producción
npm run api:start

# Compilar TypeScript
npm run build

# Ejecutar compilado
npm start
```

## 🛡️ Seguridad

### ⚠️ Consideraciones Importantes:

1. **Private Keys**: Nunca envíes private keys en texto plano en producción
2. **CORS**: Configura CORS apropiadamente para tu dominio
3. **Rate Limiting**: Considera implementar rate limiting
4. **Validación**: Valida todos los inputs del usuario
5. **HTTPS**: Usa HTTPS en producción
6. **Logs**: No loggees información sensible

### 🔐 Mejores Prácticas:

- Usa variables de entorno para configuración sensible
- Implementa autenticación JWT si es necesario
- Valida direcciones Ethereum antes de procesar
- Maneja errores de forma consistente
- Usa bibliotecas de validación como Joi o Zod

## 📝 Notas

- Esta API está optimizada para la red Fuji testnet
- Los ejemplos usan placeholders para algunas funcionalidades ZK que requieren implementación específica
- Para producción, considera usar un gestor de procesos como PM2
- Los balances cifrados requieren la implementación completa de descifrado según tu sistema ZK

¡Tu frontend ahora puede conectarse fácilmente con Locken Blockchain! 🎉
