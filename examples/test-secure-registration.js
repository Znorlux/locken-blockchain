/**
 * Ejemplos de registro seguro sin enviar private keys
 * Ejecutar con: node examples/test-secure-registration.js
 */

const axios = require('axios');
const { ethers } = require('ethers');

const API_BASE_URL = 'http://localhost:3001/api';

// Configurar axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==========================================
// MÉTODO 1: REGISTRO SEGURO (RECOMENDADO)
// ==========================================

async function testSecureRegistration() {
  console.log('🔐 Probando registro SEGURO (sin enviar private key)...\n');

  try {
    // Simular wallet local (en la vida real sería MetaMask)
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    
    console.log(`👛 Wallet generado: ${address}`);
    
    // 1. Conectar wallet
    console.log('1️⃣ Conectando wallet...');
    const connectResponse = await api.post('/auth/connect', { address });
    console.log('✅ Wallet conectado:', connectResponse.data);
    
    // 2. Generar mensaje y firmarlo localmente
    const message = `eERC\nRegistering user with\n Address:${address.toLowerCase()}`;
    const signature = await wallet.signMessage(message);
    
    console.log('📝 Mensaje firmado:', message);
    console.log('✍️  Firma generada:', signature.substring(0, 20) + '...');
    
    // 3. Registrar usuario enviando solo address + signature
    console.log('2️⃣ Registrando usuario (SEGURO)...');
    const registerResponse = await api.post('/user/register', {
      address: address,           // ✅ Dirección pública (seguro)
      signature: signature        // ✅ Firma del mensaje (seguro)
      // ❌ NO enviamos private key
    });
    
    console.log('✅ Usuario registrado:', registerResponse.data);
    console.log('🔒 Método usado:', registerResponse.data.data.registrationMethod);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// ==========================================
// MÉTODO 2: DESARROLLO LOCAL (NO SEGURO)
// ==========================================

async function testDevelopmentRegistration() {
  console.log('\n⚠️  Probando registro de DESARROLLO (private key)...\n');

  try {
    // Simular wallet de desarrollo
    const wallet = ethers.Wallet.createRandom();
    
    console.log('👛 Wallet de desarrollo:', wallet.address);
    console.log('🔑 Private key:', wallet.privateKey.substring(0, 20) + '...');
    
    // Registrar usando private key (SOLO PARA DESARROLLO)
    console.log('1️⃣ Registrando con private key (DESARROLLO)...');
    const registerResponse = await api.post('/user/register', {
      privateKey: wallet.privateKey    // ⚠️ NO hacer esto en producción
    });
    
    console.log('✅ Usuario registrado:', registerResponse.data);
    console.log('🔒 Método usado:', registerResponse.data.data.registrationMethod);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// ==========================================
// MÉTODO 3: METAMASK SIMULADO
// ==========================================

async function testMetaMaskSimulation() {
  console.log('\n🦊 Simulando registro con MetaMask...\n');

  try {
    // Simular MetaMask
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    
    console.log(`🦊 MetaMask address: ${address}`);
    
    // Función que simula window.ethereum.request
    const simulateMetaMask = {
      async request({ method, params }) {
        if (method === 'eth_requestAccounts') {
          return [address];
        }
        if (method === 'personal_sign') {
          const [message, account] = params;
          return await wallet.signMessage(message);
        }
        throw new Error(`Método no soportado: ${method}`);
      }
    };
    
    // 1. Solicitar cuentas (como hace MetaMask)
    const accounts = await simulateMetaMask.request({ 
      method: 'eth_requestAccounts' 
    });
    
    console.log('👛 Cuentas obtenidas:', accounts);
    
    // 2. Firmar mensaje (como hace MetaMask)
    const message = `eERC\nRegistering user with\n Address:${address.toLowerCase()}`;
    const signature = await simulateMetaMask.request({
      method: 'personal_sign',
      params: [message, address]
    });
    
    console.log('✍️  Mensaje firmado con MetaMask simulado');
    
    // 3. Registrar en el servidor
    console.log('1️⃣ Registrando con firma de MetaMask...');
    const registerResponse = await api.post('/user/register', {
      address: address,
      signature: signature
    });
    
    console.log('✅ Usuario registrado:', registerResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// ==========================================
// MÉTODO 4: VERIFICAR FIRMA EN SERVIDOR
// ==========================================

async function testSignatureVerification() {
  console.log('\n🔍 Probando verificación de firma...\n');

  try {
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    
    // Crear firma válida
    const message = `eERC\nRegistering user with\n Address:${address.toLowerCase()}`;
    const validSignature = await wallet.signMessage(message);
    
    // Probar con firma válida
    console.log('1️⃣ Probando firma VÁLIDA...');
    const validResponse = await api.post('/user/register', {
      address: address,
      signature: validSignature
    });
    console.log('✅ Firma válida aceptada');
    
    // Probar con firma inválida
    console.log('2️⃣ Probando firma INVÁLIDA...');
    try {
      await api.post('/user/register', {
        address: address,
        signature: '0xinvalid_signature'
      });
    } catch (error) {
      console.log('✅ Firma inválida rechazada:', error.response.data.error);
    }
    
    // Probar con dirección incorrecta
    console.log('3️⃣ Probando dirección INCORRECTA...');
    const otherWallet = ethers.Wallet.createRandom();
    try {
      await api.post('/user/register', {
        address: otherWallet.address,  // Dirección diferente
        signature: validSignature      // Firma de otro wallet
      });
    } catch (error) {
      console.log('✅ Firma de dirección incorrecta rechazada:', error.response.data.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// ==========================================
// EJECUTAR TODOS LOS TESTS
// ==========================================

async function runAllTests() {
  console.log('🚀 Pruebas de Registro Seguro - Locken Blockchain');
  console.log('=================================================\n');
  
  await testSecureRegistration();
  await testDevelopmentRegistration();
  await testMetaMaskSimulation();
  await testSignatureVerification();
  
  console.log('\n🎉 Todas las pruebas completadas!');
  console.log('\n💡 Resumen de métodos:');
  console.log('   ✅ SEGURO: address + signature (USAR EN PRODUCCIÓN)');
  console.log('   ⚠️  DESARROLLO: private key (SOLO PARA TESTING)');
  console.log('   🦊 METAMASK: Firma con wallet del usuario');
  console.log('   🔍 VERIFICACIÓN: El servidor valida todas las firmas');
}

// Verificar si el servidor está corriendo
async function checkServer() {
  try {
    await api.get('/health');
    return true;
  } catch (error) {
    console.log('❌ Servidor no disponible. Ejecuta: npm run api:start');
    return false;
  }
}

// Ejecutar si el servidor está disponible
checkServer().then(isAvailable => {
  if (isAvailable) {
    runAllTests();
  }
});
