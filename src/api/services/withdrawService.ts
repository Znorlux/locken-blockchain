import { ethers, zkit } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { formatPrivKeyForBabyJub } from "maci-crypto";
import { i0 } from "../../helpers/crypto";

export interface WithdrawResult {
  userAddress: string;
  amount: string;
  transactionHash: string;
  blockNumber: number;
  publicBalance: {
    before: string;
    after: string;
  };
  encryptedBalance: {
    before: string;
    after: string;
  };
}

export async function withdrawTokens(
  userPrivateKey: string,
  amount: string
): Promise<WithdrawResult> {
  try {
    // Crear wallet
    const wallet = new ethers.Wallet(userPrivateKey, ethers.provider);
    const userAddress = await wallet.getAddress();

    console.log(`💸 Retirando ${amount} tokens para usuario: ${userAddress}`);

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
      throw new Error("Usuario no registrado");
    }

    // Obtener información del token
    const tokenDecimals = await testERC20.decimals();
    const tokenSymbol = await testERC20.symbol();
    const withdrawAmount = ethers.parseUnits(amount, tokenDecimals);

    // Generar claves desde signature
    const message = `eERC\nRegistering user with\n Address:${userAddress.toLowerCase()}`;
    const signature = await wallet.signMessage(message);
    const userPrivateKeyFromSig = i0(signature);
    const formattedPrivateKey = formatPrivKeyForBabyJub(userPrivateKeyFromSig);

    // Obtener claves públicas
    const userPublicKey = await registrar.getUserPublicKey(userAddress);
    const auditorPublicKey = await registrar.getAuditorPublicKey();

    // Obtener balances anteriores
    const publicBalanceBefore = await testERC20.balanceOf(userAddress);
    
    // Verificar balance cifrado (placeholder - deberías descifrar el balance real)
    const encryptedBalanceBefore = "1.0"; // Placeholder
    const encryptedBalanceAmount = ethers.parseUnits(encryptedBalanceBefore, tokenDecimals);
    
    if (encryptedBalanceAmount < withdrawAmount) {
      throw new Error(`Balance cifrado insuficiente. Tiene: ${encryptedBalanceBefore}, Necesita: ${amount}`);
    }

    // Obtener token ID
    const tokenId = await encryptedERC.getTokenId(testERC20Address);

    // Generar proof de retiro
    console.log("🔐 Generando proof de retiro...");
    
    const circuit = await zkit.getCircuit("WithdrawCircuit");
    const withdrawProof = await circuit.generateProof({
      amount: withdrawAmount.toString(),
      userPrivateKey: formattedPrivateKey.toString(),
      userPublicKeyX: userPublicKey[0].toString(),
      userPublicKeyY: userPublicKey[1].toString(),
      auditorPublicKeyX: auditorPublicKey[0].toString(),
      auditorPublicKeyY: auditorPublicKey[1].toString(),
      tokenId: tokenId.toString(),
      // Aquí deberías incluir más campos según tu circuito de retiro
    });

    console.log("✅ Proof generado exitosamente");

    // Ejecutar retiro
    console.log("💰 Ejecutando retiro...");
    const withdrawTx = await encryptedERC.withdraw(
      withdrawAmount,
      testERC20Address,
      withdrawProof.publicSignals,
      withdrawProof.proof
    );

    console.log("⏳ Esperando confirmación...");
    const receipt = await withdrawTx.wait();

    // Obtener balances posteriores
    const publicBalanceAfter = await testERC20.balanceOf(userAddress);
    const encryptedBalanceAfter = (parseFloat(encryptedBalanceBefore) - parseFloat(amount)).toString();

    console.log("✅ Retiro completado exitosamente");

    return {
      userAddress,
      amount,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      publicBalance: {
        before: ethers.formatUnits(publicBalanceBefore, tokenDecimals),
        after: ethers.formatUnits(publicBalanceAfter, tokenDecimals)
      },
      encryptedBalance: {
        before: encryptedBalanceBefore,
        after: encryptedBalanceAfter
      }
    };

  } catch (error) {
    console.error("Error en withdrawTokens:", error);
    throw new Error(`Error al retirar tokens: ${error.message}`);
  }
}
