/**
 * Script de ejemplo para probar la API de Locken Blockchain
 * Ejecutar con: node examples/test-api.js
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Configurar axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Datos de ejemplo (reemplaza con tus datos reales)
const TEST_ADDRESS = '0x69812b265c4B0A44A70a3a800439d23e69fd52cE';
const TEST_PRIVATE_KEY = 'tu_private_key_aqui'; // ⚠️ No uses esto en producción
const RECEIVER_ADDRESS = '0x9876543210987654321098765432109876543210';

async function testAPI() {
  console.log('🧪 Iniciando pruebas de la API de Locken Blockchain...\n');

  try {
    // 1. Health Check
    console.log('1️⃣ Probando health check...');
    const healthResponse = await api.get('/health');
    console.log('✅ Health check:', healthResponse.data);
    console.log('');

    // 2. Obtener información de contratos
    console.log('2️⃣ Obteniendo información de contratos...');
    try {
      const contractsResponse = await api.get('/info/contracts');
      console.log('✅ Contratos:', contractsResponse.data);
    } catch (error) {
      console.log('❌ Error obteniendo contratos (normal si no están desplegados):', error.response?.data?.error || error.message);
    }
    console.log('');

    // 3. Conectar wallet
    console.log('3️⃣ Probando conexión de wallet...');
    try {
      const connectResponse = await api.post('/auth/connect', {
        address: TEST_ADDRESS
      });
      console.log('✅ Wallet conectado:', connectResponse.data);
    } catch (error) {
      console.log('❌ Error conectando wallet:', error.response?.data?.error || error.message);
    }
    console.log('');

    // 4. Verificar estado del usuario
    console.log('4️⃣ Verificando estado del usuario...');
    try {
      const statusResponse = await api.get(`/user/status/${TEST_ADDRESS}`);
      console.log('✅ Estado del usuario:', statusResponse.data);
    } catch (error) {
      console.log('❌ Error verificando estado:', error.response?.data?.error || error.message);
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

    // 6. Registrar usuario (solo si tienes private key)
    if (TEST_PRIVATE_KEY !== 'tu_private_key_aqui') {
      console.log('6️⃣ Registrando usuario...');
      try {
        const registerResponse = await api.post('/user/register', {
          privateKey: TEST_PRIVATE_KEY
        });
        console.log('✅ Usuario registrado:', registerResponse.data);
      } catch (error) {
        console.log('❌ Error registrando usuario:', error.response?.data?.error || error.message);
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

      // 8. Depositar tokens
      console.log('8️⃣ Depositando tokens...');
      try {
        const depositResponse = await api.post('/tokens/deposit', {
          privateKey: TEST_PRIVATE_KEY,
          amount: '0.1'
        });
        console.log('✅ Depósito:', depositResponse.data);
      } catch (error) {
        console.log('❌ Error depositando:', error.response?.data?.error || error.message);
      }
      console.log('');

    } else {
      console.log('⚠️ Configurar TEST_PRIVATE_KEY para probar funciones que requieren autenticación');
    }

    console.log('🎉 Pruebas de API completadas!');

  } catch (error) {
    console.error('❌ Error general:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Sugerencias:');
      console.log('   1. Asegúrate de que el servidor API esté corriendo: npm run api:start');
      console.log('   2. Verifica que esté en el puerto correcto (3001)');
      console.log('   3. Revisa que no haya errores en el servidor');
    }
  }
}

// Función para mostrar información de uso
function showUsage() {
  console.log('📋 Cómo usar este script de prueba:\n');
  console.log('1. Asegúrate de que los contratos estén desplegados:');
  console.log('   npm run deploy:basic');
  console.log('   npm run deploy:converter\n');
  console.log('2. Inicia el servidor API:');
  console.log('   npm run api:start\n');
  console.log('3. (Opcional) Edita las variables de prueba en este archivo:');
  console.log('   TEST_ADDRESS y TEST_PRIVATE_KEY\n');
  console.log('4. Ejecuta este script:');
  console.log('   node examples/test-api.js\n');
  console.log('⚠️  NOTA: Nunca uses private keys reales en scripts de prueba!');
}

// Verificar argumentos de línea de comandos
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
  process.exit(0);
}

// Ejecutar pruebas
console.log('🚀 Script de Prueba de API - Locken Blockchain');
console.log('===============================================\n');

// Mostrar configuración
console.log('📊 Configuración:');
console.log(`   API URL: ${API_BASE_URL}`);
console.log(`   Test Address: ${TEST_ADDRESS}`);
console.log(`   Private Key: ${TEST_PRIVATE_KEY === 'tu_private_key_aqui' ? '❌ No configurado' : '✅ Configurado'}`);
console.log('');

testAPI();
