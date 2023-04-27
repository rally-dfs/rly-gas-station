import { GsnTestEnvironment } from "@opengsn/cli";
import hre from "hardhat";
import { ethers } from "ethers";
const relayHubAbi = require("@opengsn/common/dist/interfaces/IRelayHub.json");

async function main() {
  const env = await GsnTestEnvironment.startGsn("localhost", 8090);
  const { contractsDeployment } = env;

  const accounts = await hre.ethers.getSigners();

  const deployer = accounts[0];

  const Paymaster = await hre.ethers.getContractFactory("RLYPaymaster");

  if (!contractsDeployment.relayHubAddress) {
    throw "relay hub not deployed";
  }

  const relayHub = new ethers.Contract(
    contractsDeployment.relayHubAddress,
    relayHubAbi,
    deployer
  );

  //deploy test rly token
  const Token = await hre.ethers.getContractFactory("posRLYTestERC20");

  const token = await Token.deploy();
  await token.deployed();

  await token.initialize(
    "Rally Polygon",
    "pRLY",
    18,
    deployer.address,
    ethers.utils.parseEther("15000000000")
  );

  // deploy faucet
  const Faucet = await hre.ethers.getContractFactory("TokenFaucet");

  const faucet = await Faucet.deploy(
    token.address,
    ethers.utils.parseEther("10"),
    contractsDeployment.forwarderAddress
  );
  await faucet.deployed();

  token.connect(deployer);

  await token.transfer(faucet.address, ethers.utils.parseEther("1000000"));

  const methodId = faucet.interface.getSighash("claim");
  const methodIdTransfer = token.interface.getSighash("transfer");
  const methodIdExecute = token.interface.getSighash("executeMetaTransaction");
  const paymaster = await Paymaster.deploy(faucet.address, methodId);

  await paymaster.setMethodWhitelist(
    token.address,
    methodIdExecute,
    true,
    true
  );
  await paymaster.setMethodWhitelist(
    token.address,
    methodIdTransfer,
    true,
    true
  );

  //
  await paymaster.setRelayHub(contractsDeployment.relayHubAddress);
  await paymaster.setTrustedForwarder(contractsDeployment.forwarderAddress);
  await relayHub.depositFor(paymaster.address, {
    value: ethers.utils.parseEther("1"),
  });

  const paymasterBalance = await relayHub.balanceOf(paymaster.address);

  console.log("local deployment successful!");

  console.log("single recipient paymaster deployed to", paymaster.address);
  console.log(
    "single recipient paymaster balance",
    paymasterBalance.toString()
  );

  console.log("paymaster deployed to", contractsDeployment.paymasterAddress);
  console.log("forwarder deployed to", contractsDeployment.forwarderAddress);
  console.log("token faucet deployed to", faucet.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
