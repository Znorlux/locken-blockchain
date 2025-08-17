import { ethers, zkit } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { Base8, mulPointEscalar, subOrder } from "@zk-kit/baby-jubjub";
import { formatPrivKeyForBabyJub, genPrivKey } from "maci-crypto";
import { poseidon3 } from "poseidon-lite";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import type { RegistrationCircuit } from "../generated-types/zkit";

const main = async () => {
  // Use specific PRIVATE_KEY for registration
  // const [wallet] = await ethers.getSigners();
  const [owner, wallet] = await ethers.getSigners(); //usuario 2
  //const [wallet] = await ethers.getSigners(); // usuario 1

  const userAddress = await wallet.getAddress();

  // Read deployment addresses
  const deploymentPath = path.join(
    __dirname,
    "../deployments/latest-fuji.json"
  );
  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const registrarAddress = deploymentData.contracts.registrar;

  console.log("🔧 Registering user in EncryptedERC using zkit...");
  console.log("Registrar:", registrarAddress);
  console.log("User to register:", userAddress);

  // Check gas balance
  const balance = await ethers.provider.getBalance(userAddress);
  console.log("💰 Current balance:", ethers.formatEther(balance), "AVAX");

  if (balance === 0n) {
    throw new Error(
      "❌ Account has no funds to pay gas. You need to send ETH to this address."
    );
  }

  // Check if there's enough gas (rough estimate)
  const estimatedGas = ethers.parseUnits("0.01", "ether"); // Conservative estimate
  if (balance < estimatedGas) {
    console.warn("⚠️  Low balance. May not be sufficient for the transaction.");
    console.warn("   Current balance:", ethers.formatEther(balance), "AVAX");
    console.warn(
      "   Required estimate:",
      ethers.formatEther(estimatedGas),
      "AVAX"
    );
  }

  // Connect to contract using the specific wallet
  const registrar = await ethers.getContractAt(
    "Registrar",
    registrarAddress,
    wallet
  );

  // 1. Check if already registered
  const isRegistered = await registrar.isUserRegistered(userAddress);
  if (isRegistered) {
    console.log("✅ User is already registered");
    return;
  }

  // 2. Generate deterministic private key from signature
  const message = `eERC
Registering user with
 Address:${userAddress.toLowerCase()}`;
  console.log("📝 Message to sign for balance:", message);
  const signature = await wallet.signMessage(message);
  if (!signature || signature.length < 64) {
    throw new Error("Invalid signature received from user");
  }

  // Derive private key from signature deterministically
  console.log("🔑 Deriving private key from signature...");
  const privateKey = i0(signature);
  console.log("Private key (raw):", privateKey.toString());

  // Format private key for BabyJubJub
  const formattedPrivateKey = formatPrivKeyForBabyJub(privateKey) % subOrder;
  console.log("Private key (formatted):", formattedPrivateKey.toString());

  // Generate public key using BabyJubJub
  const publicKey = mulPointEscalar(Base8, formattedPrivateKey).map((x) =>
    BigInt(x)
  );
  console.log("Public key X:", publicKey[0].toString());
  console.log("Public key Y:", publicKey[1].toString());

  // 3. Generate registration hash using poseidon3
  const chainId = await ethers.provider.getNetwork().then((net) => net.chainId);
  const address = userAddress;

  const registrationHash = poseidon3([
    BigInt(chainId),
    formattedPrivateKey,
    BigInt(address),
  ]);

  console.log("Chain ID:", chainId.toString());
  console.log("Address:", address);
  console.log("Registration Hash:", registrationHash.toString());

  // 4. Generate proof using zkit
  console.log("🔐 Generating registration proof using zkit...");
  try {
    // Get the registration circuit
    const circuit = await zkit.getCircuit("RegistrationCircuit");
    const registrationCircuit = circuit as unknown as RegistrationCircuit;

    // Prepare inputs for the circuit
    const input = {
      SenderPrivateKey: formattedPrivateKey,
      SenderPublicKey: [publicKey[0], publicKey[1]],
      SenderAddress: BigInt(address),
      ChainID: BigInt(chainId),
      RegistrationHash: registrationHash,
    };

    console.log("📋 Circuit inputs:", input);

    // Generate proof
    const proof = await registrationCircuit.generateProof(input);
    console.log("✅ Proof generated successfully using zkit");

    // Generate calldata for the contract
    const calldata = await registrationCircuit.generateCalldata(proof);
    console.log("✅ Calldata generated successfully");

    // 5. Call the contract
    console.log("📝 Registering in the contract...");
    try {
      const registerTx = await registrar.register(calldata);
      await registerTx.wait();

      console.log("✅ User registered successfully!");
    } catch (contractError) {
      console.error("❌ Contract error: ", contractError);

      // Extract contract error message
      if (contractError instanceof Error) {
        const errorMessage = contractError.message;

        // Look for specific contract error message
        if (errorMessage.includes("execution reverted")) {
          // Try to extract custom error message
          const revertMatch = errorMessage.match(/execution reverted: (.+)/);
          if (revertMatch && revertMatch[1]) {
            console.error("Contract error message:", revertMatch[1]);
          } else {
            console.error("Contract reverted without specific message");
          }
        } else {
          console.error("Full error:", errorMessage);
        }

        // Show additional information for debugging
        console.error("Error details:");
        console.error("- Message:", errorMessage);
        console.error("- Stack:", contractError.stack);
      } else {
        console.error("Unknown error:", contractError);
      }

      throw contractError;
    }

    // 6. Verify registration
    const isNowRegistered = await registrar.isUserRegistered(userAddress);
    const userPublicKey = await registrar.getUserPublicKey(userAddress);

    console.log("Verification:");
    console.log("- Registered:", isNowRegistered);
    console.log("- Public key X:", userPublicKey[0].toString());
    console.log("- Public key Y:", userPublicKey[1].toString());

    // 7. Save generated keys for future use
    const userKeys = {
      address: address,
      privateKey: {
        raw: privateKey.toString(),
        formatted: formattedPrivateKey.toString(),
      },
      publicKey: {
        x: publicKey[0].toString(),
        y: publicKey[1].toString(),
      },
      registrationHash: registrationHash.toString(),
    };

    const keysPath = path.join(__dirname, "../deployments/user-keys.json");
    fs.writeFileSync(keysPath, JSON.stringify(userKeys, null, 2));
    console.log("🔑 User keys saved to:", keysPath);
  } catch (error) {
    console.error("❌ Error during registration:");

    // Show detailed error information
    if (error instanceof Error) {
      console.error("Error type:", error.constructor.name);
      console.error("Message:", error.message);

      // If it's a contract error, it was already handled above
      if (error.message.includes("execution reverted")) {
        console.error("This is a contract execution error");
      }

      // Show stack trace for debugging
      if (error.stack) {
        console.error("Stack trace:");
        console.error(error.stack);
      }
    } else {
      console.error("Unknown error:", error);
    }

    throw error;
  }
};

// Function to derive 32 bytes from signature (i0 function)
export function i0(signature: string): bigint {
  if (typeof signature !== "string" || signature.length < 132)
    throw new Error("Invalid signature hex string");

  const hash = ethers.keccak256(signature as `0x${string}`); // 0x…
  const cleanSig = hash.startsWith("0x") ? hash.slice(2) : hash;
  let bytes = hexToBytes(cleanSig); // Uint8Array(32)

  bytes[0] &= 0b11111000;
  bytes[31] &= 0b01111111;
  bytes[31] |= 0b01000000;

  const le = bytes.reverse(); // noble utils entrega big-endian
  let sk = BigInt(`0x${bytesToHex(le)}`);

  sk %= subOrder;
  if (sk === BigInt(0)) sk = BigInt(1); // nunca cero
  return sk; // listo para mulPointEscalar
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
