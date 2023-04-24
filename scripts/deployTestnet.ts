import hre from "hardhat";
import { ethers } from "ethers";

require("dotenv").config();

async function main() {
  //address of forwarder on mumbai network
  //https://docs.opengsn.org/networks/polygon/mumbai.html

  const forwarderAddress = "0xB2b5841DBeF766d4b521221732F9B618fCf34A87";
  const relayHubAddress = "0x3232f21A6E08312654270c78A773f00dd61d60f5";

  const accounts = await hre.ethers.getSigners();

  const deployer = accounts[0];

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
    forwarderAddress
  );
  await faucet.deployed();

  token.connect(deployer);

  await token.transfer(faucet.address, ethers.utils.parseEther("1000000"));

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

  // fund paymaster
  await deployer.sendTransaction({
    to: pm.address,
    value: ethers.utils.parseEther(".05"),
  });

  console.log("polygon rly deployed to", token.address);
  console.log("token faucet deployed to", faucet.address);
  console.log("paymaster deployed to", pm.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
