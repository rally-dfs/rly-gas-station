import hre from "hardhat";
import { ethers } from "ethers";

require("dotenv").config();

async function main() {
  const rlyTokenAddress = "0x76b8D57e5ac6afAc5D415a054453d1DD2c3C0094";
  const forwarderAddress = "0xB2b5841DBeF766d4b521221732F9B618fCf34A87";

  // deploy faucet
  const Faucet = await hre.ethers.getContractFactory("TokenFaucet");

  const faucet = await Faucet.deploy(
    rlyTokenAddress,
    ethers.utils.parseEther("10"),
    forwarderAddress
  );
  await faucet.deployed();

  console.log("faucet deployed to", faucet.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
