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
  const PolygonToken = await hre.ethers.getContractFactory("posRLYTestERC20");
  const PermitToken = await hre.ethers.getContractFactory("ERC20PermitToken");

  const polygonToken = await PolygonToken.deploy();
  await polygonToken.deployed();

  const permitToken = await PermitToken.deploy("TakiTest", "TT");

  await polygonToken.initialize(
    "USD Coin",
    "USDC",
    18,
    deployer.address,
    ethers.utils.parseEther("15000000000")
  );

  // deploy faucet
  const PolygonFaucet = await hre.ethers.getContractFactory("TokenFaucet");

  const polygonFaucet = await PolygonFaucet.deploy(
    polygonToken.address,
    ethers.utils.parseEther("10"),
    contractsDeployment.forwarderAddress
  );
  await polygonFaucet.deployed();

  polygonToken.connect(deployer);

  await polygonToken.transfer(
    polygonFaucet.address,
    ethers.utils.parseEther("1000000")
  );

  const PermitFaucet = await hre.ethers.getContractFactory("TokenFaucet");

  const permitFaucet = await PermitFaucet.deploy(
    permitToken.address,
    ethers.utils.parseEther("10"),
    contractsDeployment.forwarderAddress
  );

  permitToken.connect(deployer);

  await permitToken.transfer(
    permitFaucet.address,
    ethers.utils.parseEther("1000000")
  );

  const methodIdClaim = polygonFaucet.interface.getSighash("claim");
  const methodIdTransfer = polygonToken.interface.getSighash("transfer");
  const methodIdExecute = polygonToken.interface.getSighash(
    "executeMetaTransaction"
  );

  const methodIdPermit = permitToken.interface.getSighash("permit");

  const paymaster = await Paymaster.deploy();

  await paymaster.setMethodWhitelist(
    polygonFaucet.address,
    methodIdClaim,
    true,
    true
  );

  await paymaster.setMethodWhitelist(
    permitFaucet.address,
    methodIdClaim,
    true,
    true
  );

  await paymaster.setMethodWhitelist(
    polygonToken.address,
    methodIdExecute,
    true,
    true
  );
  await paymaster.setMethodWhitelist(
    polygonToken.address,
    methodIdTransfer,
    true,
    true
  );

  await paymaster.setMethodWhitelist(
    permitToken.address,
    methodIdPermit,
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

  console.log("rly paymaster deployed to", paymaster.address);
  console.log("rly paymaster balance", paymasterBalance.toString());

  console.log("paymaster deployed to", contractsDeployment.paymasterAddress);
  console.log("forwarder deployed to", contractsDeployment.forwarderAddress);
  console.log("polygon token faucet deployed to", polygonFaucet.address);
  console.log("polygon token deployed to", polygonToken.address);
  console.log("permit token faucet deployed to", permitFaucet.address);
  console.log("permit token deployed to", permitToken.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
