import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const main = async () => {
  // Use specific PRIVATE_KEY for the faucet claim
  const [wallet] = await ethers.getSigners();
  //const [owner, wallet] = await ethers.getSigners();

  // Create wallet with the PRIVATE_KEY
  const userAddress = await wallet.getAddress();

  // Read addresses from the latest deployment
  const deploymentPath = path.join(
    __dirname,
    "../deployments/latest-fuji.json"
  );
  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const testERC20Address = deploymentData.contracts.testERC20;

  console.log("🔧 Claiming tokens from testERC20 faucet...");
  console.log("Token address:", testERC20Address);
  console.log("User address:", userAddress);

  // Check gas balance
  const balance = await ethers.provider.getBalance(userAddress);
  console.log("💰 Current AVAX balance:", ethers.formatEther(balance), "AVAX");

  if (balance === 0n) {
    throw new Error(
      "❌ Account has no funds to pay gas. You need to send AVAX to this address."
    );
  }

  // Check if there's enough gas (rough estimate)
  const estimatedGas = ethers.parseUnits("0.005", "ether"); // Small estimate for faucet claim
  if (balance < estimatedGas) {
    console.warn("⚠️  Low balance. May not be sufficient for the transaction.");
    console.warn("   Current balance:", ethers.formatEther(balance), "AVAX");
    console.warn(
      "   Required estimate:",
      ethers.formatEther(estimatedGas),
      "AVAX"
    );
  }

  // Connect to the testERC20 contract using the wallet
  const testERC20 = await ethers.getContractAt(
    "SimpleERC20",
    testERC20Address,
    wallet
  );

  try {
    // Get token details
    const name = await testERC20.name();
    const symbol = await testERC20.symbol();
    const decimals = await testERC20.decimals();
    const faucetAmount = await testERC20.FAUCET_AMOUNT();

    console.log("📋 Token Details:");
    console.log("- Name:", name);
    console.log("- Symbol:", symbol);
    console.log("- Decimals:", decimals.toString());
    console.log(
      "- Faucet amount:",
      ethers.formatUnits(faucetAmount, decimals),
      symbol
    );

    // Check current token balance
    const currentBalance = await testERC20.balanceOf(userAddress);
    console.log(
      "💰 Current token balance:",
      ethers.formatUnits(currentBalance, decimals),
      symbol
    );

    // Check if user can claim from faucet
    const canClaim = await testERC20.canClaimFromFaucet(userAddress);
    console.log("🚰 Can claim from faucet:", canClaim);

    if (!canClaim) {
      // Get next claim time
      const nextClaimTime = await testERC20.getNextFaucetClaimTime(userAddress);
      const now = Math.floor(Date.now() / 1000);
      const waitTime = Number(nextClaimTime) - now;

      if (waitTime > 0) {
        const hours = Math.floor(waitTime / 3600);
        const minutes = Math.floor((waitTime % 3600) / 60);
        console.log(`⏰ Next claim available in: ${hours}h ${minutes}m`);
        console.log(
          `⏰ Next claim time: ${new Date(Number(nextClaimTime) * 1000).toLocaleString()}`
        );
      } else {
        console.log("🤔 Claim should be available, trying anyway...");
      }
    }

    if (canClaim) {
      console.log("🚰 Claiming tokens from faucet...");

      // Claim from faucet
      const claimTx = await testERC20.claimFromFaucet();
      console.log("📝 Transaction sent:", claimTx.hash);

      const receipt = await claimTx.wait();
      console.log("✅ Transaction confirmed in block:", receipt?.blockNumber);

      // Check new balance
      const newBalance = await testERC20.balanceOf(userAddress);
      const received = newBalance - currentBalance;

      console.log("🎉 Faucet claim successful!");
      console.log(
        "💰 Previous balance:",
        ethers.formatUnits(currentBalance, decimals),
        symbol
      );
      console.log(
        "💰 New balance:",
        ethers.formatUnits(newBalance, decimals),
        symbol
      );
      console.log(
        "🎁 Tokens received:",
        ethers.formatUnits(received, decimals),
        symbol
      );

      // Show next claim time
      const nextClaimTime = await testERC20.getNextFaucetClaimTime(userAddress);
      console.log(
        `⏰ Next claim available at: ${new Date(Number(nextClaimTime) * 1000).toLocaleString()}`
      );
    } else {
      console.log(
        "❌ Cannot claim from faucet at this time. Please wait for the cooldown period to end."
      );
    }
  } catch (error) {
    console.error("❌ Error during faucet claim:");

    // Show detailed error information
    if (error instanceof Error) {
      console.error("Error type:", error.constructor.name);
      console.error("Message:", error.message);

      // Handle specific errors
      if (error.message.includes("Faucet: Cooldown period not elapsed")) {
        console.error(
          "💡 Hint: You need to wait 24 hours between faucet claims"
        );
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
