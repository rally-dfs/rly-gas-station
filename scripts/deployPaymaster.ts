import hre from "hardhat";
import { ethers } from "ethers";

require("dotenv").config();

async function main() {
  const rlyTokenAddress = "0x76b8D57e5ac6afAc5D415a054453d1DD2c3C0094";
  const forwarderAddress = "0xB2b5841DBeF766d4b521221732F9B618fCf34A87";
  const relayHubAddress = "0xfCEE9036EDc85cD5c12A9De6b267c4672Eb4bA1B";
  const faucetAddress = "0x78a0794Bb3BB06238ed5f8D926419bD8fc9546d8";

  const Faucet = await hre.ethers.getContractFactory("TokenFaucet");
  const Token = await hre.ethers.getContractFactory("posRLYTestERC20");

  const faucet = Faucet.attach(faucetAddress);
  const token = Token.attach(rlyTokenAddress);

  // deploy paymaster

  const Paymaster = await hre.ethers.getContractFactory("RLYPaymaster");
  const methodId = faucet.interface.getSighash("claim");
  const methodIdTransfer = token.interface.getSighash("transfer");
  const methodIdExecute = token.interface.getSighash("executeMetaTransaction");
  const pm = await Paymaster.deploy(faucet.address, methodId);
  await pm.setMethodWhitelist(token.address, methodIdExecute, true, true);
  await pm.setMethodWhitelist(token.address, methodIdTransfer, true, true);

  await pm.setRelayHub(relayHubAddress!);
  await pm.setTrustedForwarder(forwarderAddress!);

  console.log("paymaster deployed to", pm.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
