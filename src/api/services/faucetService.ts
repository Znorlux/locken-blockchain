import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

export interface FaucetResult {
  userAddress: string;
  tokenAddress: string;
  amount: string;
  transactionHash: string;
  blockNumber: number;
  balance: {
    before: string;
    after: string;
  };
}

export async function getFaucetTokens(userAddress: string): Promise<FaucetResult> {
  try {
    console.log(`🚰 Solicitando tokens del faucet para: ${userAddress}`);

    // Validar dirección
    if (!ethers.isAddress(userAddress)) {
      throw new Error("Dirección inválida");
    }

    // Leer información de deployment
    const deploymentPath = path.join(__dirname, "../../../deployments/latest-fuji.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const testERC20Address = deploymentData.contracts.testERC20;

    // Usar el primer signer como faucet (debe tener tokens)
    const [faucetWallet] = await ethers.getSigners();
    
    // Conectar al contrato de tokens
    const testERC20 = await ethers.getContractAt("SimpleERC20", testERC20Address, faucetWallet);

    // Obtener información del token
    const tokenSymbol = await testERC20.symbol();
    const tokenDecimals = await testERC20.decimals();
    
    // Cantidad fija del faucet (100 tokens)
    const faucetAmount = ethers.parseUnits("100", tokenDecimals);

    // Verificar balance del usuario antes
    const balanceBefore = await testERC20.balanceOf(userAddress);

    // Verificar que el faucet tenga suficientes tokens
    const faucetBalance = await testERC20.balanceOf(faucetWallet.address);
    if (faucetBalance < faucetAmount) {
      throw new Error("El faucet no tiene suficientes tokens");
    }

    // Verificar si el usuario ya tiene suficientes tokens (opcional)
    const minimumBalance = ethers.parseUnits("10", tokenDecimals);
    if (balanceBefore > minimumBalance) {
      console.log(`Usuario ya tiene ${ethers.formatUnits(balanceBefore, tokenDecimals)} ${tokenSymbol}`);
      // Puedes elegir si permitir múltiples solicitudes o no
    }

    // Enviar tokens del faucet
    console.log(`💰 Enviando ${ethers.formatUnits(faucetAmount, tokenDecimals)} ${tokenSymbol} desde faucet...`);
    
    const transferTx = await testERC20.transfer(userAddress, faucetAmount);
    
    console.log("⏳ Esperando confirmación...");
    const receipt = await transferTx.wait();

    // Verificar balance después
    const balanceAfter = await testERC20.balanceOf(userAddress);

    console.log("✅ Tokens del faucet enviados exitosamente");

    return {
      userAddress,
      tokenAddress: testERC20Address,
      amount: ethers.formatUnits(faucetAmount, tokenDecimals),
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      balance: {
        before: ethers.formatUnits(balanceBefore, tokenDecimals),
        after: ethers.formatUnits(balanceAfter, tokenDecimals)
      }
    };

  } catch (error) {
    console.error("Error en getFaucetTokens:", error);
    throw new Error(`Error al solicitar tokens del faucet: ${error.message}`);
  }
}

export async function getFaucetStatus(): Promise<{
  faucetAddress: string;
  tokenAddress: string;
  balance: string;
  symbol: string;
  isActive: boolean;
}> {
  try {
    const deploymentPath = path.join(__dirname, "../../../deployments/latest-fuji.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const testERC20Address = deploymentData.contracts.testERC20;

    const [faucetWallet] = await ethers.getSigners();
    const testERC20 = await ethers.getContractAt("SimpleERC20", testERC20Address);

    const balance = await testERC20.balanceOf(faucetWallet.address);
    const symbol = await testERC20.symbol();
    const decimals = await testERC20.decimals();

    const minimumFaucetBalance = ethers.parseUnits("1000", decimals);
    const isActive = balance > minimumFaucetBalance;

    return {
      faucetAddress: faucetWallet.address,
      tokenAddress: testERC20Address,
      balance: ethers.formatUnits(balance, decimals),
      symbol,
      isActive
    };

  } catch (error) {
    console.error("Error en getFaucetStatus:", error);
    throw new Error(`Error al obtener estado del faucet: ${error.message}`);
  }
}
