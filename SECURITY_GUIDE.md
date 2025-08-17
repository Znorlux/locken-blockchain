# 🔐 Guía de Seguridad - Manejo de Private Keys

Esta guía explica cómo manejar private keys de forma segura en tu aplicación Locken Blockchain.

## ⚠️ **REGLA DE ORO: NUNCA ENVIAR PRIVATE KEYS AL SERVIDOR**

### ❌ **LO QUE NO DEBES HACER:**

```javascript
// ❌ PELIGROSO - NO HACER ESTO
fetch('/api/user/register', {
  method: 'POST',
  body: JSON.stringify({
    privateKey: '0x1234567890...' // ❌ NUNCA enviar private key
  })
});
```

### ✅ **LO QUE SÍ DEBES HACER:**

```javascript
// ✅ SEGURO - Enviar solo firma
const message = "eERC\nRegistering user with\n Address:" + address.toLowerCase();
const signature = await wallet.signMessage(message);

fetch('/api/user/register', {
  method: 'POST',
  body: JSON.stringify({
    address: address,     // ✅ Dirección pública (seguro)
    signature: signature  // ✅ Firma del mensaje (seguro)
  })
});
```

## 🛡️ **Métodos Seguros por Caso de Uso**

### **1. Aplicación Web (Frontend) - MetaMask**

```javascript
class SecureWalletService {
  async connectWallet() {
    // Conectar MetaMask
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    return accounts[0];
  }

  async registerUser(address) {
    // Crear mensaje estándar
    const message = `eERC\nRegistering user with\n Address:${address.toLowerCase()}`;
    
    // Firmar con MetaMask (NO expone private key)
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, address]
    });

    // Enviar solo datos públicos
    const response = await fetch('/api/user/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, signature })
    });

    return await response.json();
  }

  async depositTokens(address, amount) {
    // El servidor prepara la transacción
    const txData = await this.prepareTxData('deposit', { address, amount });
    
    // MetaMask firma la transacción
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [txData.transaction]
    });

    // Confirmar al servidor
    return await this.confirmTransaction(txHash);
  }
}
```

### **2. Aplicación Mobile - WalletConnect**

```javascript
import WalletConnect from "@walletconnect/client";

class MobileWalletService {
  constructor() {
    this.connector = new WalletConnect({
      bridge: "https://bridge.walletconnect.org",
    });
  }

  async connectWallet() {
    if (!this.connector.connected) {
      await this.connector.createSession();
    }
    return this.connector.accounts[0];
  }

  async signMessage(message) {
    const msgParams = [
      this.connector.accounts[0],
      message
    ];

    const signature = await this.connector.signPersonalMessage(msgParams);
    return signature;
  }
}
```

### **3. Aplicación de Escritorio - Ethers.js Local**

```javascript
import { ethers } from 'ethers';

class DesktopWalletService {
  constructor() {
    this.wallet = null;
  }

  // Cargar wallet desde archivo cifrado
  async loadEncryptedWallet(keystoreFile, password) {
    this.wallet = await ethers.Wallet.fromEncryptedJson(keystoreFile, password);
    return this.wallet.address;
  }

  // Crear wallet nuevo y guardar cifrado
  async createWallet(password) {
    this.wallet = ethers.Wallet.createRandom();
    const encryptedJson = await this.wallet.encrypt(password);
    
    // Guardar archivo cifrado localmente
    await this.saveToFile('wallet.json', encryptedJson);
    
    return {
      address: this.wallet.address,
      mnemonic: this.wallet.mnemonic // Para backup
    };
  }

  async registerUser() {
    const address = this.wallet.address;
    const message = `eERC\nRegistering user with\n Address:${address.toLowerCase()}`;
    const signature = await this.wallet.signMessage(message);

    return await this.apiCall('/user/register', { address, signature });
  }
}
```

### **4. Servidor Backend - Wallet Manejado por Servidor**

```javascript
// Solo para casos específicos: bots, servicios automatizados, etc.
class ServerWalletService {
  constructor() {
    // Private keys cifradas en variables de entorno
    this.encryptedKeys = process.env.ENCRYPTED_WALLET_KEYS;
    this.password = process.env.WALLET_PASSWORD;
  }

  async loadServerWallet(walletId) {
    // Descifrar wallet solo en memoria
    const decryptedKey = await this.decrypt(this.encryptedKeys[walletId]);
    const wallet = new ethers.Wallet(decryptedKey);
    
    // NO almacenar private key descifrada
    return {
      sign: (message) => wallet.signMessage(message),
      address: wallet.address
    };
  }

  async performAutomatedOperation(walletId, operation) {
    const wallet = await this.loadServerWallet(walletId);
    
    // Realizar operación
    const result = await this.executeOperation(wallet, operation);
    
    // Limpiar wallet de memoria
    wallet = null;
    
    return result;
  }
}
```

## 🏗️ **Arquitectura Recomendada**

### **Frontend → Servidor → Blockchain**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │    Servidor     │    │   Blockchain    │
│                 │    │                 │    │                 │
│ 1. Genera firma │───▶│ 2. Verifica     │───▶│ 3. Ejecuta TX   │
│ 2. Envía firma  │    │    firma        │    │                 │
│ 3. NO private   │    │ 4. Prepara TX   │    │                 │
│    key          │    │ 5. NO private   │    │                 │
│                 │    │    key          │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Flujo de Registro Seguro:**

1. **Frontend**: Usuario conecta wallet (MetaMask, WalletConnect)
2. **Frontend**: Genera mensaje estándar para firmar
3. **Frontend**: Wallet firma mensaje (sin exponer private key)
4. **Frontend**: Envía `address` + `signature` al servidor
5. **Servidor**: Verifica que la firma corresponda a la dirección
6. **Servidor**: Procesa registro usando datos públicos
7. **Blockchain**: Ejecuta transacción si es necesario

## 📱 **Ejemplos por Plataforma**

### **React/Next.js**

```jsx
import { useState } from 'react';
import { ethers } from 'ethers';

function WalletConnect() {
  const [account, setAccount] = useState(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      setAccount(accounts[0]);
    }
  };

  const registerUser = async () => {
    const message = `eERC\nRegistering user with\n Address:${account.toLowerCase()}`;
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, account]
    });

    const response = await fetch('/api/user/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: account, signature })
    });

    const result = await response.json();
    console.log('Usuario registrado:', result);
  };

  return (
    <div>
      {!account ? (
        <button onClick={connectWallet}>Conectar Wallet</button>
      ) : (
        <div>
          <p>Conectado: {account}</p>
          <button onClick={registerUser}>Registrar Usuario</button>
        </div>
      )}
    </div>
  );
}
```

### **Vue.js**

```vue
<template>
  <div>
    <button v-if="!account" @click="connectWallet">Conectar Wallet</button>
    <div v-else>
      <p>Conectado: {{ account }}</p>
      <button @click="registerUser">Registrar Usuario</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      account: null
    };
  },
  methods: {
    async connectWallet() {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      this.account = accounts[0];
    },
    async registerUser() {
      const message = `eERC\nRegistering user with\n Address:${this.account.toLowerCase()}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, this.account]
      });

      const response = await fetch('/api/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address: this.account, 
          signature 
        })
      });

      const result = await response.json();
      console.log('Usuario registrado:', result);
    }
  }
};
</script>
```

## 🔍 **Verificación en el Servidor**

El servidor SIEMPRE debe verificar las firmas:

```javascript
app.post('/api/user/register', async (req, res) => {
  const { address, signature } = req.body;
  
  // 1. Verificar formato de dirección
  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Dirección inválida' });
  }
  
  // 2. Recrear el mensaje original
  const message = `eERC\nRegistering user with\n Address:${address.toLowerCase()}`;
  
  // 3. Verificar que la firma sea válida
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(400).json({ error: 'Firma inválida' });
    }
  } catch (error) {
    return res.status(400).json({ error: 'Error verificando firma' });
  }
  
  // 4. Procesar registro (la firma es válida)
  // ...resto de la lógica
});
```

## 🚨 **Casos de Emergencia**

### **Si necesitas usar private keys (casos muy específicos):**

1. **Desarrollo Local**: Solo para testing
2. **Servicios Automatizados**: Bots, APIs
3. **Wallets Empresariales**: Sistemas internos

### **Medidas de Seguridad:**

```javascript
// ✅ Cifrado de private keys
const encryptedKey = await encrypt(privateKey, password);

// ✅ Variables de entorno
process.env.ENCRYPTED_WALLET_KEY = encryptedKey;

// ✅ Acceso limitado en tiempo
const wallet = await decryptWallet(encryptedKey, password);
performOperation(wallet);
wallet = null; // Limpiar inmediatamente

// ✅ Logging sin exponer keys
console.log(`Operación realizada para: ${wallet.address}`);
// ❌ console.log(`Private key: ${wallet.privateKey}`);
```

## ✅ **Checklist de Seguridad**

- [ ] **Frontend NO envía private keys**
- [ ] **Servidor verifica todas las firmas**
- [ ] **Private keys cifradas si se almacenan**
- [ ] **Logs NO contienen información sensible**
- [ ] **Variables de entorno para configuración**
- [ ] **Timeouts para operaciones sensibles**
- [ ] **Rotación de keys periódica**
- [ ] **Auditorías de seguridad regulares**

## 📞 **Soporte y Mejores Prácticas**

Para más información sobre seguridad:
- [Ethereum Security Best Practices](https://ethereum.org/security)
- [MetaMask Developer Docs](https://docs.metamask.io/)
- [Ethers.js Documentation](https://docs.ethers.io/)

¡La seguridad es responsabilidad de todos! 🔐
