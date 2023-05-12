import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

require("dotenv").config();

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    hardhat: {
      chainId: 1337,
    },
    polygon_mumbai: {
      url: `${process.env.RPC_URL_TESTNET}`,
      accounts: [`0x${process.env.PRIVATE_KEY_TESTNET}`],
    },
    polygon_mainnet: {
      url: `${process.env.RPC_URL_MAINNET}`,
      accounts: [`0x${process.env.PRIVATE_KEY_MAINNET}`],
    },
  },
};

export default config;
