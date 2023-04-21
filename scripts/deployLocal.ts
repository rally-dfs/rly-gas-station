import { GsnTestEnvironment } from "@opengsn/cli";
import { ethers } from "ethers";
const Web3HttpProvider = require("web3-providers-http");
import * as TokenFaucet from "../artifacts/contracts/TokenFaucet.sol/TokenFaucet.json";
import * as Paymaster from "../artifacts/contracts/RLYPaymaster.sol/RLYPaymaster.json";
const relayHubAbi = require("@opengsn/common/dist/interfaces/IRelayHub.json");

async function main() {
  const env = await GsnTestEnvironment.startGsn("localhost", 8090);
  const { contractsDeployment } = env;

  const web3provider = new Web3HttpProvider("http://127.0.0.1:8545/");

  const deploymentProvider = new ethers.providers.Web3Provider(web3provider);

  const fFactory = new ethers.ContractFactory(
    TokenFaucet.abi,
    TokenFaucet.bytecode,
    deploymentProvider.getSigner()
  );

  const pFactor = new ethers.ContractFactory(
    Paymaster.abi,
    Paymaster.bytecode,
    deploymentProvider.getSigner()
  );

  if (!contractsDeployment.relayHubAddress) {
    throw "relay hub not deployed";
  }

  const relayHub = new ethers.Contract(
    contractsDeployment.relayHubAddress,
    relayHubAbi,
    deploymentProvider.getSigner()
  );

  const faucet = await fFactory.deploy(
    "Cool Token",
    "CT",
    18,
    contractsDeployment.forwarderAddress
  );
  await faucet.deployed();

  const methodId = faucet.interface.getSighash("claim");

  const paymaster = await pFactor.deploy(faucet.address, methodId);

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
