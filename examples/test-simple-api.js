/**
 * Script de ejemplo para probar la API simple de Locken Blockchain
 * Ejecutar con: node examples/test-simple-api.js
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';
const TEST_ADDRESS = '0x69812b265c4B0A44A70a3a800439d23e69fd52cE';

// Configurar axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

async function testSimpleAPI() {
  console.log('🧪 Probando API Simple de Locken Blockchain...\n');

  try {
    // 1. Health Check
    console.log('1️⃣ Health check...');
    const healthResponse = await api.get('/health');
    console.log('✅ Health:', healthResponse.data);
    console.log('');

    // 2. Información de red
    console.log('2️⃣ Información de red...');
    try {
      const networkResponse = await api.get('/network/info');
      console.log('✅ Red:', networkResponse.data);
    } catch (error) {
      console.log('❌ Error de red:', error.response?.data?.error || error.message);
    }
    console.log('');

    // 3. Conectar wallet
    console.log('3️⃣ Conectando wallet...');
    try {
      const connectResponse = await api.post('/auth/connect', {
        address: TEST_ADDRESS
      });
      console.log('✅ Wallet conectado:', connectResponse.data);
    } catch (error) {
      console.log('❌ Error conectando:', error.response?.data?.error || error.message);
    }
    console.log('');

    // 4. Estado del usuario
    console.log('4️⃣ Estado del usuario...');
    try {
      const statusResponse = await api.get(`/user/status/${TEST_ADDRESS}`);
      console.log('✅ Estado:', statusResponse.data);
    } catch (error) {
      console.log('❌ Error verificando estado:', error.response?.data?.error || error.message);
    }
    console.log('');

    // 5. Información de contratos
    console.log('5️⃣ Información de contratos...');
    try {
      const contractsResponse = await api.get('/info/contracts');
      console.log('✅ Contratos:', contractsResponse.data);
    } catch (error) {
      console.log('❌ Error (normal si no están desplegados):', error.response?.data?.error || error.message);
    }
    console.log('');

    // 6. Simular depósito
    console.log('6️⃣ Simulando depósito...');
    try {
      const depositResponse = await api.post('/tokens/simulate-deposit', {
        address: TEST_ADDRESS,
        amount: '10.5'
      });
      console.log('✅ Depósito simulado:', depositResponse.data);
    } catch (error) {
      console.log('❌ Error simulando depósito:', error.response?.data?.error || error.message);
    }
    console.log('');

    // 7. Probar endpoint inexistente (404)
    console.log('7️⃣ Probando endpoint inexistente...');
    try {
      await api.get('/nonexistent');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ 404 manejado correctamente:', error.response.data);
      } else {
        console.log('❌ Error inesperado:', error.response?.data || error.message);
      }
    }
    console.log('');

    console.log('🎉 Todas las pruebas de API Simple completadas!');
    console.log('\n💡 Siguiente paso: Configurar ABIs de contratos para funcionalidad completa');

  } catch (error) {
    console.error('❌ Error general:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Sugerencias:');
      console.log('   1. Inicia el servidor: npm run api:simple');
      console.log('   2. Verifica que esté en el puerto 3001');
      console.log('   3. Revisa que no haya errores en el servidor');
    }
  }
}

console.log('🚀 Prueba de API Simple - Locken Blockchain');
console.log('=============================================\n');
console.log(`📊 API URL: ${API_BASE_URL}`);
console.log(`📍 Test Address: ${TEST_ADDRESS}\n`);

testSimpleAPI();
