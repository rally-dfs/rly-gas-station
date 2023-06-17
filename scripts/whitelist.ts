import hre from "hardhat";

require("dotenv").config();

// script to whitelist methods on token contracts

async function main() {
  const paymaster = "0x61B9BdF9c10F77bD9eD033559Cec410427aeb8A2";
  const tokenAddress = "0x76b8D57e5ac6afAc5D415a054453d1DD2c3C0094";

  const Token = await hre.ethers.getContractFactory("posRLYTestERC20");

  const token = Token.attach(tokenAddress);

  const Paymaster = await hre.ethers.getContractFactory("RLYPaymaster");
  const pm = Paymaster.attach(paymaster);

  const methodIdPermit = token.interface.getSighash("executeMetaTransaction");
  const tx = await pm.setMethodWhitelist(
    token.address,
    methodIdPermit,
    true,
    true
  );

  console.log("method whitelestisted:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
