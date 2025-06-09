import fs from "fs";
import path from "path";

// New clean contract addresses
const NEW_ADDRESSES = {
  ZKCreditScoring: "0xF8b299F87EBb62E0b625eAF440B73Cc6b7717dbd",
  ZKCreditLending: "0xEb0fCBB68Ca7Ba175Dc1D3dABFD618e7a3F582F6",
  MockZKVerifier: "0x9DBb24B10502aD166c198Dbeb5AB54d2d13AfcFd",
  DynamicTargetRateModel: "0xf274De14171Ab928A5Ec19928cE35FaD91a42B64",
};

// Old addresses to replace
const OLD_ADDRESSES = {
  zkScoringOld1: "0x8B64968F69E669faCc86FA3484FD946f1bBE7c91",
  zkScoringOld2: "0xcb0A9835CDf63c84FE80Fcc59d91d7505871c98B",
  zkLendingOld1: "0xa8fcCF4D0e2f2c4451123fF2F9ddFc9be465Fa1d",
  zkLendingOld2: "0xFD296cCDB97C605bfdE514e9810eA05f421DEBc2",
};

async function updateAddressesInScripts() {
  console.log("🔄 Updating addresses in all scripts...");

  const scriptsDir = path.join(__dirname);
  const files = fs.readdirSync(scriptsDir);

  for (const file of files) {
    if (file.endsWith(".ts") && file !== "update-addresses.ts") {
      const filePath = path.join(scriptsDir, file);
      let content = fs.readFileSync(filePath, "utf8");
      let updated = false;

      // Replace old ZK Scoring addresses
      if (content.includes(OLD_ADDRESSES.zkScoringOld1)) {
        content = content.replace(new RegExp(OLD_ADDRESSES.zkScoringOld1, "g"), NEW_ADDRESSES.ZKCreditScoring);
        updated = true;
      }
      if (content.includes(OLD_ADDRESSES.zkScoringOld2)) {
        content = content.replace(new RegExp(OLD_ADDRESSES.zkScoringOld2, "g"), NEW_ADDRESSES.ZKCreditScoring);
        updated = true;
      }

      // Replace old ZK Lending addresses
      if (content.includes(OLD_ADDRESSES.zkLendingOld1)) {
        content = content.replace(new RegExp(OLD_ADDRESSES.zkLendingOld1, "g"), NEW_ADDRESSES.ZKCreditLending);
        updated = true;
      }
      if (content.includes(OLD_ADDRESSES.zkLendingOld2)) {
        content = content.replace(new RegExp(OLD_ADDRESSES.zkLendingOld2, "g"), NEW_ADDRESSES.ZKCreditLending);
        updated = true;
      }

      if (updated) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated addresses in ${file}`);
      }
    }
  }

  console.log("🎉 All scripts updated with new addresses!");
  console.log("New addresses:");
  console.log("ZKCreditScoring:", NEW_ADDRESSES.ZKCreditScoring);
  console.log("ZKCreditLending:", NEW_ADDRESSES.ZKCreditLending);
}

updateAddressesInScripts().catch(console.error);
