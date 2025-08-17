import { ethers, zkit } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { formatPrivKeyForBabyJub } from "maci-crypto";
import { i0 } from "../../helpers/crypto";

export interface TransferResult {
  senderAddress: string;
  receiverAddress: string;
  amount: string;
  transactionHash: string;
  blockNumber: number;
  senderBalance: {
    before: string;
    after: string;
  };
  receiverBalance: {
    before: string;
    after: string;
  };
}

export async function transferTokens(
  senderPrivateKey: string,
  receiverAddress: string,
  amount: string
): Promise<TransferResult> {
  try {
    // Crear wallet del remitente
    const senderWallet = new ethers.Wallet(senderPrivateKey, ethers.provider);
    const senderAddress = await senderWallet.getAddress();

    console.log(`🔄 Transfiriendo ${amount} tokens de ${senderAddress} a ${receiverAddress}`);

    // Validar dirección del receptor
    if (!ethers.isAddress(receiverAddress)) {
      throw new Error("Dirección del receptor inválida");
    }

    // Leer información de deployment
    const deploymentPath = path.join(__dirname, "../../../deployments/latest-fuji.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

    const encryptedERCAddress = deploymentData.contracts.encryptedERC;
    const testERC20Address = deploymentData.contracts.testERC20;
    const registrarAddress = deploymentData.contracts.registrar;

    // Conectar a contratos
    const encryptedERC = await ethers.getContractAt("EncryptedERC", encryptedERCAddress, senderWallet);
    const registrar = await ethers.getContractAt("Registrar", registrarAddress, senderWallet);
    const testERC20 = await ethers.getContractAt("SimpleERC20", testERC20Address, senderWallet);

    // Verificar que ambos usuarios estén registrados
    const isSenderRegistered = await registrar.isUserRegistered(senderAddress);
    const isReceiverRegistered = await registrar.isUserRegistered(receiverAddress);

    if (!isSenderRegistered) {
      throw new Error("Remitente no registrado");
    }
    if (!isReceiverRegistered) {
      throw new Error("Receptor no registrado");
    }

    // Obtener información del token
    const tokenDecimals = await testERC20.decimals();
    const transferAmount = ethers.parseUnits(amount, tokenDecimals);

    // Generar claves del remitente desde signature
    const message = `eERC\nRegistering user with\n Address:${senderAddress.toLowerCase()}`;
    const signature = await senderWallet.signMessage(message);
    const senderPrivateKeyFromSig = i0(signature);
    const formattedSenderPrivateKey = formatPrivKeyForBabyJub(senderPrivateKeyFromSig);

    // Obtener claves públicas
    const senderPublicKey = await registrar.getUserPublicKey(senderAddress);
    const receiverPublicKey = await registrar.getUserPublicKey(receiverAddress);
    const auditorPublicKey = await registrar.getAuditorPublicKey();

    // Obtener balances anteriores (placeholder)
    const senderBalanceBefore = "1.0"; // Aquí deberías descifrar el balance real
    const receiverBalanceBefore = "0.5"; // Aquí deberías descifrar el balance real

    // Verificar que el remitente tenga suficiente balance
    const senderBalanceAmount = ethers.parseUnits(senderBalanceBefore, tokenDecimals);
    if (senderBalanceAmount < transferAmount) {
      throw new Error(`Balance insuficiente. Tiene: ${senderBalanceBefore}, Necesita: ${amount}`);
    }

    // Generar proof de transferencia
    console.log("🔐 Generando proof de transferencia...");
    
    const circuit = await zkit.getCircuit("TransferCircuit");
    const transferProof = await circuit.generateProof({
      amount: transferAmount.toString(),
      senderPrivateKey: formattedSenderPrivateKey.toString(),
      senderPublicKeyX: senderPublicKey[0].toString(),
      senderPublicKeyY: senderPublicKey[1].toString(),
      receiverPublicKeyX: receiverPublicKey[0].toString(),
      receiverPublicKeyY: receiverPublicKey[1].toString(),
      auditorPublicKeyX: auditorPublicKey[0].toString(),
      auditorPublicKeyY: auditorPublicKey[1].toString(),
      // Aquí deberías incluir más campos según tu circuito de transferencia
    });

    console.log("✅ Proof generado exitosamente");

    // Ejecutar transferencia
    console.log("💸 Ejecutando transferencia...");
    const transferTx = await encryptedERC.transfer(
      receiverAddress,
      transferProof.publicSignals,
      transferProof.proof
    );

    console.log("⏳ Esperando confirmación...");
    const receipt = await transferTx.wait();

    // Calcular balances posteriores (placeholder)
    const senderBalanceAfter = (parseFloat(senderBalanceBefore) - parseFloat(amount)).toString();
    const receiverBalanceAfter = (parseFloat(receiverBalanceBefore) + parseFloat(amount)).toString();

    console.log("✅ Transferencia completada exitosamente");

    return {
      senderAddress,
      receiverAddress,
      amount,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      senderBalance: {
        before: senderBalanceBefore,
        after: senderBalanceAfter
      },
      receiverBalance: {
        before: receiverBalanceBefore,
        after: receiverBalanceAfter
      }
    };

  } catch (error) {
    console.error("Error en transferTokens:", error);
    throw new Error(`Error al transferir tokens: ${error.message}`);
  }
}
