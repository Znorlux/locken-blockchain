import { ethers, zkit } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { Base8, mulPointEscalar } from "@zk-kit/baby-jubjub";
import { formatPrivKeyForBabyJub } from "maci-crypto";
import { i0 } from "../../helpers/crypto";
import type { MintCircuit } from "../../../generated-types/zkit";

export interface DepositResult {
  userAddress: string;
  amount: string;
  transactionHash: string;
  blockNumber: number;
  tokenBalance: {
    before: string;
    after: string;
  };
  encryptedBalance: {
    before: string;
    after: string;
  };
}

export async function depositTokens(
  userPrivateKey: string,
  amount: string
): Promise<DepositResult> {
  try {
    // Crear wallet desde private key
    const wallet = new ethers.Wallet(userPrivateKey, ethers.provider);
    const userAddress = await wallet.getAddress();

    console.log(`💰 Depositando ${amount} tokens para usuario: ${userAddress}`);

    // Leer información de deployment
    const deploymentPath = path.join(__dirname, "../../../deployments/latest-fuji.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

    const encryptedERCAddress = deploymentData.contracts.encryptedERC;
    const testERC20Address = deploymentData.contracts.testERC20;
    const registrarAddress = deploymentData.contracts.registrar;

    // Conectar a contratos
    const testERC20 = await ethers.getContractAt("SimpleERC20", testERC20Address, wallet);
    const encryptedERC = await ethers.getContractAt("EncryptedERC", encryptedERCAddress, wallet);
    const registrar = await ethers.getContractAt("Registrar", registrarAddress, wallet);

    // Verificar que el usuario esté registrado
    const isRegistered = await registrar.isUserRegistered(userAddress);
    if (!isRegistered) {
      throw new Error("Usuario no registrado. Debe registrarse primero.");
    }

    // Obtener información del token
    const tokenDecimals = await testERC20.decimals();
    const tokenSymbol = await testERC20.symbol();
    const depositAmount = ethers.parseUnits(amount, tokenDecimals);

    // Verificar balance de tokens
    const tokenBalance = await testERC20.balanceOf(userAddress);
    if (tokenBalance < depositAmount) {
      throw new Error(`Balance insuficiente. Tiene: ${ethers.formatUnits(tokenBalance, tokenDecimals)} ${tokenSymbol}, Necesita: ${amount} ${tokenSymbol}`);
    }

    // Generar claves desde signature
    const message = `eERC\nRegistering user with\n Address:${userAddress.toLowerCase()}`;
    const signature = await wallet.signMessage(message);
    const userPrivateKeyFromSig = i0(signature);
    const formattedPrivateKey = formatPrivKeyForBabyJub(userPrivateKeyFromSig);

    // Obtener clave pública del usuario
    const userPublicKey = await registrar.getUserPublicKey(userAddress);
    
    // Verificar claves
    const derivedPublicKey = mulPointEscalar(Base8, formattedPrivateKey);
    const publicKeysMatch =
      derivedPublicKey[0] === BigInt(userPublicKey[0].toString()) &&
      derivedPublicKey[1] === BigInt(userPublicKey[1].toString());
    
    if (!publicKeysMatch) {
      throw new Error("Las claves públicas no coinciden");
    }

    // Obtener balance cifrado anterior
    let previousEncryptedBalance = "0";
    try {
      const tokenId = await encryptedERC.getTokenId(testERC20Address);
      const balanceData = await encryptedERC.getEncryptedBalanceUser(userAddress, tokenId);
      // Aquí deberías descifrar el balance anterior si es necesario
      previousEncryptedBalance = "0"; // Placeholder
    } catch (error) {
      console.log("No hay balance cifrado previo (primera vez)");
    }

    // Obtener clave pública del auditor
    const auditorPublicKey = await registrar.getAuditorPublicKey();

    // Generar AmountPCT (Poseidon Commitment)
    console.log("🔐 Generando proof de depósito...");
    
    const circuit = await zkit.getCircuit("MintCircuit");
    const amountPCT = await circuit.generateProof({
      amount: depositAmount.toString(),
      userPrivateKey: formattedPrivateKey.toString(),
      userPublicKeyX: userPublicKey[0].toString(),
      userPublicKeyY: userPublicKey[1].toString(),
      auditorPublicKeyX: auditorPublicKey[0].toString(),
      auditorPublicKeyY: auditorPublicKey[1].toString(),
    });

    console.log("✅ Proof generado exitosamente");

    // Verificar allowance
    const currentAllowance = await testERC20.allowance(userAddress, encryptedERCAddress);
    if (currentAllowance < depositAmount) {
      console.log("🔓 Aprobando gasto de tokens...");
      const approveTx = await testERC20.approve(encryptedERCAddress, depositAmount);
      await approveTx.wait();
      console.log("✅ Aprobación completada");
    }

    // Realizar depósito
    console.log("💾 Ejecutando depósito...");
    const depositTx = await encryptedERC.deposit(
      depositAmount,
      testERC20Address,
      amountPCT.publicSignals
    );

    console.log("⏳ Esperando confirmación...");
    const receipt = await depositTx.wait();

    // Obtener balances actualizados
    const newTokenBalance = await testERC20.balanceOf(userAddress);
    
    // Calcular nuevo balance cifrado (placeholder)
    const newEncryptedBalance = ethers.formatUnits(depositAmount, tokenDecimals);

    console.log("✅ Depósito completado exitosamente");

    return {
      userAddress,
      amount,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      tokenBalance: {
        before: ethers.formatUnits(tokenBalance, tokenDecimals),
        after: ethers.formatUnits(newTokenBalance, tokenDecimals)
      },
      encryptedBalance: {
        before: previousEncryptedBalance,
        after: newEncryptedBalance
      }
    };

  } catch (error) {
    console.error("Error en depositTokens:", error);
    throw new Error(`Error al depositar tokens: ${error.message}`);
  }
}
