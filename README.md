# EncryptedERC (eERC) - Private Token System

This project implements an EncryptedERC system that allows users to hold and transfer tokens privately using zero-knowledge proofs and homomorphic encryption. The system maintains privacy while enabling auditing capabilities.

## Prerequisites

1. Node.js and npm installed
2. Two private keys for testing (set as environment variables)
3. AVAX testnet tokens for gas fees

## Environment Setup

Create a `.env` file in the root directory:

```bash
# Avalanche Fuji Testnet RPC
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc

# Private keys for testing (without 0x prefix)
PRIVATE_KEY=your_first_private_key_here
PRIVATE_KEY2=your_second_private_key_here

# Enable forking if needed
FORKING=false
```

## Installation

```bash
npm install
```

---

## Step-by-Step Deployment and Testing Guide

### English Version

Follow these steps in order to deploy and test the EncryptedERC system:

#### Step 1: Deploy Basic Components
Deploy verifiers, libraries, and test ERC20 token.

```bash
npx hardhat run scripts/01_deploy-basics.ts --network fuji
```

**What this does:**
- Deploys zero-knowledge proof verifiers for registration, mint, withdraw, transfer, and burn operations
- Deploys BabyJubJub elliptic curve library
- Creates a test ERC20 token (TEST) and mints 10,000 tokens to the deployer
- Saves deployment addresses to `deployments/latest-fuji.json`

#### Step 2: Deploy Converter System
Deploy the main EncryptedERC contract and Registrar.

```bash
npx hardhat run scripts/02_deploy-converter.ts --network fuji
```

**What this does:**
- Deploys the Registrar contract for user registration
- Deploys the EncryptedERC contract in converter mode
- Links all previously deployed verifiers
- Updates the deployment file with new contract addresses

#### Step 3: Register Users
Register both test users (privateKey and privateKey2) in the system.

**For first user (PRIVATE_KEY):**
```bash
npx hardhat run scripts/03_register-user.ts --network fuji
```

**For second user (PRIVATE_KEY2):**
Switch the script to use the second private key or manually change the wallet selection in the script, then run:
```bash
npx hardhat run scripts/03_register-user.ts --network fuji
```

**What this does:**
- Generates deterministic cryptographic keys from the user's signature
- Creates a zero-knowledge proof of identity
- Registers the user's public key on-chain
- Saves user keys for future balance decryption

#### Step 4: Set Auditor
Configure the system auditor (must be done by the contract owner).

```bash
npx hardhat run scripts/04_set-auditor.ts --network fuji
```

**What this does:**
- Sets the auditor's public key in the EncryptedERC contract
- Enables the auditor to decrypt transaction amounts for compliance
- This step is required before any deposits can be made

#### Step 5: Get Test Tokens (Both Users)
Claim test tokens from the faucet for both users.

**For first user:**
```bash
npx hardhat run scripts/05_get_faucet.ts --network fuji
```

**For second user:**
Switch to PRIVATE_KEY2 and run:
```bash
npx hardhat run scripts/05_get_faucet.ts --network fuji
```

**What this does:**
- Claims test tokens from the ERC20 faucet
- Each user can claim once every 24 hours
- Provides tokens needed for deposits into the encrypted system

#### Step 6: Make Initial Deposits (Both Users)
Deposit test tokens into the encrypted system for both users.

**For first user:**
```bash
npx hardhat run scripts/06_deposit.ts --network fuji
```

**For second user:**
Switch to PRIVATE_KEY2 and run:
```bash
npx hardhat run scripts/06_deposit.ts --network fuji
```

**What this does:**
- Converts public ERC20 tokens into encrypted tokens
- Generates encrypted balance proofs
- Creates audit trails for compliance
- Tokens become private and can only be decrypted by the owner

#### Step 7: Check Balances
Verify that deposits worked correctly by checking encrypted balances.

**Check first user's balance:**
```bash
npx hardhat run scripts/08_check_balance.ts --network fuji
```

**Check second user's balance:**
Switch to PRIVATE_KEY2 and run:
```bash
npx hardhat run scripts/08_check_balance.ts --network fuji
```

**What this does:**
- Decrypts the user's encrypted balance using their private key
- Shows both encrypted balance and public token balance
- Verifies encryption consistency

#### Step 8: Perform Private Transfer
Transfer encrypted tokens from first user to second user.

```bash
npx hardhat run scripts/07_transfer.ts --network fuji
```

**What this does:**
- Generates a zero-knowledge proof for the transfer
- Transfers tokens privately (amounts are hidden from public view)
- Updates encrypted balances for both sender and receiver
- Maintains audit trail for compliance

#### Step 9: Verify Transfer
Check balances again to confirm the transfer was successful.

**Check both users' balances:**
```bash
npx hardhat run scripts/08_check_balance.ts --network fuji
```
(Switch between PRIVATE_KEY and PRIVATE_KEY2)

#### Step 10: Withdraw to Public
Withdraw tokens from the encrypted system back to public ERC20 format.

```bash
npx hardhat run scripts/09_withdraw.ts --network fuji
```

**What this does:**
- Generates a zero-knowledge proof for withdrawal
- Converts encrypted tokens back to public ERC20 tokens
- Shows the withdrawal publicly in the final balance check

#### Final Step: Check Public Balances
Verify the final state by checking public token balances.

```bash
npx hardhat run scripts/08_check_balance.ts --network fuji
```

---

### Versión en Español

Sigue estos pasos en orden para desplegar y probar el sistema EncryptedERC:

#### Paso 1: Desplegar Componentes Básicos
Despliega verificadores, librerías y token ERC20 de prueba.

```bash
npx hardhat run scripts/01_deploy-basics.ts --network fuji
```

**Qué hace esto:**
- Despliega verificadores de pruebas zero-knowledge para registro, mint, retiro, transferencia y burn
- Despliega la librería de curva elíptica BabyJubJub
- Crea un token ERC20 de prueba (TEST) y acuña 10,000 tokens al desplegador
- Guarda las direcciones de despliegue en `deployments/latest-fuji.json`

#### Paso 2: Desplegar Sistema Convertidor
Despliega el contrato principal EncryptedERC y el Registrar.

```bash
npx hardhat run scripts/02_deploy-converter.ts --network fuji
```

**Qué hace esto:**
- Despliega el contrato Registrar para el registro de usuarios
- Despliega el contrato EncryptedERC en modo convertidor
- Vincula todos los verificadores previamente desplegados
- Actualiza el archivo de despliegue con las nuevas direcciones de contratos

#### Paso 3: Registrar Usuarios
Registra ambos usuarios de prueba (privateKey y privateKey2) en el sistema.

**Para el primer usuario (PRIVATE_KEY):**
```bash
npx hardhat run scripts/03_register-user.ts --network fuji
```

**Para el segundo usuario (PRIVATE_KEY2):**
Cambia el script para usar la segunda clave privada o cambia manualmente la selección de wallet en el script, luego ejecuta:
```bash
npx hardhat run scripts/03_register-user.ts --network fuji
```

**Qué hace esto:**
- Genera claves criptográficas deterministas a partir de la firma del usuario
- Crea una prueba zero-knowledge de identidad
- Registra la clave pública del usuario en la blockchain
- Guarda las claves del usuario para futura desencriptación de balances

#### Paso 4: Establecer Auditor
Configura el auditor del sistema (debe ser hecho por el propietario del contrato).

```bash
npx hardhat run scripts/04_set-auditor.ts --network fuji
```

**Qué hace esto:**
- Establece la clave pública del auditor en el contrato EncryptedERC
- Permite al auditor desencriptar montos de transacciones para cumplimiento
- Este paso es requerido antes de que se puedan hacer depósitos

#### Paso 5: Obtener Tokens de Prueba (Ambos Usuarios)
Reclama tokens de prueba del faucet para ambos usuarios.

**Para el primer usuario:**
```bash
npx hardhat run scripts/05_get_faucet.ts --network fuji
```

**Para el segundo usuario:**
Cambia a PRIVATE_KEY2 y ejecuta:
```bash
npx hardhat run scripts/05_get_faucet.ts --network fuji
```

**Qué hace esto:**
- Reclama tokens de prueba del faucet ERC20
- Cada usuario puede reclamar una vez cada 24 horas
- Proporciona tokens necesarios para depósitos en el sistema encriptado

#### Paso 6: Hacer Depósitos Iniciales (Ambos Usuarios)
Deposita tokens de prueba en el sistema encriptado para ambos usuarios.

**Para el primer usuario:**
```bash
npx hardhat run scripts/06_deposit.ts --network fuji
```

**Para el segundo usuario:**
Cambia a PRIVATE_KEY2 y ejecuta:
```bash
npx hardhat run scripts/06_deposit.ts --network fuji
```

**Qué hace esto:**
- Convierte tokens ERC20 públicos en tokens encriptados
- Genera pruebas de balance encriptado
- Crea rastros de auditoría para cumplimiento
- Los tokens se vuelven privados y solo pueden ser desencriptados por el propietario

#### Paso 7: Verificar Balances
Verifica que los depósitos funcionaron correctamente revisando los balances encriptados.

**Verificar balance del primer usuario:**
```bash
npx hardhat run scripts/08_check_balance.ts --network fuji
```

**Verificar balance del segundo usuario:**
Cambia a PRIVATE_KEY2 y ejecuta:
```bash
npx hardhat run scripts/08_check_balance.ts --network fuji
```

**Qué hace esto:**
- Desencripta el balance encriptado del usuario usando su clave privada
- Muestra tanto el balance encriptado como el balance público de tokens
- Verifica la consistencia de la encriptación

#### Paso 8: Realizar Transferencia Privada
Transfiere tokens encriptados del primer usuario al segundo usuario.

```bash
npx hardhat run scripts/07_transfer.ts --network fuji
```

**Qué hace esto:**
- Genera una prueba zero-knowledge para la transferencia
- Transfiere tokens de forma privada (los montos están ocultos de la vista pública)
- Actualiza los balances encriptados para el emisor y el receptor
- Mantiene rastro de auditoría para cumplimiento

#### Paso 9: Verificar Transferencia
Verifica los balances nuevamente para confirmar que la transferencia fue exitosa.

**Verificar balances de ambos usuarios:**
```bash
npx hardhat run scripts/08_check_balance.ts --network fuji
```
(Alterna entre PRIVATE_KEY y PRIVATE_KEY2)

#### Paso 10: Retirar a Público
Retira tokens del sistema encriptado de vuelta al formato ERC20 público.

```bash
npx hardhat run scripts/09_withdraw.ts --network fuji
```

**Qué hace esto:**
- Genera una prueba zero-knowledge para el retiro
- Convierte tokens encriptados de vuelta a tokens ERC20 públicos
- Muestra el retiro públicamente en la verificación final del balance

#### Paso Final: Verificar Balances Públicos
Verifica el estado final revisando los balances públicos de tokens.

```bash
npx hardhat run scripts/08_check_balance.ts --network fuji
```

---

## Key Features / Características Principales

- **Private Transactions**: Transfer amounts are hidden from public view
- **Zero-Knowledge Proofs**: Cryptographic proofs ensure transaction validity without revealing details
- **Auditor Support**: Designated auditor can decrypt transactions for compliance
- **ERC20 Compatibility**: Seamless conversion between public and private token states
- **Deterministic Keys**: User keys are derived from signatures for easy recovery

**Español:**
- **Transacciones Privadas**: Los montos de transferencia están ocultos de la vista pública
- **Pruebas Zero-Knowledge**: Pruebas criptográficas aseguran la validez de transacciones sin revelar detalles
- **Soporte de Auditor**: El auditor designado puede desencriptar transacciones para cumplimiento
- **Compatibilidad ERC20**: Conversión fluida entre estados públicos y privados de tokens
- **Claves Deterministas**: Las claves del usuario se derivan de firmas para fácil recuperación

## Troubleshooting / Solución de Problemas

**Common Issues / Problemas Comunes:**

1. **"User not registered"** - Run the registration script first
2. **"Auditor not set"** - Run the set-auditor script before making deposits
3. **"Insufficient balance"** - Claim tokens from the faucet first
4. **"Keys don't match"** - Re-run the registration script to regenerate keys

**Español:**
1. **"User not registered"** - Ejecuta el script de registro primero
2. **"Auditor not set"** - Ejecuta el script set-auditor antes de hacer depósitos
3. **"Insufficient balance"** - Reclama tokens del faucet primero
4. **"Keys don't match"** - Re-ejecuta el script de registro para regenerar claves
