import { ethers } from "ethers";
import { zkit } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { Base8, mulPointEscalar, subOrder } from "@zk-kit/baby-jubjub";
import { formatPrivKeyForBabyJub } from "maci-crypto";
import { poseidon3 } from "poseidon-lite";
import { i0 } from "../../helpers/crypto";
import type { RegistrationCircuit } from "../../../generated-types/zkit";

export interface RegisterUserResult {
  userAddress: string;
  publicKey: [string, string];
  transactionHash: string;
  blockNumber: number;
  isAlreadyRegistered: boolean;
}

export async function registerUser(
  userPrivateKey: string, 
  signature?: string
): Promise<RegisterUserResult> {
  try {
    // Crear wallet desde private key
    const wallet = new ethers.Wallet(userPrivateKey, ethers.provider);
    const userAddress = await wallet.getAddress();

    console.log(`📝 Registrando usuario: ${userAddress}`);

    // Leer información de deployment
    const deploymentPath = path.join(__dirname, "../../../deployments/latest-fuji.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const registrarAddress = deploymentData.contracts.registrar;

    // Conectar al contrato
    const registrar = await ethers.getContractAt("Registrar", registrarAddress, wallet);

    // Verificar si ya está registrado
    const isRegistered = await registrar.isUserRegistered(userAddress);
    if (isRegistered) {
      const existingPublicKey = await registrar.getUserPublicKey(userAddress);
      return {
        userAddress,
        publicKey: [existingPublicKey[0].toString(), existingPublicKey[1].toString()],
        transactionHash: '',
        blockNumber: 0,
        isAlreadyRegistered: true
      };
    }

    // Generar signature si no se proporciona
    let finalSignature = signature;
    if (!finalSignature) {
      const message = `eERC\nRegistering user with\n Address:${userAddress.toLowerCase()}`;
      finalSignature = await wallet.signMessage(message);
    }

    if (!finalSignature || finalSignature.length < 64) {
      throw new Error("Signature inválida");
    }

    // Derivar claves desde signature
    const privateKeyFromSig = i0(finalSignature);
    const formattedPrivateKey = formatPrivKeyForBabyJub(privateKeyFromSig) % subOrder;
    
    // Generar clave pública usando BabyJubJub
    const publicKey = mulPointEscalar(Base8, formattedPrivateKey).map((x) => BigInt(x));

    // Generar hash de registro
    const chainId = await ethers.provider.getNetwork().then((net: any) => net.chainId);
    const registrationHash = poseidon3([
      BigInt(chainId),
      formattedPrivateKey,
      BigInt(userAddress),
    ]);

    // Generar proof usando zkit
    console.log("🔐 Generando proof de registro...");
    const circuit = await zkit.getCircuit("RegistrationCircuit");
    const proof = await circuit.generateProof({
      chainId,
      privateKey: formattedPrivateKey,
      userAddress: BigInt(userAddress),
    });

    console.log("✅ Proof generado exitosamente");

    // Enviar transacción de registro
    console.log("📝 Enviando transacción de registro...");
    const tx = await registrar.registerUser(
      publicKey,
      proof.publicSignals,
      proof.proof
    );

    console.log("⏳ Esperando confirmación...");
    const receipt = await tx.wait();

    console.log("✅ Usuario registrado exitosamente");

    // Guardar claves para uso posterior
    const keysData = {
      userAddress,
      privateKey: formattedPrivateKey.toString(),
      publicKey: [publicKey[0].toString(), publicKey[1].toString()],
      signature: finalSignature,
      timestamp: new Date().toISOString(),
      keysMatch: true
    };

    const keysPath = path.join(__dirname, "../../../deployments/user-keys.json");
    fs.writeFileSync(keysPath, JSON.stringify(keysData, null, 2));

    return {
      userAddress,
      publicKey: [publicKey[0].toString(), publicKey[1].toString()],
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      isAlreadyRegistered: false
    };

  } catch (error) {
    console.error("Error en registerUser:", error);
    throw new Error(`Error al registrar usuario: ${(error as Error).message}`);
  }
}

export async function getUserStatus(address: string) {
  try {
    if (!ethers.isAddress(address)) {
      throw new Error("Dirección inválida");
    }

    const deploymentPath = path.join(__dirname, "../../../deployments/latest-fuji.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    
    const registrar = await ethers.getContractAt("Registrar", deploymentData.contracts.registrar);
    const isRegistered = await registrar.isUserRegistered(address);
    
    let publicKey = null;
    if (isRegistered) {
      const userPublicKey = await registrar.getUserPublicKey(address);
      publicKey = [userPublicKey[0].toString(), userPublicKey[1].toString()];
    }

    return {
      address,
      isRegistered,
      publicKey
    };

  } catch (error) {
    console.error("Error en getUserStatus:", error);
    throw new Error(`Error al verificar estado del usuario: ${(error as Error).message}`);
  }
}
