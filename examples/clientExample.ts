import { GSNConfig } from "@opengsn/common";
import { RelayProvider } from "@opengsn/provider";
import { ethers } from "ethers";
const Web3HttpProvider = require("web3-providers-http");
import * as TokenFaucet from "../artifacts/contracts/TokenFaucet.sol/TokenFaucet.json";

// contract addresses for locally deployed paymaster and token faucet
const paymasterAddress = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
const tokenFaucetAddress = "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c";

const getGSNProvider = async (): Promise<RelayProvider> => {
  const web3provider = new Web3HttpProvider("http://localhost:8545");

  const config = {
    paymasterAddress,
    auditorsCount: 0,
    loggerConfiguration: {
      logLevel: "info",
    },
  } as GSNConfig;

  let gsnProvider = RelayProvider.newProvider({
    provider: web3provider,
    config,
  });
  await gsnProvider.init();

  return gsnProvider;
};

const clientExample = async () => {
  //get users wallet
  const account = ethers.Wallet.createRandom();

  // get gsn provider for submitting txs to relayer
  const gsnProvider = await getGSNProvider();

  //add user account to gsn provider
  gsnProvider.addAccount(account.privateKey);

  //wrap gsnProvider in ethersprovider for contract interactions
  //ignoring type error here for now, need to reconcile provider type differences
  //@ts-ignore
  const etherProvider = new ethers.providers.Web3Provider(gsnProvider);

  //get instance of faucet contract at deployed address with the gsn provider and account as signer
  const faucet = new ethers.Contract(
    tokenFaucetAddress,
    TokenFaucet.abi,
    etherProvider.getSigner(account.address)
  );

  //call claim method on contract, will be sent via GSN
  await faucet.claim();

  //get user token balance confirm that their balance has increased
  const bal = await faucet.balanceOf(account.address);

  console.log("user balance is post ", bal.toNumber());
  return;
};

clientExample().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
