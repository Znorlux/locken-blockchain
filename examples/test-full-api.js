/**
 * Script para probar la API completa de Locken Blockchain (con placeholders)
 * Ejecutar con: node examples/test-full-api.js
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';
const TEST_ADDRESS = '0x69812b265c4B0A44A70a3a800439d23e69fd52cE';
const TEST_PRIVATE_KEY = 'test_private_key'; // Placeholder para testing
const RECEIVER_ADDRESS = '0x9876543210987654321098765432109876543210';

// Configurar axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

async function testFullAPI() {
  console.log('🧪 Probando API Completa de Locken Blockchain (con placeholders)...\n');

  try {
    // 1. Health Check
    console.log('1️⃣ Health check...');
    const healthResponse = await api.get('/health');
    console.log('✅ Health:', healthResponse.data);
    console.log('');

    // 2. Conectar wallet
    console.log('2️⃣ Conectando wallet...');
    try {
      const connectResponse = await api.post('/auth/connect', {
        address: TEST_ADDRESS
      });
      console.log('✅ Wallet conectado:', connectResponse.data);
    } catch (error) {
      console.log('❌ Error conectando:', error.response?.data?.error || error.message);
    }
    console.log('');

    // 3. Estado del usuario
    console.log('3️⃣ Estado del usuario...');
    try {
      const statusResponse = await api.get(`/user/status/${TEST_ADDRESS}`);
      console.log('✅ Estado:', statusResponse.data);
    } catch (error) {
      console.log('❌ Error verificando estado:', error.response?.data?.error || error.message);
    }
    console.log('');

    // 4. Registrar usuario
    console.log('4️⃣ Registrando usuario...');
    try {
      const registerResponse = await api.post('/user/register', {
        privateKey: TEST_PRIVATE_KEY
      });
      console.log('✅ Usuario registrado:', registerResponse.data);
    } catch (error) {
      console.log('❌ Error registrando:', error.response?.data?.error || error.message);
    }
    console.log('');

    // 5. Solicitar tokens del faucet
    console.log('5️⃣ Solicitando tokens del faucet...');
    try {
      const faucetResponse = await api.post('/faucet/request', {
        address: TEST_ADDRESS
      });
      console.log('✅ Tokens del faucet:', faucetResponse.data);
    } catch (error) {
      console.log('❌ Error con faucet:', error.response?.data?.error || error.message);
    }
    console.log('');

    // 6. Depositar tokens
    console.log('6️⃣ Depositando tokens...');
    try {
      const depositResponse = await api.post('/tokens/deposit', {
        privateKey: TEST_PRIVATE_KEY,
        amount: '10.5'
      });
      console.log('✅ Depósito:', depositResponse.data);
    } catch (error) {
      console.log('❌ Error depositando:', error.response?.data?.error || error.message);
    }
    console.log('');

    // 7. Consultar balance
    console.log('7️⃣ Consultando balance...');
    try {
      const balanceResponse = await api.get(`/tokens/balance/${TEST_ADDRESS}?privateKey=${TEST_PRIVATE_KEY}`);
      console.log('✅ Balance:', balanceResponse.data);
    } catch (error) {
      console.log('❌ Error consultando balance:', error.response?.data?.error || error.message);
    }
    console.log('');

    // 8. Transferir tokens
    console.log('8️⃣ Transfiriendo tokens...');
    try {
      const transferResponse = await api.post('/tokens/transfer', {
        senderPrivateKey: TEST_PRIVATE_KEY,
        receiverAddress: RECEIVER_ADDRESS,
        amount: '5.0'
      });
      console.log('✅ Transferencia:', transferResponse.data);
    } catch (error) {
      console.log('❌ Error transfiriendo:', error.response?.data?.error || error.message);
    }
    console.log('');

    // 9. Retirar tokens
    console.log('9️⃣ Retirando tokens...');
    try {
      const withdrawResponse = await api.post('/tokens/withdraw', {
        privateKey: TEST_PRIVATE_KEY,
        amount: '8.0'
      });
      console.log('✅ Retiro:', withdrawResponse.data);
    } catch (error) {
      console.log('❌ Error retirando:', error.response?.data?.error || error.message);
    }
    console.log('');

    // 10. Información de contratos
    console.log('🔟 Información de contratos...');
    try {
      const contractsResponse = await api.get('/info/contracts');
      console.log('✅ Contratos:', contractsResponse.data);
    } catch (error) {
      console.log('❌ Error (normal si no están desplegados):', error.response?.data?.error || error.message);
    }
    console.log('');

    console.log('🎉 Todas las pruebas de API Completa completadas!');
    console.log('\n💡 Notas importantes:');
    console.log('   - Estas son respuestas de placeholder para desarrollo');
    console.log('   - Para funcionalidad real, configura ABIs de contratos');
    console.log('   - Los valores mostrados son simulados');
    console.log('\n🔧 Para habilitar funcionalidad real:');
    console.log('   1. Configura ABIs de contratos en los servicios');
    console.log('   2. Descomenta las importaciones en server.ts');
    console.log('   3. Ajusta las configuraciones de hardhat/ethers');

  } catch (error) {
    console.error('❌ Error general:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Sugerencias:');
      console.log('   1. Inicia el servidor: npm run api:start');
      console.log('   2. Verifica que esté en el puerto 3001');
      console.log('   3. Revisa que no haya errores en el servidor');
    }
  }
}

console.log('🚀 Prueba de API Completa - Locken Blockchain');
console.log('==============================================\n');
console.log(`📊 API URL: ${API_BASE_URL}`);
console.log(`📍 Test Address: ${TEST_ADDRESS}`);
console.log(`🔑 Private Key: ${TEST_PRIVATE_KEY} (placeholder)`);
console.log(`📨 Receiver: ${RECEIVER_ADDRESS}\n`);

testFullAPI();
