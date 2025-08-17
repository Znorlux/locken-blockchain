import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { processPoseidonEncryption } from "../src/poseidon";
import { decryptPCT } from "../test/helpers";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { subOrder, mulPointEscalar, Base8 } from "@zk-kit/baby-jubjub";
import { formatPrivKeyForBabyJub } from "maci-crypto";
import { decryptPoint } from "../src/jub/jub";

// Derive private key from signature (same method as registration)
export function i0(signature: string): bigint {
  if (typeof signature !== "string" || signature.length < 132)
    throw new Error("Invalid signature hex string");

  const hash = ethers.keccak256(signature as `0x${string}`);
  const cleanSig = hash.startsWith("0x") ? hash.slice(2) : hash;
  let bytes = hexToBytes(cleanSig);

  bytes[0] &= 0b11111000;
  bytes[31] &= 0b01111111;
  bytes[31] |= 0b01000000;

  const le = bytes.reverse();
  let sk = BigInt(`0x${bytesToHex(le)}`);

  sk %= subOrder;
  if (sk === BigInt(0)) sk = BigInt(1);
  return sk;
}

// Local decryptPoint function removed - using imported version from jub module

// Function to decrypt EGCT using ElGamal decryption and find the discrete log
function decryptEGCTBalance(
  privateKey: bigint,
  c1: [bigint, bigint],
  c2: [bigint, bigint]
): bigint {
  try {
    // Decrypt the point using ElGamal
    const decryptedPoint = decryptPoint(privateKey, c1, c2);

    // Find the discrete log (brute force for small values)
    // The balance should be relatively small, so we can brute force
    for (let i = 0n; i <= 10000n; i++) {
      const testPoint = mulPointEscalar(Base8, i);
      if (
        testPoint[0] === decryptedPoint[0] &&
        testPoint[1] === decryptedPoint[1]
      ) {
        return i;
      }
    }

    console.log(
      "⚠️  Could not find discrete log for decrypted point:",
      decryptedPoint
    );
    return 0n;
  } catch (error) {
    console.log("⚠️  Error decrypting EGCT:", error);
    return 0n;
  }
}

// Function to get decrypted balance from encrypted balance
async function getDecryptedBalance(
  privateKey: bigint,
  amountPCTs: any[],
  balancePCT: bigint[],
  encryptedBalance: bigint[][]
): Promise<bigint> {
  // First, try to decrypt the EGCT (main encrypted balance)
  const c1: [bigint, bigint] = [encryptedBalance[0][0], encryptedBalance[0][1]];
  const c2: [bigint, bigint] = [encryptedBalance[1][0], encryptedBalance[1][1]];

  // Check if EGCT is empty (all zeros)
  const isEGCTEmpty =
    c1[0] === 0n && c1[1] === 0n && c2[0] === 0n && c2[1] === 0n;

  if (!isEGCTEmpty) {
    // Decrypt EGCT - this is the primary balance
    const egctBalance = decryptEGCTBalance(privateKey, c1, c2);
    console.log("🔐 EGCT Balance found:", egctBalance.toString());
    return egctBalance;
  }

  // If EGCT is empty, fall back to PCT decryption
  let totalBalance = 0n;

  // Decrypt the balance PCT if it exists
  if (balancePCT.some((e) => e !== 0n)) {
    try {
      const decryptedBalancePCT = await decryptPCT(privateKey, balancePCT);
      totalBalance += BigInt(decryptedBalancePCT[0]);
    } catch (error) {
      console.log("Note: Balance PCT is empty or couldn't be decrypted");
    }
  }

  // Decrypt all the amount PCTs and add them to the total balance
  for (const amountPCT of amountPCTs) {
    if (amountPCT.pct && amountPCT.pct.some((e: bigint) => e !== 0n)) {
      try {
        const decryptedAmountPCT = await decryptPCT(privateKey, amountPCT.pct);
        totalBalance += BigInt(decryptedAmountPCT[0]);
      } catch (error) {
        console.log("Note: Some amount PCT couldn't be decrypted");
      }
    }
  }

  return totalBalance;
}

const main = async () => {
  // Get the wallet
  //const [owner, wallet] = await ethers.getSigners(); // usuario 2
  const [wallet] = await ethers.getSigners(); // usuario 1
  const userAddress = await wallet.getAddress();

  // Read addresses from the latest deployment
  const deploymentPath = path.join(
    __dirname,
    "../deployments/latest-fuji.json"
  );
  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const encryptedERCAddress = deploymentData.contracts.encryptedERC;
  const testERC20Address = deploymentData.contracts.testERC20;
  const registrarAddress = deploymentData.contracts.registrar;

  console.log("🔧 Depositing 1 TEST token into EncryptedERC...");
  console.log("User address:", userAddress);
  console.log("EncryptedERC:", encryptedERCAddress);
  console.log("TestERC20:", testERC20Address);

  // Check gas balance
  const balance = await ethers.provider.getBalance(userAddress);
  console.log("💰 Current AVAX balance:", ethers.formatEther(balance), "AVAX");

  if (balance === 0n) {
    throw new Error(
      "❌ Account has no funds to pay gas. You need to send AVAX to this address."
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

  // Connect to contracts using the wallet
  const testERC20 = await ethers.getContractAt(
    "SimpleERC20",
    testERC20Address,
    wallet
  );
  const encryptedERC = await ethers.getContractAt(
    "EncryptedERC",
    encryptedERCAddress,
    wallet
  );
  const registrar = await ethers.getContractAt(
    "Registrar",
    registrarAddress,
    wallet
  );

  try {
    // 1. Check if user is registered
    const isRegistered = await registrar.isUserRegistered(userAddress);
    if (!isRegistered) {
      console.error(
        "❌ User is not registered. Please run the registration script first."
      );
      console.log(
        "💡 Run: npx hardhat run scripts/03_register-user.ts --network fuji"
      );
      return;
    }
    console.log("✅ User is registered");

    // 2. Generate signature and derive private key (for balance decryption)
    console.log("🔐 Generating signature for balance decryption...");
    const message = `eERC
Registering user with
 Address:${userAddress.toLowerCase()}`;
    console.log("📝 Message to sign for balance:", message);
    const signature = await wallet.signMessage(message);
    if (!signature || signature.length < 64) {
      throw new Error("Invalid signature received from user");
    }
    console.log("✅ Signature generated");

    // Derive private key from signature
    const userPrivateKey = i0(signature);
    const formattedPrivateKey = formatPrivKeyForBabyJub(userPrivateKey);
    console.log("🔑 Private key derived from signature");

    // Derive public key from private key (for verification)
    const derivedPublicKey = mulPointEscalar(Base8, formattedPrivateKey);
    console.log("🔑 Derived public key:", [
      derivedPublicKey[0].toString(),
      derivedPublicKey[1].toString(),
    ]);

    // 3. Get user's public key for PCT generation
    const userPublicKey = await registrar.getUserPublicKey(userAddress);
    console.log("🔑 User public key:", [
      userPublicKey[0].toString(),
      userPublicKey[1].toString(),
    ]);

    // Verify public keys match (they should be the same)
    const publicKeysMatch =
      derivedPublicKey[0] === BigInt(userPublicKey[0].toString()) &&
      derivedPublicKey[1] === BigInt(userPublicKey[1].toString());
    if (publicKeysMatch) {
      console.log("✅ Derived public key matches registered public key");
    } else {
      console.log(
        "⚠️  Derived public key doesn't match registered key - this may cause decryption issues"
      );
    }

    // 4. Check testERC20 balance
    const tokenBalance = await testERC20.balanceOf(userAddress);
    const tokenDecimals = await testERC20.decimals();
    const tokenSymbol = await testERC20.symbol();

    console.log(
      `💰 Current ${tokenSymbol} balance:`,
      ethers.formatUnits(tokenBalance, tokenDecimals),
      tokenSymbol
    );

    // 5. Check current encrypted balance before deposit
    console.log("🔍 Checking current encrypted balance...");
    try {
      // Get token ID for testERC20 (0 if not registered, or actual ID if registered)
      let tokenId = 0n;
      try {
        tokenId = await encryptedERC.tokenIds(testERC20Address);
        if (tokenId === 0n) {
          console.log(
            "📋 Token not yet registered in EncryptedERC (will be registered on first deposit)"
          );
        }
      } catch (error) {
        console.log("📋 Token not yet registered in EncryptedERC");
      }

      // Get encrypted balance components using balanceOf function
      const [eGCT, nonce, amountPCTs, balancePCT, transactionIndex] =
        await encryptedERC.balanceOf(userAddress, tokenId);
      const encryptedBalance = [
        [BigInt(eGCT.c1.x.toString()), BigInt(eGCT.c1.y.toString())],
        [BigInt(eGCT.c2.x.toString()), BigInt(eGCT.c2.y.toString())],
      ];
      console.log({ encryptedBalance });
      const balancePCTArray = balancePCT.map((x: any) => BigInt(x.toString()));

      // Decrypt and calculate total balance
      const decryptedBalance = await getDecryptedBalance(
        userPrivateKey,
        amountPCTs,
        balancePCTArray,
        encryptedBalance
      );
      console.log({ decryptedBalance });

      // Convert to display units (the encrypted system uses 2 decimals as per constants)
      const encryptedSystemDecimals = 2;
      console.log(
        `🔒 Current encrypted balance: ${ethers.formatUnits(decryptedBalance, encryptedSystemDecimals)} (encrypted units)`
      );
    } catch (error) {
      console.log(
        "📋 No existing encrypted balance found (this is normal for first deposit)"
      );
    }

    // Amount to deposit: 1 TEST token
    const depositAmount = ethers.parseUnits("10", tokenDecimals);

    if (tokenBalance < depositAmount) {
      console.error(
        `❌ Insufficient ${tokenSymbol} balance. Required: 1 ${tokenSymbol}, Available:`,
        ethers.formatUnits(tokenBalance, tokenDecimals),
        tokenSymbol
      );
      console.log(
        "💡 Get more tokens from faucet: npx hardhat run scripts/05_get_faucet.ts --network fuji"
      );
      return;
    }

    // 4. Check allowance
    const currentAllowance = await testERC20.allowance(
      userAddress,
      encryptedERCAddress
    );
    console.log(
      `📋 Current allowance:`,
      ethers.formatUnits(currentAllowance, tokenDecimals),
      tokenSymbol
    );

    if (currentAllowance < depositAmount) {
      console.log(`🔓 Approving ${tokenSymbol} spending for EncryptedERC...`);
      const approveTx = await testERC20.approve(
        encryptedERCAddress,
        depositAmount
      );
      console.log("📝 Approval transaction sent:", approveTx.hash);
      await approveTx.wait();
      console.log("✅ Approval confirmed");
    } else {
      console.log("✅ Allowance already sufficient");
    }

    // 5. Generate amountPCT for auditing
    console.log("🔐 Generating amountPCT for auditing...");
    const depositAmountBigInt = BigInt(depositAmount.toString());
    const publicKeyBigInt = [
      BigInt(userPublicKey[0].toString()),
      BigInt(userPublicKey[1].toString()),
    ];

    const {
      ciphertext: amountCiphertext,
      nonce: amountNonce,
      authKey: amountAuthKey,
    } = processPoseidonEncryption([depositAmountBigInt], publicKeyBigInt);

    // Format amountPCT as [ciphertext (5 elements), authKey (2 elements), nonce (1 element)] = 7 elements total
    const amountPCT: [bigint, bigint, bigint, bigint, bigint, bigint, bigint] =
      [...amountCiphertext, ...amountAuthKey, amountNonce] as [
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
      ];

    console.log("✅ AmountPCT generated successfully");

    // 6. Perform the deposit
    console.log(`💾 Depositing 1 ${tokenSymbol} into EncryptedERC...`);
    const depositTx = await encryptedERC.deposit(
      depositAmount,
      testERC20Address,
      amountPCT
    );
    console.log("📝 Deposit transaction sent:", depositTx.hash);

    const receipt = await depositTx.wait();
    console.log(
      "✅ Deposit transaction confirmed in block:",
      receipt?.blockNumber
    );

    // 7. Check results
    const newTokenBalance = await testERC20.balanceOf(userAddress);
    const deposited = tokenBalance - newTokenBalance;

    console.log("🎉 Deposit successful!");
    console.log(
      `💰 Previous ${tokenSymbol} balance:`,
      ethers.formatUnits(tokenBalance, tokenDecimals),
      tokenSymbol
    );
    console.log(
      `💰 New ${tokenSymbol} balance:`,
      ethers.formatUnits(newTokenBalance, tokenDecimals),
      tokenSymbol
    );
    console.log(
      `📦 Amount deposited:`,
      ethers.formatUnits(deposited, tokenDecimals),
      tokenSymbol
    );

    // 8. Check encrypted balance after deposit
    console.log("\n🔍 Checking encrypted balance after deposit...");
    try {
      // Get the updated token ID (should be set now if it wasn't before)
      const finalTokenId = await encryptedERC.tokenIds(testERC20Address);

      // Get updated encrypted balance components using balanceOf function
      const [
        updatedEGCT,
        updatedNonce,
        updatedAmountPCTs,
        updatedBalancePCT,
        updatedTransactionIndex,
      ] = await encryptedERC.balanceOf(userAddress, finalTokenId);
      const updatedEncryptedBalance = [
        [
          BigInt(updatedEGCT.c1.x.toString()),
          BigInt(updatedEGCT.c1.y.toString()),
        ],
        [
          BigInt(updatedEGCT.c2.x.toString()),
          BigInt(updatedEGCT.c2.y.toString()),
        ],
      ];

      const updatedBalancePCTArray = updatedBalancePCT.map((x: any) =>
        BigInt(x.toString())
      );

      // Decrypt and calculate new total balance
      const newDecryptedBalance = await getDecryptedBalance(
        userPrivateKey,
        updatedAmountPCTs,
        updatedBalancePCTArray,
        updatedEncryptedBalance
      );

      // Convert to display units
      const encryptedSystemDecimals = 2;
      console.log(
        `🔒 Updated encrypted balance: ${ethers.formatUnits(newDecryptedBalance, encryptedSystemDecimals)} (encrypted units)`
      );
      console.log(`📋 Token ID in system: ${finalTokenId.toString()}`);

      // Show balance change in encrypted system
      console.log("\n📊 Balance Summary:");
      console.log(
        `   Public ${tokenSymbol} Balance: ${ethers.formatUnits(tokenBalance, tokenDecimals)} → ${ethers.formatUnits(newTokenBalance, tokenDecimals)}`
      );
      console.log(
        `   Private Encrypted Balance: ${ethers.formatUnits(newDecryptedBalance, encryptedSystemDecimals)} encrypted units`
      );
    } catch (error) {
      console.error(
        "❌ Error checking encrypted balance after deposit:",
        error
      );
    }

    // 8. Check if there were any dust returns (from decimal scaling)
    if (receipt) {
      const logs = receipt.logs;
      for (const log of logs) {
        try {
          const parsed = encryptedERC.interface.parseLog(log);
          if (parsed && parsed.name === "Deposit") {
            const [user, amount, dust, tokenId] = parsed.args;
            console.log("📋 Deposit Details:");
            console.log("  - User:", user);
            console.log(
              "  - Amount:",
              ethers.formatUnits(amount, tokenDecimals),
              tokenSymbol
            );
            console.log(
              "  - Dust returned:",
              ethers.formatUnits(dust, tokenDecimals),
              tokenSymbol
            );
            console.log("  - Token ID:", tokenId.toString());

            if (dust > 0n) {
              console.log(
                "💡 Some dust was returned due to decimal scaling differences"
              );
            }
          }
        } catch (e) {
          // Skip logs that can't be parsed by this contract
        }
      }
    }

    // Save keys for future reference
    const keysData = {
      userAddress,
      signature,
      privateKey: userPrivateKey.toString(),
      formattedPrivateKey: formattedPrivateKey.toString(),
      publicKey: [
        derivedPublicKey[0].toString(),
        derivedPublicKey[1].toString(),
      ],
      lastUpdated: new Date().toISOString(),
      note: "Keys for decrypting encrypted balances in EncryptedERC",
    };

    const keysPath = path.join(__dirname, "../deployments/user-keys.json");
    fs.writeFileSync(keysPath, JSON.stringify(keysData, null, 2));
    console.log(`\n🔑 Keys saved to: ${keysPath}`);

    console.log("\n🎯 Next Steps:");
    console.log(
      "   • Your tokens are now privately encrypted in the EncryptedERC contract"
    );
    console.log(
      "   • You can perform private transfers to other registered users"
    );
    console.log(
      "   • You can withdraw your tokens back to regular ERC20 format"
    );
    console.log("   • Your keys are saved for future balance checking");
  } catch (error) {
    console.error("❌ Error during deposit:");

    // Show detailed error information
    if (error instanceof Error) {
      console.error("Error type:", error.constructor.name);
      console.error("Message:", error.message);

      // Handle specific errors
      if (error.message.includes("User not registered")) {
        console.error(
          "💡 Hint: Please register your user first with the registration script"
        );
      } else if (error.message.includes("Auditor not set")) {
        console.error(
          "💡 Hint: The auditor needs to be set in the EncryptedERC contract"
        );
      } else if (error.message.includes("Contract is not in converter mode")) {
        console.error(
          "💡 Hint: The EncryptedERC contract needs to be in converter mode for deposits"
        );
      } else if (error.message.includes("Token is blacklisted")) {
        console.error(
          "💡 Hint: The token you're trying to deposit is blacklisted"
        );
      } else if (error.message.includes("ERC20: insufficient allowance")) {
        console.error(
          "💡 Hint: Increase the allowance for the EncryptedERC contract"
        );
      } else if (
        error.message.includes("ERC20: transfer amount exceeds balance")
      ) {
        console.error("💡 Hint: You don't have enough tokens to deposit");
      } else if (error.message.includes("execution reverted")) {
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
