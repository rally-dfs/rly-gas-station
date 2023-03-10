import hre from "hardhat";

async function main() {
  //address of forwarder on mumbai network
  //https://docs.opengsn.org/networks/polygon/mumbai.html

  const forwarderAddress = "0xB2b5841DBeF766d4b521221732F9B618fCf34A87";

  const Faucet = await hre.ethers.getContractFactory("TokenFaucet");
  const faucet = await Faucet.deploy("Test RLY", "tRLY", 18, forwarderAddress);
  await faucet.deployed();
  console.log("token faucet deployed to", faucet.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
