import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { formatPrivKeyForBabyJub } from "maci-crypto";
import { i0 } from "../../helpers/crypto";

export interface BalanceResult {
  userAddress: string;
  publicBalance: {
    amount: string;
    symbol: string;
    decimals: number;
  };
  encryptedBalance: {
    amount: string;
    isDecrypted: boolean;
  };
  tokenInfo: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
  };
}

export async function checkBalance(
  userAddress: string,
  userPrivateKey: string
): Promise<BalanceResult> {
  try {
    console.log(`🔍 Consultando balance para usuario: ${userAddress}`);

    // Crear wallet
    const wallet = new ethers.Wallet(userPrivateKey, ethers.provider);

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
    const tokenName = await testERC20.name();
    const tokenSymbol = await testERC20.symbol();
    const tokenDecimals = await testERC20.decimals();

    // Obtener balance público
    const publicBalance = await testERC20.balanceOf(userAddress);

    // Intentar obtener balance cifrado
    let encryptedAmount = "0";
    let isDecrypted = false;

    try {
      // Generar claves desde signature para descifrado
      const message = `eERC\nRegistering user with\n Address:${userAddress.toLowerCase()}`;
      const signature = await wallet.signMessage(message);
      const userPrivateKeyFromSig = i0(signature);
      const formattedPrivateKey = formatPrivKeyForBabyJub(userPrivateKeyFromSig);

      // Obtener token ID
      const tokenId = await encryptedERC.getTokenId(testERC20Address);
      
      // Obtener balance cifrado
      const balanceData = await encryptedERC.getEncryptedBalanceUser(userAddress, tokenId);
      
      // Aquí deberías implementar el descifrado del balance
      // Por ahora, retornamos un placeholder
      if (balanceData && balanceData.length > 0) {
        // Implementar lógica de descifrado según tu sistema
        encryptedAmount = "0.1"; // Placeholder
        isDecrypted = true;
      }

    } catch (error) {
      console.log("No se pudo descifrar el balance o no existe balance cifrado");
      encryptedAmount = "0";
      isDecrypted = false;
    }

    return {
      userAddress,
      publicBalance: {
        amount: ethers.formatUnits(publicBalance, tokenDecimals),
        symbol: tokenSymbol,
        decimals: Number(tokenDecimals)
      },
      encryptedBalance: {
        amount: encryptedAmount,
        isDecrypted
      },
      tokenInfo: {
        address: testERC20Address,
        name: tokenName,
        symbol: tokenSymbol,
        decimals: Number(tokenDecimals)
      }
    };

  } catch (error) {
    console.error("Error en checkBalance:", error);
    throw new Error(`Error al consultar balance: ${error.message}`);
  }
}
