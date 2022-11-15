import { GsnTestEnvironment } from "@opengsn/cli";
import { ethers } from "ethers";
const Web3HttpProvider = require("web3-providers-http");
import * as TokenFaucet from "../artifacts/contracts/TokenFaucet.sol/TokenFaucet.json";

async function main() {
  const env = await GsnTestEnvironment.startGsn("localhost", 8090);
  const { contractsDeployment } = env;

  const web3provider = new Web3HttpProvider("http://localhost:8545");

  const deploymentProvider = new ethers.providers.Web3Provider(web3provider);
  const factory = new ethers.ContractFactory(
    TokenFaucet.abi,
    TokenFaucet.bytecode,
    deploymentProvider.getSigner()
  );

  const faucet = await factory.deploy(
    "Cool Token",
    "CT",
    18,
    contractsDeployment.forwarderAddress
  );
  await faucet.deployed();

  console.log("local deployment successful!");
  console.log("paymaster deployed to", contractsDeployment.paymasterAddress);
  console.log("forwarder deployed to", contractsDeployment.forwarderAddress);
  console.log("token faucet deployed to", faucet.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
