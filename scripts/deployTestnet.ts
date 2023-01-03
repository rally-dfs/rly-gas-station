import hre from "hardhat";

async function main() {
  //address of forwarder on mumbai network
  //https://docs.opengsn.org/networks/polygon/mumbai.html

  const forwarderAddress = "0x7A95fA73250dc53556d264522150A940d4C50238";

  const Faucet = await hre.ethers.getContractFactory("TokenFaucet");
  const faucet = await Faucet.deploy("Test RLY", "tRLY", 18, forwarderAddress);
  await faucet.deployed();
  console.log("token faucet deployed to", faucet.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
