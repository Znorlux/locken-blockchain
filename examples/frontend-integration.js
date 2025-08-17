/**
 * Ejemplo de integración segura con frontend
 * NUNCA enviar private keys al servidor
 */

// =====================================
// OPCIÓN 1: FIRMA LOCAL (MÁS SEGURO)
// =====================================

class SecureBlockchainService {
  constructor(apiUrl = 'http://localhost:3001/api') {
    this.apiUrl = apiUrl;
  }

  // Conectar wallet (MetaMask, WalletConnect, etc.)
  async connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Solicitar acceso a MetaMask
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        const address = accounts[0];
        
        // Verificar conexión con el servidor
        const response = await fetch(`${this.apiUrl}/auth/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address })
        });
        
        const result = await response.json();
        
        return {
          address,
          ...result.data
        };
      } catch (error) {
        throw new Error(`Error conectando wallet: ${error.message}`);
      }
    } else {
      throw new Error('MetaMask no está instalado');
    }
  }

  // Registrar usuario (firma mensaje, no envía private key)
  async registerUser(address) {
    try {
      // Mensaje estándar para firmar
      const message = `eERC\nRegistering user with\n Address:${address.toLowerCase()}`;
      
      // Firmar mensaje con MetaMask (NO envía private key)
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });

      // Enviar solo la firma al servidor
      const response = await fetch(`${this.apiUrl}/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address,        // Dirección pública
          signature       // Firma del mensaje (NO private key)
        })
      });

      return await response.json();
    } catch (error) {
      throw new Error(`Error registrando usuario: ${error.message}`);
    }
  }

  // Depositar tokens (firma transacción localmente)
  async depositTokens(address, amount) {
    try {
      // El servidor proporciona los datos de la transacción
      const txDataResponse = await fetch(`${this.apiUrl}/tokens/prepare-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, amount })
      });
      
      const txData = await txDataResponse.json();
      
      // Firmar transacción con MetaMask
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txData.transaction]
      });

      // Confirmar al servidor
      const confirmResponse = await fetch(`${this.apiUrl}/tokens/confirm-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash })
      });

      return await confirmResponse.json();
    } catch (error) {
      throw new Error(`Error depositando: ${error.message}`);
    }
  }
}

// =====================================
// OPCIÓN 2: WALLET LOCAL (DESARROLLO)
// =====================================

class DevelopmentBlockchainService {
  constructor(apiUrl = 'http://localhost:3001/api') {
    this.apiUrl = apiUrl;
    this.wallet = null;
  }

  // Crear wallet local (solo para desarrollo)
  createLocalWallet(privateKey) {
    // ADVERTENCIA: Solo para desarrollo local
    if (process.env.NODE_ENV === 'production') {
      throw new Error('No uses private keys en producción');
    }
    
    this.wallet = {
      address: '0x...',  // Derivar de private key
      privateKey: privateKey
    };
    
    return this.wallet;
  }

  // Registrar con wallet local
  async registerUserLocal() {
    if (!this.wallet) {
      throw new Error('Wallet no configurado');
    }

    const response = await fetch(`${this.apiUrl}/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        address: this.wallet.address,
        // En desarrollo, generar firma localmente
        signature: this.signMessage(`eERC\nRegistering user with\n Address:${this.wallet.address.toLowerCase()}`)
      })
    });

    return await response.json();
  }

  signMessage(message) {
    // Implementar firma local con ethers.js
    // const wallet = new ethers.Wallet(this.wallet.privateKey);
    // return wallet.signMessage(message);
    return 'signature_placeholder';
  }
}

// =====================================
// OPCIÓN 3: SERVIDOR CON WALLET PROPIO
// =====================================

class ServerManagedWalletService {
  constructor(apiUrl = 'http://localhost:3001/api') {
    this.apiUrl = apiUrl;
  }

  // El servidor maneja las private keys (para casos específicos)
  async createServerWallet() {
    const response = await fetch(`${this.apiUrl}/wallet/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await response.json();
    
    return {
      address: result.data.address,
      // El servidor NO devuelve la private key
      walletId: result.data.walletId  // ID para referenciar
    };
  }

  // Operaciones usando wallet del servidor
  async depositWithServerWallet(walletId, amount) {
    const response = await fetch(`${this.apiUrl}/wallet/${walletId}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });

    return await response.json();
  }
}

// =====================================
// EJEMPLOS DE USO
// =====================================

// 1. Uso seguro con MetaMask
async function useSecureWallet() {
  const service = new SecureBlockchainService();
  
  // Conectar wallet
  const wallet = await service.connectWallet();
  console.log('Wallet conectado:', wallet.address);
  
  // Registrar usuario (sin enviar private key)
  const registration = await service.registerUser(wallet.address);
  console.log('Usuario registrado:', registration);
  
  // Depositar tokens (firma local)
  const deposit = await service.depositTokens(wallet.address, '10.5');
  console.log('Depósito realizado:', deposit);
}

// 2. Uso en desarrollo
async function useDevelopmentWallet() {
  const service = new DevelopmentBlockchainService();
  
  // Solo para desarrollo local
  const wallet = service.createLocalWallet('0x1234...');
  console.log('Wallet de desarrollo:', wallet.address);
  
  // Operaciones locales
  const registration = await service.registerUserLocal();
  console.log('Registro local:', registration);
}

// 3. Wallet manejado por servidor
async function useServerWallet() {
  const service = new ServerManagedWalletService();
  
  // Crear wallet en servidor (para bots, servicios, etc.)
  const wallet = await service.createServerWallet();
  console.log('Wallet del servidor:', wallet.address);
  
  // Operaciones con wallet del servidor
  const deposit = await service.depositWithServerWallet(wallet.walletId, '5.0');
  console.log('Depósito del servidor:', deposit);
}

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SecureBlockchainService,
    DevelopmentBlockchainService,
    ServerManagedWalletService
  };
}
