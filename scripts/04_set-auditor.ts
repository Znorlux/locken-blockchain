import { ethers } from "hardhat";
import { EncryptedERC__factory } from "../typechain-types";
import * as fs from "fs";
import * as path from "path";

// Read addresses from the latest deployment
const deploymentPath = path.join(__dirname, "../deployments/latest-fuji.json");
const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

const eERCAddress = deploymentData.contracts.encryptedERC;
const auditorPublicKeyAddress =
  "0x69812b265c4b0a44a70a3a800439d23e69fd52ce" as any; // cambiar por la direccion del auditor
const main = async () => {
  const [deployer] = await ethers.getSigners();

  const encryptedERC = await EncryptedERC__factory.connect(
    eERCAddress,
    deployer
  );
  let auditor: any;
  try {
    auditor = await encryptedERC.setAuditorPublicKey(auditorPublicKeyAddress);
    const receipt = await auditor.wait();
    console.log("Transaction confirmed in block:", receipt?.blockNumber);

    const auditorAddress = await encryptedERC.auditor();
    const auditorPublicKey = await encryptedERC.auditorPublicKey();

    console.log("✅ Auditor successfully configured");
    console.log("Auditor address:", auditorAddress);
    console.log("Auditor public key X:", auditorPublicKey.x.toString());
    console.log("Auditor public key Y:", auditorPublicKey.y.toString());
  } catch (error) {
    console.error("❌ Error setting auditor:", error);

    // Show more error details
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
